import { apiClient } from '../apiClient.js'

export const matchesAPI = {
    getList(params = {}) {
        const searchParams = new URLSearchParams()

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, String(value))
            }
        })

        const query = searchParams.toString()

        return apiClient(`/api/matches${query ? `?${query}` : ''}`, {
            method: 'GET',
        })
    },

    getById(matchId) {
        return apiClient(`/api/matches/${matchId}`, {
            method: 'GET',
        })
    },

    getSoloRecord() {
        return apiClient('/api/matches/solo/record', {
            method: 'GET',
        })
    },

    submitSoloResult(stats) {
        return apiClient('/api/matches/solo/results', {
            method: 'POST',
            body: JSON.stringify(stats),
        })
    },
}
