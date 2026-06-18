import { apiClient } from '../apiClient.js'

export const usersAPI = {
    getActions(userId, options = {}) {
        return apiClient(`/api/users/${encodeURIComponent(userId)}/actions`, {
            method: 'GET',
            ...options,
        })
    },
}
