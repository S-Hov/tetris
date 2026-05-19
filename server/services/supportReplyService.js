import { badRequest, notFound } from '../helpers/error.helper.js'
import {
    appendSupportAdminReplyRepo,
    createSupportRequestMessageRepo,
    getSupportRequestByIdRepo,
} from '../repositories/supportRepository.js'
import { sendSupportReplyEmail } from './emailService.js'
import { sendTelegramBotMessage } from './telegramSupportService.js'
import { emitSupportRequestMessage, emitSupportRequestUpdated } from './supportRealtimeService.js'

export const replyToSupportRequest = async ({
    ticketId,
    adminTelegramId,
    adminLabel,
    replyText,
}) => {
    const normalizedReplyText = String(replyText || '').trim()
    const normalizedAdminLabel = String(adminLabel || '').trim()

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        throw badRequest('Support ticket id is invalid')
    }

    if (!adminTelegramId && !normalizedAdminLabel) {
        throw badRequest('Admin author is required')
    }

    if (!normalizedReplyText) {
        throw badRequest('Reply text is required')
    }

    const supportRequest = await getSupportRequestByIdRepo(ticketId)

    if (!supportRequest) {
        throw notFound('Support request not found')
    }

    if (['closed', 'spam'].includes(supportRequest.status)) {
        throw badRequest(`Support request #${ticketId} is already ${supportRequest.status}`)
    }

    if (supportRequest.preferred_channel === 'telegram') {
        if (supportRequest.telegram_chat_id && supportRequest.telegram_linked_at) {
            await sendTelegramBotMessage({
                chatId: supportRequest.telegram_chat_id,
                text: normalizedReplyText,
            })
        }
    } else if (supportRequest.preferred_channel === 'email') {
        if (!supportRequest.contact_email) {
            throw badRequest(`Support request #${ticketId} does not have a contact email`)
        }

        await sendSupportReplyEmail({
            to: supportRequest.contact_email,
            ticketId: supportRequest.id,
            contactName: supportRequest.contact_name,
            replyText: normalizedReplyText,
        })
    }

    const updatedRequest = await appendSupportAdminReplyRepo({
        ticketId: supportRequest.id,
        adminTelegramId: normalizedAdminLabel || adminTelegramId,
        replyText: normalizedReplyText,
    })

    const message = await createSupportRequestMessageRepo({
        supportRequestId: supportRequest.id,
        senderType: 'admin',
        senderLabel: normalizedAdminLabel || `Telegram admin ${adminTelegramId}`,
        channel: 'admin',
        messageText: normalizedReplyText,
    })

    emitSupportRequestMessage({
        requestId: supportRequest.id,
        message,
        request: updatedRequest,
    })
    emitSupportRequestUpdated({
        requestId: supportRequest.id,
        request: updatedRequest,
    })

    return {
        ticketId: supportRequest.id,
        preferredChannel: supportRequest.preferred_channel,
        queued: supportRequest.preferred_channel === 'telegram'
            && (!supportRequest.telegram_chat_id || !supportRequest.telegram_linked_at),
    }
}
