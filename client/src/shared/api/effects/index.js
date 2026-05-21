import { apiClient } from '@/shared/api/apiClient.js'

export const effectsAPI = {
    getEffects() {
        return apiClient('/api/effects', {
            method: 'GET',
        })
    },
}
