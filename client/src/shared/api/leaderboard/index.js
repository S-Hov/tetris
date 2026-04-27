import { apiClient } from '../apiClient.js'

export const leaderboardAPI = {
    getList(params = {}) {
        const searchParams = new URLSearchParams()

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, String(value))
            }
        })

        const query = searchParams.toString()

        return apiClient(`/api/leaderboard${query ? `?${query}` : ''}`, {
            method: 'GET',
        })
    },
}
