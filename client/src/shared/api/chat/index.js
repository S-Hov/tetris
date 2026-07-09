import { apiClient } from '../apiClient.js'

export const chatAPI = {
    getConversations(params = {}) {
        const searchParams = new URLSearchParams()

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, String(value))
            }
        })

        const query = searchParams.toString()

        return apiClient(`/api/chat/conversations${query ? `?${query}` : ''}`, {
            method: 'GET',
        })
    },

    createDirectConversation(targetUserId) {
        return apiClient('/api/chat/conversations/direct', {
            method: 'POST',
            body: JSON.stringify({
                targetUserId,
            }),
        })
    },

    getMessages(conversationId, params = {}) {
        const searchParams = new URLSearchParams()

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, String(value))
            }
        })

        const query = searchParams.toString()

        return apiClient(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages${query ? `?${query}` : ''}`, {
            method: 'GET',
        })
    },

    markRead(conversationId, messageId) {
        return apiClient(`/api/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
            method: 'PATCH',
            body: JSON.stringify({
                messageId,
            }),
        })
    },
}
