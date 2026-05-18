import { asyncHandler } from '../utils/asyncHandler.js'
import {
    handleSupportClientTelegramMessage,
    linkSupportRequestTelegramChat,
    parseAdminTelegramUserIds,
} from '../services/telegramSupportService.js'
import { replyToSupportRequest } from '../services/supportReplyService.js'

const extractTicketIdFromText = (text = '') => {
    const match = text.match(/#(\d+)/)
    return match ? Number(match[1]) : null
}

const extractStartTokenFromText = (text = '') => {
    const match = text.trim().match(/^\/start(?:@\w+)?\s+(.+)$/i)
    return match ? match[1].trim().split(/\s+/)[0] : null
}

export const handleTelegramWebhook = asyncHandler(async (req, res) => {
    const update = req.body
    const message = update?.message

    if (!message?.text) {
        return sendWebhookResponse(res, 'Telegram update ignored')
    }

    const startToken = extractStartTokenFromText(message.text)

    if (startToken) {
        const linkResult = await linkSupportRequestTelegramChat({
            token: startToken,
            telegramUserId: message.from?.id,
            telegramChatId: message.chat?.id,
            telegramUsername: message.from?.username,
        })

        return sendWebhookResponse(res, linkResult.message, {
            linked: linkResult.linked,
            ticketId: linkResult.ticketId || null,
        })
    }

    const adminTelegramId = String(message.from?.id || '')
    const allowedAdminIds = parseAdminTelegramUserIds()

    if (!allowedAdminIds.has(adminTelegramId)) {
        const clientMessageResult = await handleSupportClientTelegramMessage({
            telegramUserId: message.from?.id,
            telegramChatId: message.chat?.id,
            telegramUsername: message.from?.username,
            telegramMessageId: message.message_id,
            messageText: message.text,
        })

        return sendWebhookResponse(res, clientMessageResult.message, {
            processed: clientMessageResult.processed,
            ticketId: clientMessageResult.ticketId || null,
        })
    }

    if (!message.reply_to_message?.text) {
        return sendWebhookResponse(res, 'Telegram update ignored')
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

const sendWebhookResponse = (res, message, data = null) => res.json({
    success: true,
    message,
    data,
})
