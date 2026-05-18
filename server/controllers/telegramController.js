import { asyncHandler } from '../utils/asyncHandler.js'
import { parseAdminTelegramUserIds } from '../services/telegramSupportService.js'
import { replyToSupportRequest } from '../services/supportReplyService.js'

const extractTicketIdFromText = (text = '') => {    
    const match = text.match(/обращение #(\d+)/i)
    return match ? Number(match[1]) : null
}

export const handleTelegramWebhook = asyncHandler(async (req, res) => {
    console.log('TELEGRAM WEBHOOK BODY:', JSON.stringify(req.body, null, 2))

    const update = req.body
    const message = update?.message

    if (!message?.text || !message?.reply_to_message?.text) {
        console.log('SKIP: not a text reply')
        return res.sendStatus(200)
    }

    const adminTelegramId = String(message.from?.id || '')
    const allowedAdminIds = parseAdminTelegramUserIds()

    console.log('ADMIN CHECK:', {
        adminTelegramId,
        allowedAdminIds: Array.from(allowedAdminIds),
        isAllowed: allowedAdminIds.has(adminTelegramId),
    })

    if (!allowedAdminIds.has(adminTelegramId)) {
        console.log('SKIP: admin is not allowed')
        return res.sendStatus(200)
    }

    const ticketId = extractTicketIdFromText(message.reply_to_message.text)

    console.log('TICKET CHECK:', {
        replyToText: message.reply_to_message.text,
        ticketId,
    })

    if (!ticketId) {
        console.log('SKIP: ticket id not found')
        return res.sendStatus(200)
    }

    const replyText = message.text.trim()

    console.log('REPLY TEXT:', replyText)

    if (!replyText) {
        console.log('SKIP: empty reply text')
        return res.sendStatus(200)
    }

    console.log('CALL replyToSupportRequest')

    await replyToSupportRequest({
        ticketId,
        adminTelegramId,
        replyText,
    })

    console.log('DONE replyToSupportRequest')

    return res.sendStatus(200)
})