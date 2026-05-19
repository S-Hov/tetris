import {
    appendSupportClientTelegramMessageRepo,
    getActiveSupportRequestByTelegramChatIdRepo,
    getRecentSupportRequestMessagesRepo,
    getSupportRequestByTelegramTokenRepo,
    getSupportRequestMessagesRepo,
    linkSupportRequestTelegramRepo,
} from '../repositories/supportRepository.js'
import { emitSupportRequestMessage, emitSupportRequestUpdated } from './supportRealtimeService.js'

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org'
const DEFAULT_ADMIN_URL = 'https://admin.pvp-tetris.online'
const TELEGRAM_LINKED_MESSAGE = 'Спасибо! Ваше обращение отправлено в поддержку. Мы ответим вам здесь.'
const NO_ACTIVE_TICKET_MESSAGE = 'У вас нет активного обращения. Пожалуйста, создайте новое обращение на сайте.'
const SUPPORT_CATEGORY_LABELS = {
    bug: 'Баг',
    idea: 'Предложение',
    mode: 'Режимы',
    balance: 'Баланс',
    other: 'Другое',
}

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
    const replyMarkup = createSupportNotificationReplyMarkup({
        request: {
            ...request,
            contact_email: contactEmail || request?.contact_email,
        },
        adminUrl,
        includeCloseButton: true,
    })
    const text = createSupportMessage({
        request,
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
            replyMarkup,
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

    await sendPendingAdminRepliesToLinkedTelegramChat({
        requestId: linkedRequest.id,
        chatId: normalizedChatId,
    })

    emitSupportRequestUpdated({
        requestId: linkedRequest.id,
        request: linkedRequest,
    })

    return {
        linked: true,
        message: 'Telegram support request linked',
        ticketId: linkedRequest.id,
    }
}

export const handleSupportClientTelegramMessage = async ({
    telegramUserId,
    telegramChatId,
    telegramUsername,
    telegramMessageId,
    messageText,
}) => {
    const normalizedChatId = normalizeTelegramId(telegramChatId)
    const normalizedUserId = normalizeTelegramId(telegramUserId)
    const normalizedText = normalizeString(messageText)
    const normalizedUsername = normalizeString(telegramUsername).replace(/^@/, '')

    if (!normalizedChatId || !normalizedText) {
        return {
            processed: false,
            message: 'Telegram client message ignored',
        }
    }

    const supportRequest = await getActiveSupportRequestByTelegramChatIdRepo(normalizedChatId)

    if (!supportRequest) {
        await sendTelegramBotMessage({
            chatId: normalizedChatId,
            text: NO_ACTIVE_TICKET_MESSAGE,
        })

        return {
            processed: false,
            message: 'Active Telegram support request was not found',
        }
    }

    const senderLabel = createClientLabel({
        contactName: supportRequest.contact_name,
        telegramUsername: normalizedUsername || supportRequest.telegram_username,
        telegramUserId: normalizedUserId,
    })

    const { message, request: updatedRequest } = await appendSupportClientTelegramMessageRepo({
        supportRequestId: supportRequest.id,
        senderLabel,
        messageText: normalizedText,
        telegramUserId: normalizedUserId,
        telegramChatId: normalizedChatId,
        telegramMessageId: normalizeTelegramId(telegramMessageId),
    })

    emitSupportRequestMessage({
        requestId: supportRequest.id,
        message,
        request: updatedRequest || supportRequest,
    })
    emitSupportRequestUpdated({
        requestId: supportRequest.id,
        request: updatedRequest || supportRequest,
    })

    const recentMessages = await getRecentSupportRequestMessagesRepo(supportRequest.id, 5)

    await sendSupportClientMessageTelegramNotification({
        request: updatedRequest || supportRequest,
        senderLabel,
        messageText: normalizedText,
        recentMessages,
    })

    return {
        processed: true,
        message: 'Telegram client message processed',
        ticketId: supportRequest.id,
    }
}

const sendPendingAdminRepliesToLinkedTelegramChat = async ({
    requestId,
    chatId,
}) => {
    const messages = await getSupportRequestMessagesRepo(requestId)
    const pendingMessages = messages.filter((message) => ['admin', 'system'].includes(message.sender_type))

    for (const message of pendingMessages) {
        try {
            await sendTelegramBotMessage({
                chatId,
                text: message.message_text,
            })
        } catch (error) {
            console.error('Pending Telegram admin reply failed', {
                requestId,
                messageId: message.id,
                error: error.message,
            })
        }
    }
}

export const sendSupportClientMessageTelegramNotification = async ({
    request,
    senderLabel,
    messageText,
    recentMessages = [],
}) => {
    const botToken = normalizeString(process.env.TELEGRAM_BOT_TOKEN)
    const adminChatIds = Array.from(parseAdminTelegramUserIds())

    if (!botToken || adminChatIds.length === 0) {
        return
    }

    const adminUrl = createAdminTicketUrl(request.id)
    const replyMarkup = createSupportNotificationReplyMarkup({
        request,
        adminUrl,
        includeCloseButton: false,
    })
    const text = createClientMessageNotification({
        request,
        senderLabel,
        messageText,
        recentMessages,
    })

    const results = await Promise.allSettled(
        adminChatIds.map((chatId) => sendTelegramBotMessage({
            botToken,
            chatId,
            text,
            parseMode: 'HTML',
            disableWebPagePreview: true,
            replyMarkup,
        }))
    )
    const failedResults = results.filter((result) => result.status === 'rejected')

    if (failedResults.length > 0) {
        const errorText = failedResults
            .map((result) => result.reason?.message || 'Unknown Telegram error')
            .join('; ')

        throw new Error(`Telegram client notification failed for ${failedResults.length} admin chat(s): ${errorText}`)
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

export const answerTelegramCallbackQuery = async ({
    botToken = normalizeString(process.env.TELEGRAM_BOT_TOKEN),
    callbackQueryId,
    text = '',
    showAlert = false,
}) => {
    if (!botToken) {
        throw new Error('Telegram bot token is not configured')
    }

    if (!callbackQueryId) {
        throw new Error('Telegram callback query id is required')
    }

    const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text,
            show_alert: Boolean(showAlert),
        }),
    })

    if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`callback ${callbackQueryId}: ${response.status} ${errorText}`)
    }
}

const createSupportMessage = ({
    request,
    preferredChannel,
    contactName,
    contactEmail,
    message,
}) => {
    const ticketId = request?.id
    const channelLabel = preferredChannel === 'telegram' ? 'Telegram' : 'Email'
    const safeMessage = truncateText(message, 1200)
    const userLine = createAdminUserLine(request?.user_id)
    const title = request?.title ? `Тема: ${escapeHtml(request.title)}` : null

    return [
        `🆕 <b>Новое обращение #${escapeHtml(ticketId)}</b>`,
        `Категория: ${escapeHtml(getSupportCategoryLabel(request?.category))}`,
        title,
        `Канал: ${escapeHtml(channelLabel)}`,
        `Клиент: ${escapeHtml(contactName || 'Не указан')}`,
        userLine,
        contactEmail ? `Email: ${escapeHtml(contactEmail)}` : null,
        '',
        '<b>Сообщение:</b>',
        escapeHtml(safeMessage),
        '',
        '<i>Чтобы ответить, используйте Reply на это сообщение в Telegram.</i>',
    ].filter((line) => line !== null).join('\n')
}

const createClientMessageNotification = ({
    request,
    senderLabel,
    messageText,
    recentMessages,
}) => {
    const title = request.title ? `Тема: ${escapeHtml(request.title)}` : null
    const userLine = createAdminUserLine(request.user_id)
    const contextLines = recentMessages.length > 0
        ? recentMessages.map((message) => {
            const isAdmin = message.sender_type === 'admin'
            const icon = isAdmin ? '🛠' : '👤'
            const author = isAdmin ? 'Поддержка' : (message.sender_label || 'Клиент')
            return `${icon} <b>${escapeHtml(author)}:</b> ${escapeHtml(truncateText(message.message_text, 280))}`
        })
        : ['Пока нет сохраненной истории сообщений.']

    return [
        `💬 <b>Новое сообщение по обращению #${escapeHtml(request.id)}</b>`,
        `Категория: ${escapeHtml(getSupportCategoryLabel(request.category))}`,
        `Клиент: ${escapeHtml(senderLabel || request.contact_name || 'Не указан')}`,
        userLine,
        request.contact_email ? `Email: ${escapeHtml(request.contact_email)}` : null,
        request.telegram_username ? `Telegram: @${escapeHtml(request.telegram_username)}` : null,
        title,
        '',
        '<b>Новое сообщение:</b>',
        escapeHtml(truncateText(messageText, 1000)),
        '',
        '<b>Последние сообщения:</b>',
        ...contextLines,
        '',
        '<i>Ответьте Reply на это сообщение, в тексте есть номер обращения #ID.</i>',
    ].filter((line) => line !== null).join('\n')
}

const createClientLabel = ({
    contactName,
    telegramUsername,
    telegramUserId,
}) => {
    const parts = []

    if (contactName) {
        parts.push(contactName)
    }

    if (telegramUsername) {
        parts.push(`@${telegramUsername}`)
    }

    if (telegramUserId) {
        parts.push(`tg:${telegramUserId}`)
    }

    return parts.join(' · ') || 'Клиент Telegram'
}

const createSupportNotificationReplyMarkup = ({
    request,
    adminUrl,
    includeCloseButton,
}) => {
    const keyboard = [
        [
            { text: 'Открыть в админке', url: adminUrl },
        ],
    ]

    if (includeCloseButton) {
        keyboard[0].push({ text: 'Закрыть', callback_data: `support_close:${request?.id}` })
    }

    const gmailUrl = createGmailComposeUrl(request)

    if (gmailUrl) {
        keyboard.push([
            { text: 'Ответить через Gmail', url: gmailUrl },
        ])
    }

    return {
        inline_keyboard: keyboard,
    }
}

const createGmailComposeUrl = (request) => {
    if (request?.preferred_channel !== 'email' || !request?.contact_email) {
        return null
    }

    const params = new URLSearchParams({
        view: 'cm',
        fs: '1',
        to: request.contact_email,
        su: `Re: Обращение #${request.id}`,
        body: [
            'Здравствуйте!',
            '',
            '',
            '',
            '',
            '---',
            `Обращение #${request.id}`,
        ].join('\n'),
    })

    return `https://mail.google.com/mail/?${params.toString()}`
}

const createAdminTicketUrl = (ticketId) => {
    const baseUrl = normalizeString(process.env.ADMIN_URL || process.env.ADMIN_PANEL_URL) || DEFAULT_ADMIN_URL
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')

    return `${normalizedBaseUrl}/support/requests/${encodeURIComponent(ticketId || '')}`
}

const createAdminUserLine = (userId) => {
    if (!userId) {
        return null
    }

    return `Пользователь: <a href="${createAdminUserUrl(userId)}">#${escapeHtml(userId)}</a>`
}

const createAdminUserUrl = (userId) => {
    const baseUrl = normalizeString(process.env.ADMIN_URL || process.env.ADMIN_PANEL_URL) || DEFAULT_ADMIN_URL
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')

    return `${normalizedBaseUrl}/users/${encodeURIComponent(userId)}`
}

const getSupportCategoryLabel = (category) => SUPPORT_CATEGORY_LABELS[category] || category || 'Другое'

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
