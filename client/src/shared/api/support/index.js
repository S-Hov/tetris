import { apiClient } from '../apiClient.js'

export const supportAPI = {
    createRequest(data) {
        return apiClient('/api/support/requests', {
            method: 'POST',
            body: JSON.stringify(data),
        })
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
