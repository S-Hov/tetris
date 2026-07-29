import { apiClient } from "../apiClient.js"

export const authenticationAPI = {

    register(data) {
        return apiClient('/api/identity/register', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    async login(data) {
        const response = await apiClient('/api/identity/login', {
            method: 'POST',
            body: JSON.stringify(data)
        })

        return {
            ...response,
            user: response.user || {
                id: response.id,
                username: response.username,
                email: response.email,
                status: response.status,
            },
        }
    },

    async me() {
        const response = await apiClient('/api/identity/me', {
            method: 'GET'
        })

        return response.user || null
    },

    logout() {
        return apiClient('/api/identity/logout', {
            method: 'POST'
        })
    },

    updateProfile(data) {
        return apiClient('/api/identity/me', {
            method: 'PATCH',
            body: JSON.stringify(data)
        })
    },

    updateAvatar(file) {
        return apiClient('/api/identity/me/avatar', {
            method: 'PUT',
            headers: {
                'Content-Type': file.type,
            },
            body: file
        })
    },

    updatePassword(data) {
        return apiClient('/api/identity/me/password', {
            method: 'PATCH',
            body: JSON.stringify(data)
        })
    },

    verifyEmail(data) {
        const { email, code } = data

        return apiClient(`/api/identity/verify-email/${encodeURIComponent(email)}`, {
            method: 'POST',
            body: JSON.stringify({ code })
        })
    },

    resendVerificationCode(data) {
        return apiClient('/api/identity/resend-verification-email', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    changeUnverifiedEmail(data) {
        return apiClient('/api/identity/change-unverified-email', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    requestPasswordReset(data) {
        return apiClient('/api/identity/password-reset', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    verifyPasswordReset(data) {
        const { email, code } = data

        return apiClient(`/api/identity/password-reset/verify/${encodeURIComponent(email)}`, {
            method: 'POST',
            body: JSON.stringify({ code })
        })
    },

    getVerificationTime(email) {
        return apiClient(`/api/identity/verification-time/${encodeURIComponent(email)}`, {
            method: 'GET'
        })
    },

    getPasswordResetVerificationTime(email) {
        return apiClient(`/api/identity/password-reset/verification-time/${encodeURIComponent(email)}`, {
            method: 'GET'
        })
    }

}

export async function fetchVerificationTime(email) {
    const response = await authenticationAPI.getVerificationTime(email)
    return response
}
