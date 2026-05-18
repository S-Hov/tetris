const TELEGRAM_API_BASE_URL = 'https://api.telegram.org'
const DEFAULT_ADMIN_URL = 'https://admin.pvp-tetris.online'

export const sendSupportRequestTelegramNotification = async ({
    request,
    contactName,
    contactEmail,
    message,
    preferredChannel,
}) => {
    const botToken = normalizeString(process.env.TELEGRAM_BOT_TOKEN)
    const chatId = normalizeString(process.env.ADMIN_TELEGRAM_CHAT_ID)

    if (!botToken || !chatId) {
        return
    }

    const ticketId = request?.id
    const adminUrl = createAdminTicketUrl(ticketId)

    const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: createSupportMessage({
                ticketId,
                preferredChannel,
                contactName,
                contactEmail,
                message,
            }),
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Открыть в админке', url: adminUrl },
                        { text: 'Закрыть', callback_data: `support_close:${ticketId}` },
                    ],
                ],
            },
        }),
    })

    if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Telegram notification failed: ${response.status} ${errorText}`)
    }
}

export const parseAdminTelegramUserIds = () => {
    const raw = process.env.ADMIN_TELEGRAM_USER_IDS || ''

    return new Set(
        raw
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
    )
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
        `<b>Сообщение:</b>`,
        escapeHtml(safeMessage),
        '',
        `<i>Чтобы ответить, нажми Reply/Ответить на это сообщение в Telegram.</i>`,
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

    return `${text.slice(0, maxLength - 1)}…`
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