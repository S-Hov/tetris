import { apiClient } from '../apiClient.js'

export const settingsAPI = {
    getConnections() {
        return apiClient('/api/identity/connections', {
            method: 'GET',
        })
    },

    unlinkConnection(provider) {
        return apiClient(`/api/identity/connections/${encodeURIComponent(provider)}/unlink`, {
            method: 'DELETE',
        })
    },

    requestEmailChange(data) {
        return apiClient('/api/identity/account/email', {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    },

    getLoginHistory() {
        return apiClient('/api/identity/account/login-history', {
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
