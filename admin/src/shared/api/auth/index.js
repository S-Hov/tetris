import { apiClient } from '../apiClient.js'

export const authAPI = {
  login(data) {
    return apiClient('/api/identity/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  logout() {
    return apiClient('/api/identity/logout', {
      method: 'POST',
    })
  },
}
