import {
    getSupportRequestByTelegramTokenRepo,
    linkSupportRequestTelegramRepo,
} from '../repositories/supportRepository.js'

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org'
const DEFAULT_ADMIN_URL = 'https://admin.pvp-tetris.online'
const TELEGRAM_LINKED_MESSAGE = 'Спасибо! Ваше обращение отправлено в поддержку. Мы ответим вам здесь.'

export const sendSupportRequestTelegramNotification = async ({
    request,
    contactName,
    contactEmail,
    message,
    preferredChannel,
}) => {
    const botToken = normalizeString(process.env.TELEGRAM_BOT_TOKEN)
    const adminChatIds = Array.from(parseAdminTelegramUserIds())

    if (!botToken || adminChatIds.length === 0) {
        return
    }

    const ticketId = request?.id
    const adminUrl = createAdminTicketUrl(ticketId)
    const text = createSupportMessage({
        ticketId,
        preferredChannel,
        contactName,
        contactEmail,
        message,
    })

    const results = await Promise.allSettled(
        adminChatIds.map((chatId) => sendTelegramBotMessage({
            botToken,
            chatId,
            text,
            parseMode: 'HTML',
            disableWebPagePreview: true,
            replyMarkup: {
                inline_keyboard: [
                    [
                        { text: 'Открыть в админке', url: adminUrl },
                        { text: 'Закрыть', callback_data: `support_close:${ticketId}` },
                    ],
                ],
            },
        }))
    )
    const failedResults = results.filter((result) => result.status === 'rejected')

    if (failedResults.length > 0) {
        const errorText = failedResults
            .map((result) => result.reason?.message || 'Unknown Telegram error')
            .join('; ')

        throw new Error(`Telegram notification failed for ${failedResults.length} admin chat(s): ${errorText}`)
    }
}

export const linkSupportRequestTelegramChat = async ({
    token,
    telegramUserId,
    telegramChatId,
    telegramUsername,
}) => {
    const normalizedToken = normalizeString(token)
    const normalizedUserId = normalizeTelegramId(telegramUserId)
    const normalizedChatId = normalizeTelegramId(telegramChatId)
    const normalizedUsername = normalizeString(telegramUsername).replace(/^@/, '')

    if (!normalizedToken) {
        return {
            linked: false,
            message: 'Telegram token is required',
        }
    }

    if (!normalizedUserId || !normalizedChatId) {
        return {
            linked: false,
            message: 'Telegram user or chat id is missing',
        }
    }

    const supportRequest = await getSupportRequestByTelegramTokenRepo(normalizedToken)

    if (!supportRequest) {
        return {
            linked: false,
            message: 'Telegram token was not found',
        }
    }

    if (supportRequest.preferred_channel !== 'telegram') {
        return {
            linked: false,
            message: 'Support request does not use Telegram',
        }
    }

    if (supportRequest.telegram_user_id && supportRequest.telegram_user_id !== normalizedUserId) {
        return {
            linked: false,
            message: 'Support request is already linked to another Telegram user',
        }
    }

    if (supportRequest.telegram_linked_at || supportRequest.telegram_user_id) {
        return {
            linked: false,
            message: 'Support request is already linked',
        }
    }

    const linkedRequest = await linkSupportRequestTelegramRepo({
        ticketId: supportRequest.id,
        telegramToken: normalizedToken,
        telegramUserId: normalizedUserId,
        telegramChatId: normalizedChatId,
        telegramUsername: normalizedUsername,
    })

    if (!linkedRequest) {
        return {
            linked: false,
            message: 'Support request could not be linked',
        }
    }

    await sendTelegramBotMessage({
        chatId: normalizedChatId,
        text: TELEGRAM_LINKED_MESSAGE,
    })

    return {
        linked: true,
        message: 'Telegram support request linked',
        ticketId: linkedRequest.id,
    }
}

export const parseAdminTelegramUserIds = () => {
    const raw = process.env.ADMIN_TELEGRAM_CHAT_ID || ''

    return new Set(
        raw
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
    )
}

export const sendTelegramBotMessage = async ({
    botToken = normalizeString(process.env.TELEGRAM_BOT_TOKEN),
    chatId,
    text,
    parseMode = null,
    disableWebPagePreview = false,
    replyMarkup = null,
}) => {
    if (!botToken) {
        throw new Error('Telegram bot token is not configured')
    }

    if (!chatId) {
        throw new Error('Telegram chat id is required')
    }

    const body = {
        chat_id: chatId,
        text,
    }

    if (parseMode) {
        body.parse_mode = parseMode
    }

    if (disableWebPagePreview) {
        body.disable_web_page_preview = true
    }

    if (replyMarkup) {
        body.reply_markup = replyMarkup
    }

    const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`chat ${chatId}: ${response.status} ${errorText}`)
    }
}

const createSupportMessage = ({
    ticketId,
    preferredChannel,
    contactName,
    contactEmail,
    message,
}) => {
    const channelLabel = preferredChannel === 'telegram' ? 'Telegram' : 'Email'
    const safeMessage = truncateText(message, 1200)

    return [
        `<b>Новое обращение #${escapeHtml(ticketId)}</b>`,
        `Канал: ${escapeHtml(channelLabel)}`,
        `Клиент: ${escapeHtml(contactName || 'Не указан')}`,
        contactEmail ? `Email: ${escapeHtml(contactEmail)}` : null,
        '',
        '<b>Сообщение:</b>',
        escapeHtml(safeMessage),
        '',
        '<i>Чтобы ответить, используйте Reply на это сообщение в Telegram.</i>',
    ].filter((line) => line !== null).join('\n')
}

const createAdminTicketUrl = (ticketId) => {
    const baseUrl = normalizeString(process.env.ADMIN_URL || process.env.ADMIN_PANEL_URL) || DEFAULT_ADMIN_URL
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')

    return `${normalizedBaseUrl}/support/requests?search=${encodeURIComponent(ticketId || '')}`
}

const truncateText = (value, maxLength) => {
    const text = normalizeString(value)

    if (text.length <= maxLength) {
        return text
    }

    return `${text.slice(0, maxLength - 1)}...`
}

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const normalizeString = (value) => {
    if (typeof value !== 'string') {
        return ''
    }

    return value.trim()
}

const normalizeTelegramId = (value) => {
    if (value === undefined || value === null) {
        return ''
    }

    return String(value).trim()
}
