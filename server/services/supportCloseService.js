import { badRequest, notFound } from '../helpers/error.helper.js'
import {
    closeSupportRequestRepo,
    getSupportRequestByIdRepo,
} from '../repositories/supportRepository.js'
import { emitSupportRequestMessage, emitSupportRequestUpdated } from './supportRealtimeService.js'
import { sendTelegramBotMessage } from './telegramSupportService.js'

export const SUPPORT_CLOSED_MESSAGE = 'Ваше обращение закрыто. Спасибо за внимание и за то, что помогаете нам улучшать проект.'

export const closeSupportRequest = async ({
    ticketId,
}) => {
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        throw badRequest('Support ticket id is invalid')
    }

    const supportRequest = await getSupportRequestByIdRepo(ticketId)

    if (!supportRequest) {
        throw notFound('Support request not found')
    }

    if (supportRequest.status === 'closed') {
        return {
            ticketId: supportRequest.id,
            request: supportRequest,
            message: null,
            alreadyClosed: true,
            notified: false,
            queued: false,
        }
    }

    if (supportRequest.status === 'spam') {
        throw badRequest(`Support request #${ticketId} is already spam`)
    }

    const { request: updatedRequest, message } = await closeSupportRequestRepo({
        ticketId: supportRequest.id,
        messageText: SUPPORT_CLOSED_MESSAGE,
    })

    if (!updatedRequest) {
        throw badRequest(`Support request #${ticketId} could not be closed`)
    }

    let notified = false
    let notificationFailed = false

    if (updatedRequest.preferred_channel === 'telegram'
        && updatedRequest.telegram_chat_id
        && updatedRequest.telegram_linked_at) {
        try {
            await sendTelegramBotMessage({
                chatId: updatedRequest.telegram_chat_id,
                text: SUPPORT_CLOSED_MESSAGE,
            })
            notified = true
        } catch (error) {
            console.error('Support close Telegram notification failed', {
                ticketId: updatedRequest.id,
                error: error.message,
            })
            notificationFailed = true
        }
    }

    if (message) {
        emitSupportRequestMessage({
            requestId: updatedRequest.id,
            message,
            request: updatedRequest,
        })
    }

    emitSupportRequestUpdated({
        requestId: updatedRequest.id,
        request: updatedRequest,
    })

    return {
        ticketId: updatedRequest.id,
        request: updatedRequest,
        message,
        alreadyClosed: false,
        notified,
        notificationFailed,
        queued: updatedRequest.preferred_channel === 'telegram'
            && (!updatedRequest.telegram_chat_id || !updatedRequest.telegram_linked_at),
    }
}
