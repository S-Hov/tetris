import { asyncHandler } from '../utils/asyncHandler.js'
import {
    handleSupportClientTelegramMessage,
    linkSupportRequestTelegramChat,
    parseAdminTelegramUserIds,
    sendTelegramBotMessage,
} from '../services/telegramSupportService.js'
import { replyToSupportRequest } from '../services/supportReplyService.js'

const extractTicketIdFromText = (text = '') => {
    const match = text.match(/#(\d+)/)
    return match ? Number(match[1]) : null
}

const getTelegramMessageText = (message = {}) => {
    const value = message.text || message.caption || ''
    return typeof value === 'string' ? value : ''
}

const isAdminTelegramMessage = (message = {}, allowedAdminIds = new Set()) => {
    const fromId = String(message.from?.id || '')
    const chatId = String(message.chat?.id || '')

    return allowedAdminIds.has(fromId) || allowedAdminIds.has(chatId)
}

const extractStartTokenFromText = (text = '') => {
    const match = text.trim().match(/^\/start(?:@\w+)?\s+(.+)$/i)
    return match ? match[1].trim().split(/\s+/)[0] : null
}

export const handleTelegramWebhook = asyncHandler(async (req, res) => {
    const update = req.body
    const message = update?.message
    const messageText = getTelegramMessageText(message)

    if (!message || !messageText) {
        return sendWebhookResponse(res, 'Telegram update ignored')
    }

    const startToken = extractStartTokenFromText(messageText)

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
    const replyContextText = getTelegramMessageText(message.reply_to_message)
    const replyTicketId = replyContextText ? extractTicketIdFromText(replyContextText) : null

    if (!replyTicketId && !isAdminTelegramMessage(message, allowedAdminIds)) {
        const clientMessageResult = await handleSupportClientTelegramMessage({
            telegramUserId: message.from?.id,
            telegramChatId: message.chat?.id,
            telegramUsername: message.from?.username,
            telegramMessageId: message.message_id,
            messageText,
        })

        return sendWebhookResponse(res, clientMessageResult.message, {
            processed: clientMessageResult.processed,
            ticketId: clientMessageResult.ticketId || null,
        })
    }

    if (!replyTicketId) {
        return sendWebhookResponse(res, 'Telegram update ignored')
    }

    const replyText = messageText.trim()

    if (!replyText) {
        return sendWebhookResponse(res, 'Telegram reply is empty')
    }

    try {
        const replyResult = await replyToSupportRequest({
            ticketId: replyTicketId,
            adminTelegramId,
            replyText,
        })

        await sendTelegramAdminStatusMessage({
            chatId: message.chat?.id,
            text: replyResult.queued
                ? `Ответ по обращению #${replyTicketId} сохранен. Пользователь получит его, когда откроет Telegram-бота.`
                : `Ответ по обращению #${replyTicketId} отправлен пользователю.`,
        })
    } catch (error) {
        console.error('Telegram support reply failed', {
            ticketId: replyTicketId,
            adminTelegramId,
            chatId: message.chat?.id,
            messageId: message.message_id,
            error: error.message,
        })

        await sendTelegramAdminStatusMessage({
            chatId: message.chat?.id,
            text: `Не удалось отправить ответ по обращению #${replyTicketId}: ${error.message}`,
        })

        return sendWebhookResponse(res, 'Telegram reply failed', {
            processed: false,
            ticketId: replyTicketId,
            error: error.message,
        })
    }

    return sendWebhookResponse(res, 'Telegram reply processed')
})

const sendTelegramAdminStatusMessage = async ({ chatId, text }) => {
    try {
        await sendTelegramBotMessage({
            chatId,
            text,
        })
    } catch (error) {
        console.error('Telegram admin status message failed', {
            chatId,
            error: error.message,
        })
    }
}

const sendWebhookResponse = (res, message, data = null) => res.json({
    success: true,
    message,
    data,
})
