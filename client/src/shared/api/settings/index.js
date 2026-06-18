import { apiClient } from '../apiClient.js'

export const settingsAPI = {
    getConnections() {
        return apiClient('/api/settings/connections', {
            method: 'GET',
        })
    },

    unlinkConnection(provider) {
        return apiClient(`/api/settings/connections/${encodeURIComponent(provider)}/unlink`, {
            method: 'DELETE',
        })
    },

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

    getPrivacySettings(options = {}) {
        return apiClient('/api/settings/privacy', {
            method: 'GET',
            ...options,
        })
    },

    updatePrivacySettings(data) {
        return apiClient('/api/settings/privacy', {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    },
}
