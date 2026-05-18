import { asyncHandler } from '../utils/asyncHandler.js'
import { parseAdminTelegramUserIds } from '../services/telegramSupportService.js'
import { replyToSupportRequest } from '../services/supportReplyService.js'

const extractTicketIdFromText = (text = '') => {
    const match = text.match(/#(\d+)/)
    return match ? Number(match[1]) : null
}

export const handleTelegramWebhook = asyncHandler(async (req, res) => {
    const update = req.body
    const message = update?.message

    if (!message?.text || !message?.reply_to_message?.text) {
        return sendWebhookResponse(res, 'Telegram update ignored')
    }

    const adminTelegramId = String(message.from?.id || '')
    const allowedAdminIds = parseAdminTelegramUserIds()

    if (!allowedAdminIds.has(adminTelegramId)) {
        return sendWebhookResponse(res, 'Telegram admin is not allowed')
    }

    const ticketId = extractTicketIdFromText(message.reply_to_message.text)

    if (!ticketId) {
        return sendWebhookResponse(res, 'Support ticket id not found')
    }

    const replyText = String(message.text || '').trim()

    if (!replyText) {
        return sendWebhookResponse(res, 'Telegram reply is empty')
    }

    await replyToSupportRequest({
        ticketId,
        adminTelegramId,
        replyText,
    })

    return sendWebhookResponse(res, 'Telegram reply processed')
})

const sendWebhookResponse = (res, message) => res.json({
    success: true,
    message,
    data: null,
})
