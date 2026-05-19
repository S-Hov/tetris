import { asyncHandler } from '../utils/asyncHandler.js'
import {
    answerTelegramCallbackQuery,
    handleSupportClientTelegramMessage,
    linkSupportRequestTelegramChat,
    parseAdminTelegramUserIds,
    sendTelegramBotMessage,
} from '../services/telegramSupportService.js'
import { replyToSupportRequest } from '../services/supportReplyService.js'
import { closeSupportRequest } from '../services/supportCloseService.js'

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

const extractSupportCloseTicketId = (value = '') => {
    const match = String(value || '').match(/^support_close:(\d+)$/)
    return match ? Number(match[1]) : null
}

export const handleTelegramWebhook = asyncHandler(async (req, res) => {
    const update = req.body
    const callbackQuery = update?.callback_query

    if (callbackQuery) {
        return handleTelegramCallbackQuery({
            callbackQuery,
            res,
        })
    }

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

const handleTelegramCallbackQuery = async ({
    callbackQuery,
    res,
}) => {
    const allowedAdminIds = parseAdminTelegramUserIds()
    const callbackMessage = callbackQuery.message
    const callbackFromId = String(callbackQuery.from?.id || '')

    if (!allowedAdminIds.has(callbackFromId) && !isAdminTelegramMessage(callbackMessage, allowedAdminIds)) {
        await answerTelegramCallback(callbackQuery.id, 'Недостаточно прав', true)
        return sendWebhookResponse(res, 'Telegram callback ignored')
    }

    const ticketId = extractSupportCloseTicketId(callbackQuery.data)

    if (!ticketId) {
        await answerTelegramCallback(callbackQuery.id, 'Действие не найдено', true)
        return sendWebhookResponse(res, 'Telegram callback ignored')
    }

    try {
        const closeResult = await closeSupportRequest({
            ticketId,
        })
        const statusText = closeResult.alreadyClosed
            ? `Обращение #${ticketId} уже закрыто.`
            : closeResult.notified
                ? `Обращение #${ticketId} закрыто. Пользователь уведомлен.`
                : closeResult.queued
                    ? `Обращение #${ticketId} закрыто. Пользователь получит уведомление, когда откроет Telegram-бота.`
                    : `Обращение #${ticketId} закрыто, но уведомление пользователю отправить не удалось.`

        await answerTelegramCallback(callbackQuery.id, statusText)
        await sendTelegramAdminStatusMessage({
            chatId: callbackMessage?.chat?.id,
            text: statusText,
        })

        return sendWebhookResponse(res, 'Telegram support request closed', {
            ticketId,
            closed: true,
            alreadyClosed: closeResult.alreadyClosed,
        })
    } catch (error) {
        console.error('Telegram support close failed', {
            ticketId,
            adminTelegramId: callbackFromId,
            chatId: callbackMessage?.chat?.id,
            error: error.message,
        })

        await answerTelegramCallback(callbackQuery.id, error.message || 'Не удалось закрыть обращение', true)
        await sendTelegramAdminStatusMessage({
            chatId: callbackMessage?.chat?.id,
            text: `Не удалось закрыть обращение #${ticketId}: ${error.message}`,
        })

        return sendWebhookResponse(res, 'Telegram support close failed', {
            processed: false,
            ticketId,
            error: error.message,
        })
    }
}

const answerTelegramCallback = async (callbackQueryId, text, showAlert = false) => {
    try {
        await answerTelegramCallbackQuery({
            callbackQueryId,
            text,
            showAlert,
        })
    } catch (error) {
        console.error('Telegram callback answer failed', {
            callbackQueryId,
            error: error.message,
        })
    }
}

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
