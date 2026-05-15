import { apiClient } from '../apiClient.js'

export const settingsAPI = {
    requestEmailChange(data) {
        return apiClient('/api/settings/account/email', {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    },

    getLoginHistory() {
        return apiClient('/api/settings/account/login-history', {
            method: 'GET',
        })
    },
}
