import { apiClient } from '../apiClient.js'

export const chatAPI = {
    createDirectConversation(targetUserId) {
        return apiClient('/api/chat/conversations/direct', {
            method: 'POST',
            body: JSON.stringify({
                targetUserId,
            }),
        })
    },
}
