import { apiClient } from '../apiClient.js'

export const resourcesAPI = {
  getList(resourceKey, params = {}) {
    const query = buildQuery(params)

    return apiClient(`/api/admin/resources/${resourceKey}${query ? `?${query}` : ''}`, {
      method: 'GET',
    })
  },

  getUserDetails(userId) {
    return apiClient(`/api/admin/users/${userId}`, {
      method: 'GET',
    })
  },

  getMatchDetails(matchId) {
    return apiClient(`/api/admin/matches/${matchId}`, {
      method: 'GET',
    })
  },

  updateUser(userId, payload) {
    return apiClient(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  manageUser(userId, payload) {
    return apiClient(`/api/admin/users/${userId}/manage`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  updateUserAvatar(userId, file) {
    return apiClient(`/api/admin/users/${userId}/avatar`, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    })
  },

  deleteUserAccount(userId, accountId) {
    return apiClient(`/api/admin/users/${userId}/accounts/${accountId}`, {
      method: 'DELETE',
    })
  },

  deleteUser(userId) {
    return apiClient(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    })
  },
}

function buildQuery(params) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  return searchParams.toString()
}
