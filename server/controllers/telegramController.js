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
        return res.sendStatus(200)
    }

    const adminTelegramId = String(message.from?.id || '')
    const allowedAdminIds = parseAdminTelegramUserIds()

    if (!allowedAdminIds.has(adminTelegramId)) {
        return res.sendStatus(200)
    }

    const ticketId = extractTicketIdFromText(message.reply_to_message.text)

    if (!ticketId) {
        return res.sendStatus(200)
    }

    const replyText = message.text.trim()

    if (!replyText) {
        return res.sendStatus(200)
    }

    await replyToSupportRequest({
        ticketId,
        adminTelegramId,
        replyText,
    })

    return res.sendStatus(200)
})