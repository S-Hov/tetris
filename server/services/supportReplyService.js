import { badRequest, notFound } from '../helpers/error.helper.js'
import {
    appendSupportAdminReplyRepo,
    getSupportRequestByIdRepo,
} from '../repositories/supportRepository.js'
import { sendSupportReplyEmail } from './emailService.js'
import { sendTelegramBotMessage } from './telegramSupportService.js'

export const replyToSupportRequest = async ({
    ticketId,
    adminTelegramId,
    replyText,
}) => {
    const normalizedReplyText = String(replyText || '').trim()

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        throw badRequest('Support ticket id is invalid')
    }

    if (!adminTelegramId) {
        throw badRequest('Admin Telegram id is required')
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
        if (!supportRequest.telegram_chat_id || !supportRequest.telegram_linked_at) {
            throw badRequest(`Support request #${ticketId} is not linked to Telegram`)
        }

        await sendTelegramBotMessage({
            chatId: supportRequest.telegram_chat_id,
            text: normalizedReplyText,
        })
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

    await appendSupportAdminReplyRepo({
        ticketId: supportRequest.id,
        adminTelegramId,
        replyText: normalizedReplyText,
    })

    return {
        ticketId: supportRequest.id,
        preferredChannel: supportRequest.preferred_channel,
    }
}
