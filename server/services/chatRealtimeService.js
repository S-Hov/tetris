import { getConversationDetailsService } from './chatService.js'

let chatRealtimeIo = null

export const getChatUserRoom = (userId) => `user:${userId}`
export const getChatConversationRoom = (conversationId) => `chat:${conversationId}`

export const setChatRealtimeIo = (io) => {
    chatRealtimeIo = io
}

export const emitChatMessage = async ({ conversation, message }) => {
    if (!chatRealtimeIo || !conversation?.participants?.length) {
        return
    }

    await Promise.all(conversation.participants.map(async (participant) => {
        const participantConversation = await getConversationDetailsService({
            userId: participant.userId,
            conversationId: conversation.id,
        })

        chatRealtimeIo.to(getChatUserRoom(participant.userId)).emit('chat:message:new', {
            conversation: participantConversation,
            message,
        })
    }))
}

export const emitChatRead = async (readState) => {
    if (!chatRealtimeIo || !readState?.conversationId) {
        return
    }

    chatRealtimeIo.to(getChatConversationRoom(readState.conversationId)).emit('chat:message:read', readState)

    try {
        const conversation = await getConversationDetailsService({
            userId: readState.userId,
            conversationId: readState.conversationId,
        })

        conversation.participants.forEach((participant) => {
            chatRealtimeIo.to(getChatUserRoom(participant.userId)).emit('chat:message:read', readState)
        })
    } catch {
        // The conversation room emit above is still valid for currently joined sockets.
    }
}

export const emitChatTyping = ({ conversationId, senderUserId, eventName }) => {
    if (!chatRealtimeIo || !conversationId || !senderUserId) {
        return
    }

    chatRealtimeIo.to(getChatConversationRoom(conversationId)).except(getChatUserRoom(senderUserId)).emit(eventName, {
        conversationId,
        userId: senderUserId,
    })
}
