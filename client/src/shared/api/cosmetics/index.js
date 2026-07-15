import { apiClient } from '../apiClient.js'

export const cosmeticsAPI = {
    getInventory(options = {}) {
        return apiClient('/api/me/inventory/cosmetics', {
            method: 'GET',
            ...options,
        })
    },
}
