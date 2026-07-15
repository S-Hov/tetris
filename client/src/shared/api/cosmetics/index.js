import { apiClient } from '../apiClient.js'

export const cosmeticsAPI = {
    getInventory(options = {}) {
        return apiClient('/api/me/inventory/cosmetics', {
            method: 'GET',
            ...options,
        })
    },

    markViewed(inventoryItemId) {
        return apiClient(`/api/me/inventory/cosmetics/${encodeURIComponent(inventoryItemId)}/viewed`, {
            method: 'PATCH',
        })
    },

    getLoadout(options = {}) {
        return apiClient('/api/me/cosmetics/loadout', {
            method: 'GET',
            ...options,
        })
    },

    equipSkinPack(inventoryItemId) {
        return apiClient('/api/me/cosmetics/loadout', {
            method: 'PUT',
            body: JSON.stringify({ inventoryItemId }),
        })
    },
}
