import { apiClient } from '../apiClient.js'

export const friendsAPI = {
    getFriends() {
        return apiClient('/api/friends', { method: 'GET' })
    },

    getIncomingRequests() {
        return apiClient('/api/friends/requests/incoming', { method: 'GET' })
    },

    findById(userId) {
        return apiClient(`/api/friends/search/${encodeURIComponent(userId)}`, { method: 'GET' })
    },

    sendRequest(addresseeId) {
        return apiClient('/api/friends/requests', {
            method: 'POST',
            body: JSON.stringify({ addresseeId }),
        })
    },

    respondRequest(requestId, action) {
        return apiClient(`/api/friends/requests/${encodeURIComponent(requestId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ action }),
        })
    },
}
