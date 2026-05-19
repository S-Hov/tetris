import { apiClient } from '../apiClient.js'

export const supportAPI = {
    createFeedback(data) {
        return apiClient('/api/feedback', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    createRequest(data) {
        return apiClient('/api/support/requests', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    getMyRequests() {
        return apiClient('/api/support/requests/my')
    },

    getMyRequest(ticketId) {
        return apiClient(`/api/support/requests/my/${encodeURIComponent(ticketId)}`)
    },

    getMyRequestMessages(ticketId) {
        return apiClient(`/api/support/requests/my/${encodeURIComponent(ticketId)}/messages`)
    },

    getDonationWallets() {
        return apiClient('/api/support/donations/wallets')
    },

    createDonation(data) {
        return apiClient('/api/support/donations', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },
}
