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

    verifyEmail(data) {
        return apiClient('/api/authentication/verify-email', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    resendVerificationCode(data) {
        return apiClient('/api/authentication/resend-verification-email', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    getVerificationTime(email) {
        const params = email ? `?email=${encodeURIComponent(email)}` : '';
        return apiClient(`/api/authentication/verification-time${params}`, {
            method: 'GET'
        })
    }

}

export async function fetchVerificationTime(email) {
    const response = await authenticationAPI.getVerificationTime(email)
    return response
}