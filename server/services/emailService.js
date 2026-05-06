import nodemailer from 'nodemailer'
import dns from 'node:dns'
import net from 'node:net'
import { promises as dnsPromises } from 'node:dns'

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
const emailFromName = process.env.EMAIL_FROM_NAME || 'PVP Tetris'
const emailFromAddress = extractEmailAddress(process.env.EMAIL_FROM || process.env.EMAIL_USER)
const emailFrom = process.env.EMAIL_FROM?.includes('<')
    ? process.env.EMAIL_FROM
    : `"${emailFromName}" <${emailFromAddress}>`

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
        html: getVerificationTemplate(code),
    })
}

export const sendTemporaryPasswordEmail = async (to, password) => {
    await sendEmail({
        to,
        subject: 'Новый пароль PVP Tetris',
        html: getTemporaryPasswordTemplate(password),
    })
}

const sendEmail = async ({ to, subject, html }) => {
    ensureEmailFrom()

    if (emailProvider === 'resend') {
        await sendViaResend({ to, subject, html })
        return
    }

    if (emailProvider === 'brevo') {
        await sendViaBrevo({ to, subject, html })
        return
    }

    await transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html,
    })
}

const sendViaResend = async ({ to, subject, html }) => {
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
        }),
    })

    if (!response.ok) {
        throw new Error(`Resend email API error ${response.status}: ${await readResponseBody(response)}`)
    }
}

const sendViaBrevo = async ({ to, subject, html }) => {
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
        }),
    })

    if (!response.ok) {
        throw new Error(`Brevo email API error ${response.status}: ${await readResponseBody(response)}`)
    }
}

const getVerificationTemplate = (code) => `
    <!DOCTYPE html>
    <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PVP Tetris — Подтверждение почты</title>
            <style>
                /* Базовые сбросы для email-клиентов */
                .ExternalClass, .ReadMsgBody {
                    width: 100%;
                    background-color: #f4f6fa;
                }
                body, table, td, p, a {
                    -webkit-text-size-adjust: 100%;
                    -ms-text-size-adjust: 100%;
                }
                table, td {
                    border-collapse: collapse;
                    mso-table-lspace: 0pt;
                    mso-table-rspace: 0pt;
                }
                img {
                    border: 0;
                    height: auto;
                    line-height: 100%;
                    outline: none;
                    text-decoration: none;
                    -ms-interpolation-mode: bicubic;
                }
                @media only screen and (max-width: 600px) {
                    .container {
                        width: 100% !important;
                    }
                    .inner-padding {
                        padding: 32px 24px !important;
                    }
                    .code-box {
                        font-size: 32px !important;
                        letter-spacing: 6px !important;
                        padding: 16px 20px !important;
                    }
                    .hero-title {
                        font-size: 24px !important;
                    }
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
            <!-- Основной контейнер письма -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="#f4f6fa" style="background-color: #f4f6fa;">
                <tr>
                    <td align="center" style="padding: 48px 24px;">
                        <!-- Карточка письма — элегантная, светлая, минималистичная -->
                        <table width="100%" max-width="520" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width: 520px; width: 100%; background-color: #ffffff; border-radius: 24px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);">
                            <!-- Основной контент -->
                            <tr>
                                <td class="inner-padding" style="padding: 40px 36px;">
                                    <!-- Логотип / Иконка (минималистичная) -->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td align="center" style="padding-bottom: 20px;">
                                                <div style="font-size: 48px; line-height: 1; opacity: 0.8;">
                                                    ◆
                                                </div>
                                                <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 28px; font-weight: 600; margin: 16px 0 4px; color: #1a2a3a; letter-spacing: -0.3px;">PVP Tetris</h1>
                                                <p style="color: #6c7a89; font-size: 13px; font-weight: 400; margin-top: 4px; letter-spacing: 0.3px;">ПОДТВЕРЖДЕНИЕ АККАУНТА</p>
                                            </td>
                                        </tr>
                                        <!-- Разделитель (минимальный) -->
                                        <tr>
                                            <td align="center" style="padding: 8px 0 24px;">
                                                <div style="height: 1px; width: 48px; background-color: #dce4ec; margin: 0 auto;"></div>
                                            </td>
                                        </tr>
                                        <!-- Приветствие -->
                                        <tr>
                                            <td align="center" style="padding-bottom: 20px;">
                                                <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 500; color: #2c3e4e; margin: 0; letter-spacing: -0.2px;">Здравствуйте!</h2>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td align="center" style="padding-bottom: 24px;">
                                                <p style="color: #5a6e7c; font-size: 15px; line-height: 1.5; margin: 0; text-align: center;">
                                                    Для завершения регистрации и доступа к платформе<br>
                                                    используйте код подтверждения ниже.
                                                </p>
                                            </td>
                                        </tr>
                                        <!-- Блок с кодом — элегантный, рамка, без кричащих цветов -->
                                        <tr>
                                            <td align="center" style="padding: 16px 0 20px;">
                                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px 24px;">
                                                    <span style="font-family: 'SF Mono', 'Menlo', 'Monaco', 'Cascadia Code', monospace; font-size: 42px; font-weight: 500; letter-spacing: 8px; color: #1a3a4a; display: inline-block;">${code}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        <!-- Действие кода и тайминг -->
                                        <tr>
                                            <td align="center" style="padding: 8px 0 20px;">
                                                <p style="color: #8a9aa8; font-size: 13px; background-color: #f8fafc; display: inline-block; padding: 6px 16px; border-radius: 30px; margin: 0;">
                                                    ⏱ Код действителен в течение 3 минут
                                                </p>
                                            </td>
                                        </tr>
                                        <!-- Текст безопасности -->
                                        <tr>
                                            <td align="center" style="padding-bottom: 20px;">
                                                <p style="color: #7a8e9c; font-size: 13px; line-height: 1.5; text-align: center; margin: 0;">
                                                    Если вы не запрашивали регистрацию, просто проигнорируйте это письмо.
                                                </p>
                                            </td>
                                        </tr>
                                        <!-- Тонкая линия -->
                                        <tr>
                                            <td align="center" style="padding: 16px 0 20px;">
                                                <div style="height: 1px; background: linear-gradient(90deg, transparent, #dce4ec, transparent);"></div>
                                            </td>
                                        </tr>
                                        <!-- Ссылки помощи (минималистичные) -->
                                        <tr>
                                            <td align="center">
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td align="center" style="padding: 4px 0;">
                                                            <span style="color: #8a9aa8; font-size: 12px;">
                                                                <a href="#" style="color: #4a6a7a; text-decoration: none; border-bottom: 1px solid #cbd8e4;">Помощь</a> &nbsp;•&nbsp;
                                                                <a href="#" style="color: #4a6a7a; text-decoration: none; border-bottom: 1px solid #cbd8e4;">Безопасность</a> &nbsp;•&nbsp;
                                                                <a href="#" style="color: #4a6a7a; text-decoration: none; border-bottom: 1px solid #cbd8e4;">Поддержка</a>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <!-- Футер с копирайтом -->
                                        <tr>
                                            <td align="center" style="padding-top: 32px;">
                                                <p style="color: #9aabba; font-size: 11px; margin: 0;">
                                                    © 2025 PVP Tetris. Все права защищены.
                                                </p>
                                                <p style="color: #aabbc8; font-size: 10px; margin-top: 8px;">
                                                    Это автоматическое сообщение, пожалуйста, не отвечайте на него.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
`

const getTemporaryPasswordTemplate = (password) => `
    <!DOCTYPE html>
    <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PVP Tetris — Новый пароль</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f6fa">
                <tr>
                    <td align="center" style="padding:48px 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
                            <tr>
                                <td align="center" style="padding:40px 36px;">
                                    <div style="font-size:48px;line-height:1;opacity:.8;">◆</div>
                                    <h1 style="font-size:28px;font-weight:600;margin:16px 0 4px;color:#1a2a3a;">PVP Tetris</h1>
                                    <p style="color:#6c7a89;font-size:13px;margin:4px 0 28px;letter-spacing:.3px;">ВОССТАНОВЛЕНИЕ ПАРОЛЯ</p>
                                    <p style="color:#5a6e7c;font-size:15px;line-height:1.5;margin:0 0 20px;">
                                        Мы создали новый временный пароль для вашего аккаунта.
                                        После входа смените его в профиле.
                                    </p>
                                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:20px 24px;margin:16px 0 22px;">
                                        <span style="font-family:Menlo,Monaco,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:2px;color:#1a3a4a;">${password}</span>
                                    </div>
                                    <p style="color:#7a8e9c;font-size:13px;line-height:1.5;margin:0;">
                                        Если вы не запрашивали восстановление, войдите в аккаунт и смените пароль.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
`
