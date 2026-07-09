import { ok } from '../src/shared/responses/send.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
    getConversationMessagesService,
    getDirectConversationService,
    getUserConversationsService,
    markConversationReadService,
} from '../services/chatService.js'
import { emitChatRead } from '../services/chatRealtimeService.js'

export const getChatConversations = asyncHandler(async (req, res) => {
    const data = await getUserConversationsService({
        userId: req.user.id,
        limit: req.query.limit,
        cursor: req.query.cursor,
    })

    return ok(res, req, 'CHAT.CONVERSATIONS_LOADED', { data })
})

export const createDirectConversation = asyncHandler(async (req, res) => {
    const conversation = await getDirectConversationService({
        userId: req.user.id,
        targetUserId: req.body?.targetUserId,
        createIfMissing: true,
    })

    return ok(res, req, 'CHAT.CONVERSATION_READY', {
        status: 201,
        data: { conversation },
    })
})

export const getConversationMessages = asyncHandler(async (req, res) => {
    const data = await getConversationMessagesService({
        userId: req.user.id,
        conversationId: req.params.conversationId,
        before: req.query.before,
        limit: req.query.limit,
    })

    return ok(res, req, 'CHAT.MESSAGES_LOADED', { data })
})

export const markConversationRead = asyncHandler(async (req, res) => {
    const readState = await markConversationReadService({
        userId: req.user.id,
        conversationId: req.params.conversationId,
        messageId: req.body?.messageId,
    })

    void emitChatRead(readState)

    return ok(res, req, 'CHAT.READ_UPDATED', {
        data: { readState },
    })
})
