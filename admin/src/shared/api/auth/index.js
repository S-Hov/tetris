import { apiClient } from '../apiClient.js'

export const authAPI = {
  login(data) {
    return apiClient('/api/authentication/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  logout() {
    return apiClient('/api/authentication/logout', {
      method: 'POST',
    })
  },
}
