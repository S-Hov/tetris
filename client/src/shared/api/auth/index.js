import { apiClient } from "../apiClient.js"

export const authenticationAPI = {

    register(data) {
        return apiClient('/api/authentication/register', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    login(data) {
        return apiClient('/api/authentication/login', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    async me() {
        const response = await apiClient('/api/authentication/me', {
            method: 'GET'
        })

        return response.user || null
    },

    logout() {
        return apiClient('/api/authentication/logout', {
            method: 'POST'
        })
    },

    updateProfile(data) {
        return apiClient('/api/authentication/me', {
            method: 'PATCH',
            body: JSON.stringify(data)
        })
    },

    updateAvatar(file) {
        return apiClient('/api/authentication/me/avatar', {
            method: 'PUT',
            headers: {
                'Content-Type': file.type,
            },
            body: file
        })
    },

    verifyEmail(data) {
        const { email, code } = data

        return apiClient(`/api/authentication/verify-email/${encodeURIComponent(email)}`, {
            method: 'POST',
            body: JSON.stringify({ code })
        })
    },

    resendVerificationCode(data) {
        return apiClient('/api/authentication/resend-verification-email', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    getVerificationTime(email) {
        return apiClient(`/api/authentication/verification-time/${encodeURIComponent(email)}`, {
            method: 'GET'
        })
    }

}

export async function fetchVerificationTime(email) {
    const response = await authenticationAPI.getVerificationTime(email)
    return response
}
