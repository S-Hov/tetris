import crypto from 'crypto'
import { badRequest, forbidden, notFound } from '../helpers/error.helper.js'
import {
    createDonationEventRepo,
    createDonationRepo,
    createSupportRequestMessageRepo,
    createSupportRequestRepo,
    getActiveSupportBlockRepo,
    getActiveDonationWalletsRepo,
    getDonationWalletByIdRepo,
    getSupportRequestMessagesRepo,
    getUserSupportRequestByIdRepo,
    getUserSupportRequestsRepo,
    getSupportUserContextRepo,
} from '../repositories/supportRepository.js'
import { sendSupportRequestReceivedEmail } from './emailService.js'
import { sendSupportRequestTelegramNotification } from './telegramSupportService.js'

const SUPPORT_CATEGORIES = new Set(['bug', 'idea', 'mode', 'balance', 'other'])
const SUPPORT_CHANNELS = new Set(['email', 'telegram'])
const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const createSupportRequestService = async ({ userId, body, headers }) => {
    const user = await getSupportUserContextRepo(userId)
    const supportBlock = await getActiveSupportBlockRepo(userId)

    if (supportBlock || ['blocked', 'disabled'].includes(user?.status)) {
        throw forbidden('Support requests are disabled for this account')
    }

    const category = normalizeString(body.category) || 'other'
    const message = normalizeString(body.message)
    const preferredChannel = normalizeString(body.preferredChannel || body.preferred_channel).toLowerCase()

    if (!SUPPORT_CATEGORIES.has(category)) {
        throw badRequest('Unsupported support category')
    }

    if (!SUPPORT_CHANNELS.has(preferredChannel)) {
        throw badRequest('Preferred channel must be email or telegram')
    }

    if (!message || message.length < 10) {
        throw badRequest('Message must contain at least 10 characters')
    }

    const contactName = normalizeString(body.name || body.contactName) || normalizeString(user?.username)
    const contactEmail = normalizeEmail(body.email || body.contactEmail) || normalizeEmail(user?.email)

    if (!contactName) {
        throw badRequest('Name is required')
    }

    if (preferredChannel === 'email' && !contactEmail) {
        throw badRequest('Valid email is required')
    }

    const telegramToken = preferredChannel === 'telegram' ? createTelegramToken() : null
    const telegramUrl = telegramToken ? createTelegramUrl(telegramToken) : null

    const request = await createSupportRequestRepo({
        userId,
        category,
        contactName,
        contactEmail,
        preferredChannel,
        telegramToken,
        telegramUrl,
        title: normalizeString(body.title),
        message,
        pageUrl: normalizeString(body.pageUrl),
        attachmentUrl: normalizeString(body.attachmentUrl),
        clientContext: {
            ...(body.clientContext && typeof body.clientContext === 'object' ? body.clientContext : {}),
            userAgent: headers['user-agent'] || null,
        },
    })

    await createSupportRequestMessageRepo({
        supportRequestId: request.id,
        senderType: 'client',
        senderLabel: contactName,
        channel: preferredChannel,
        messageText: message,
    })

    if (contactEmail) {
        sendSupportRequestReceivedEmail({
            to: contactEmail,
            ticketId: request.id,
            contactName,
            preferredChannel,
            title: request.title,
        }).catch((error) => {
            console.error('Support received email error:', error)
        })
    }

    sendSupportRequestTelegramNotification({
        request,
        contactName,
        contactEmail,
        message,
        preferredChannel,
        telegramUrl,
    }).catch((error) => {
        console.error('Support Telegram notification error:', error)
    })

    return {
        request,
        ticketId: request.id,
        telegramUrl,
    }
}

export const getDonationWalletsService = async () => {
    const wallets = await getActiveDonationWalletsRepo()

    return {
        wallets: wallets.map((wallet) => ({
            id: wallet.id,
            currencyCode: wallet.currency_code,
            networkKey: wallet.network_key,
            networkName: wallet.network_name,
            address: wallet.address,
            addressLabel: wallet.address_label,
            memoTag: wallet.memo_tag,
            currencyName: wallet.currency_name || wallet.currency_code,
            currencyIconUrl: wallet.currency_icon_url,
            currencyIconSymbol: wallet.currency_icon_symbol,
            networkIconUrl: wallet.network_icon_url,
            networkIconSymbol: wallet.network_icon_symbol,
            memoRequired: Boolean(wallet.memo_required),
            metadata: wallet.metadata || {},
        })),
    }
}

export const getUserSupportRequestsService = async (userId) => {
    const rows = await getUserSupportRequestsRepo(userId)

    return {
        requests: rows.map(formatSupportRequestListItem),
    }
}

export const getUserSupportRequestDetailsService = async ({ userId, ticketId }) => {
    const request = await getUserSupportRequestByIdRepo({ userId, ticketId })

    if (!request) {
        throw notFound('Обращение не найдено')
    }

    return {
        request: formatSupportRequestDetails(request),
    }
}

export const getUserSupportRequestMessagesService = async ({ userId, ticketId }) => {
    const request = await getUserSupportRequestByIdRepo({ userId, ticketId })

    if (!request) {
        throw notFound('Обращение не найдено')
    }

    if (request.preferred_channel !== 'telegram') {
        return {
            messages: [
                formatSupportMessage({
                    id: `initial-${request.id}`,
                    sender_type: 'client',
                    sender_label: request.contact_name,
                    channel: request.preferred_channel,
                    message_text: request.message,
                    created_at: request.created_at,
                }),
            ],
            historySupported: false,
        }
    }

    const messages = await getSupportRequestMessagesRepo(request.id)

    return {
        messages: messages.map(formatSupportMessage),
        historySupported: true,
    }
}

export const createDonationService = async ({ userId, body }) => {
    const walletId = Number.parseInt(body.walletId, 10)

    if (!Number.isInteger(walletId) || walletId <= 0) {
        throw badRequest('Donation wallet is required')
    }

    const wallet = await getDonationWalletByIdRepo(walletId)

    if (!wallet) {
        throw notFound('Donation wallet not found')
    }

    const expectedAmount = normalizeAmount(body.expectedAmount, { required: true })
    const isAnonymous = body.isAnonymous === true || body.isAnonymous === 'true'
    const donorName = normalizeString(body.donorName)

    if ((isAnonymous || !userId) && donorName.length < 2) {
        throw badRequest('Donation nickname is required')
    }

    const donation = await createDonationRepo({
        userId: isAnonymous ? null : userId,
        wallet,
        donorName,
        donorContact: null,
        expectedAmount,
        note: normalizeString(body.note),
    })

    await createDonationEventRepo({
        donationId: donation.id,
        eventType: 'created',
        statusTo: donation.status,
        payload: {
            walletId: wallet.id,
            currencyCode: wallet.currency_code,
            networkKey: wallet.network_key,
        },
    })

    return {
        donation: {
            id: donation.id,
            status: donation.status,
            currencyCode: donation.currency_code,
            networkKey: donation.network_key,
            expectedAmount: donation.expected_amount,
            expiresAt: donation.expires_at,
            createdAt: donation.created_at,
        },
        wallet: {
            id: wallet.id,
            currencyCode: wallet.currency_code,
            networkKey: wallet.network_key,
            networkName: wallet.network_name,
            address: wallet.address,
            addressLabel: wallet.address_label,
            memoTag: wallet.memo_tag,
        },
    }
}

const normalizeString = (value) => {
    if (typeof value !== 'string') {
        return ''
    }

    return value.trim()
}

const formatSupportRequestListItem = (request) => ({
    id: request.id,
    category: request.category,
    status: request.status,
    preferredChannel: request.preferred_channel,
    title: request.title,
    message: request.message,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
})

const formatSupportRequestDetails = (request) => ({
    id: request.id,
    category: request.category,
    status: request.status,
    priority: request.priority,
    preferredChannel: request.preferred_channel,
    contactName: request.contact_name,
    contactEmail: request.contact_email,
    telegramUrl: request.telegram_url,
    title: request.title,
    message: request.message,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
    resolvedAt: request.resolved_at,
})

const formatSupportMessage = (message) => ({
    id: message.id,
    senderType: message.sender_type,
    senderLabel: message.sender_label,
    channel: message.channel,
    text: message.message_text,
    createdAt: message.created_at,
})

const normalizeEmail = (value) => {
    const email = normalizeString(value).toLowerCase()

    return EMAIL_REGEXP.test(email) ? email : ''
}

const createTelegramToken = () => crypto.randomBytes(24).toString('base64url')

const createTelegramUrl = (token) => {
    const configuredUrl = normalizeString(process.env.TELEGRAM_BOT_URL)

    if (configuredUrl) {
        const separator = configuredUrl.includes('?') ? '&' : '?'

        return `${configuredUrl}${separator}start=${encodeURIComponent(token)}`
    }

    const botName = normalizeString(process.env.TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_NAME) || 'YOUR_BOT_NAME'

    return `https://t.me/${botName.replace(/^@/, '')}?start=${encodeURIComponent(token)}`
}

const normalizeAmount = (value, { required = false } = {}) => {
    if (value === undefined || value === null || value === '') {
        if (required) {
            throw badRequest('Donation amount is required')
        }

        return null
    }

    const normalized = String(value).replace(',', '.').trim()
    const amount = Number(normalized)

    if (!Number.isFinite(amount) || amount <= 0) {
        throw badRequest('Donation amount must be greater than zero')
    }

    return normalized
}
