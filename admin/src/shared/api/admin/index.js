import { apiClient } from '../apiClient.js'

export const adminAPI = {
  me() {
    return apiClient('/api/admin/me', {
      method: 'GET',
    })
  },

  navigation() {
    return apiClient('/api/admin/navigation', {
      method: 'GET',
    })
  },
}
