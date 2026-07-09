import {
    assertAuthenticatedChatUser,
    getConversationDetailsService,
    markConversationReadService,
    sendChatMessageService,
} from '../services/chatService.js'
import {
    emitChatMessage,
    emitChatRead,
    getChatConversationRoom,
} from '../services/chatRealtimeService.js'

const callbackError = (callback, error, fallback = 'CHAT.ERROR') => {
    callback?.({
        success: false,
        message: error?.message || fallback,
        code: error?.code || fallback,
    })
}

const getSocketUserId = (socket) => {
    try {
        return assertAuthenticatedChatUser(socket.data.user?.id)
    } catch {
        return null
    }
}

export const registerChatHandlers = (io, socket) => {
    const userId = getSocketUserId(socket)

    socket.on('chat:conversation:join', async ({ conversationId } = {}, callback) => {
        if (!userId) {
            callback?.({ success: false, message: 'CHAT.AUTH_REQUIRED', code: 'CHAT.AUTH_REQUIRED' })
            return
        }

        try {
            const conversation = await getConversationDetailsService({
                userId,
                conversationId,
            })

            await socket.join(getChatConversationRoom(conversation.id))
            callback?.({ success: true, conversation })
        } catch (error) {
            callbackError(callback, error, 'CHAT.CONVERSATION_JOIN_FAILED')
        }
    })

    socket.on('chat:conversation:leave', async ({ conversationId } = {}, callback) => {
        if (conversationId) {
            await socket.leave(getChatConversationRoom(conversationId))
        }

        callback?.({ success: true })
    })

    socket.on('chat:message:send', async (payload = {}, callback) => {
        if (!userId) {
            callback?.({ success: false, message: 'CHAT.AUTH_REQUIRED', code: 'CHAT.AUTH_REQUIRED' })
            return
        }

        try {
            const result = await sendChatMessageService({
                userId,
                targetUserId: payload.targetUserId,
                conversationId: payload.conversationId,
                text: payload.text,
                clientMessageId: payload.clientMessageId,
            })

            await socket.join(getChatConversationRoom(result.conversation.id))
            await emitChatMessage(result)

            callback?.({ success: true, ...result })
        } catch (error) {
            callbackError(callback, error, 'CHAT.MESSAGE_SEND_FAILED')
        }
    })

    socket.on('chat:message:read', async ({ conversationId, messageId } = {}, callback) => {
        if (!userId) {
            callback?.({ success: false, message: 'CHAT.AUTH_REQUIRED', code: 'CHAT.AUTH_REQUIRED' })
            return
        }

        try {
            const readState = await markConversationReadService({
                userId,
                conversationId,
                messageId,
            })

            void emitChatRead(readState)
            callback?.({ success: true, readState })
        } catch (error) {
            callbackError(callback, error, 'CHAT.READ_UPDATE_FAILED')
        }
    })

    socket.on('chat:typing:start', async ({ conversationId } = {}, callback) => {
        if (!userId) {
            callback?.({ success: false, message: 'CHAT.AUTH_REQUIRED', code: 'CHAT.AUTH_REQUIRED' })
            return
        }

        try {
            const conversation = await getConversationDetailsService({
                userId,
                conversationId,
            })

            socket.to(getChatConversationRoom(conversation.id)).emit('chat:typing:start', {
                conversationId: conversation.id,
                userId,
            })
            callback?.({ success: true })
        } catch (error) {
            callbackError(callback, error, 'CHAT.TYPING_FAILED')
        }
    })

    socket.on('chat:typing:stop', async ({ conversationId } = {}, callback) => {
        if (!userId) {
            callback?.({ success: false, message: 'CHAT.AUTH_REQUIRED', code: 'CHAT.AUTH_REQUIRED' })
            return
        }

        try {
            const conversation = await getConversationDetailsService({
                userId,
                conversationId,
            })

            socket.to(getChatConversationRoom(conversation.id)).emit('chat:typing:stop', {
                conversationId: conversation.id,
                userId,
            })
            callback?.({ success: true })
        } catch (error) {
            callbackError(callback, error, 'CHAT.TYPING_FAILED')
        }
    })
}
