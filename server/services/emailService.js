import nodemailer from 'nodemailer'
import dns from 'node:dns'
import net from 'node:net'
import { promises as dnsPromises } from 'node:dns'
import {
    createRegistrationVerificationEmailTemplate,
    createSupportRequestReceivedEmailTemplate,
    createSupportReplyEmailTemplate,
    createTemporaryPasswordEmailTemplate,
    createVerificationEmailTemplate,
} from './emailTemplateService.js'

dns.setDefaultResultOrder('ipv4first')

const smtpHost = process.env.EMAIL_HOST || 'smtp.gmail.com'
const smtpPort = Number(process.env.EMAIL_PORT || 587)
const smtpSecure = process.env.EMAIL_SECURE
    ? process.env.EMAIL_SECURE === 'true'
    : smtpPort === 465
const smtpRequireTls = process.env.EMAIL_REQUIRE_TLS
    ? process.env.EMAIL_REQUIRE_TLS === 'true'
    : !smtpSecure
const emailProvider = (process.env.EMAIL_PROVIDER || '').toLowerCase()
    || (process.env.RESEND_API_KEY ? 'resend' : process.env.BREVO_API_KEY ? 'brevo' : 'smtp')
const emailFromName = process.env.EMAIL_FROM_NAME || 'PVP Blocks'
const emailFromAddress = extractEmailAddress(process.env.EMAIL_FROM || process.env.EMAIL_USER)
const emailFrom = process.env.EMAIL_FROM?.includes('<')
    ? process.env.EMAIL_FROM
    : `"${emailFromName}" <${emailFromAddress}>`
const defaultReplyTo = extractEmailAddress(process.env.SUPPORT_REPLY_TO || emailFromAddress)

function extractEmailAddress(value) {
    const email = String(value || '').trim()
    const match = email.match(/<([^>]+)>/)

    return (match ? match[1] : email).trim()
}

const ensureEmailFrom = () => {
    if (!emailFromAddress) {
        throw new Error('Email sender is not configured. Set EMAIL_FROM or EMAIL_USER.')
    }
}

const readResponseBody = async (response) => {
    const text = await response.text()

    return text.slice(0, 500)
}

const resolveIpv4Host = async (host) => {
    if (net.isIPv4(host)) {
        return host
    }

    const addresses = await dnsPromises.resolve4(host)

    if (!addresses.length) {
        throw new Error(`No IPv4 addresses found for SMTP host ${host}`)
    }

    return addresses[0]
}

const getIpv4Socket = async (options, callback) => {
    try {
        const address = await resolveIpv4Host(options.host)
        let settled = false
        const socket = net.connect({
            host: address,
            port: options.port,
            family: 4,
            localAddress: options.localAddress,
        })

        const done = (error, socketOptions) => {
            if (settled) {
                return
            }

            settled = true
            socket.removeAllListeners('timeout')
            callback(error, socketOptions)
        }

        socket.setTimeout(options.connectionTimeout || 30000, () => {
            socket.destroy()
            done(new Error(`SMTP connection timeout to ${options.host}:${options.port}`))
        })
        socket.once('connect', () => {
            done(null, {
                connection: socket,
                host: address,
                servername: options.host,
            })
        })
        socket.once('error', done)
    } catch (error) {
        callback(error)
    }
}

export const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: smtpRequireTls,
    family: 4,
    getSocket: getIpv4Socket,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
})

export const sendVerificationEmail = async (to, code) => {
    await sendEmail({
        to,
        subject: 'Подтверждение почты',
        html: createVerificationEmailTemplate(code),
    })
}

export const sendRegistrationVerificationEmail = async (to, code) => {
    await sendEmail({
        to,
        subject: 'Регистрация в PVP Blocks',
        html: createRegistrationVerificationEmailTemplate(code),
    })
}

export const sendTemporaryPasswordEmail = async (to, password) => {
    await sendEmail({
        to,
        subject: 'Новый пароль PVP Blocks',
        html: createTemporaryPasswordEmailTemplate(password),
    })
}

export const sendSupportRequestReceivedEmail = async ({
    to,
    ticketId,
    contactName,
    preferredChannel,
    title,
}) => {
    await sendEmail({
        to,
        subject: `Обращение #${ticketId} получено`,
        html: createSupportRequestReceivedEmailTemplate({
            ticketId,
            contactName,
            preferredChannel,
            title,
        }),
        replyTo: defaultReplyTo,
    })
}

export const sendSupportReplyEmail = async ({
    to,
    ticketId,
    contactName,
    replyText,
}) => {
    await sendEmail({
        to,
        subject: `Ответ поддержки по обращению #${ticketId}`,
        html: createSupportReplyEmailTemplate({
            ticketId,
            contactName,
            replyText,
        }),
        replyTo: defaultReplyTo,
    })
}

export const sendEmail = async ({
    to,
    subject,
    html,
    replyTo = defaultReplyTo,
}) => {
    ensureEmailFrom()

    if (emailProvider === 'resend') {
        await sendViaResend({ to, subject, html, replyTo })
        return
    }

    if (emailProvider === 'brevo') {
        await sendViaBrevo({ to, subject, html, replyTo })
        return
    }

    await transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html,
        replyTo,
    })
}

const sendViaResend = async ({ to, subject, html, replyTo }) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend.')
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: emailFrom,
            to: [to],
            subject,
            html,
            reply_to: replyTo,
        }),
    })

    if (!response.ok) {
        throw new Error(`Resend email API error ${response.status}: ${await readResponseBody(response)}`)
    }
}

const sendViaBrevo = async ({ to, subject, html, replyTo }) => {
    if (!process.env.BREVO_API_KEY) {
        throw new Error('BREVO_API_KEY is required when EMAIL_PROVIDER=brevo.')
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            sender: {
                name: emailFromName,
                email: emailFromAddress,
            },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            replyTo: replyTo ? { email: replyTo } : undefined,
        }),
    })

    if (!response.ok) {
        throw new Error(`Brevo email API error ${response.status}: ${await readResponseBody(response)}`)
    }
}
