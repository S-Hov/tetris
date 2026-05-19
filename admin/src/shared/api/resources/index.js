import { apiClient } from '../apiClient.js'

export const resourcesAPI = {
  getList(resourceKey, params = {}) {
    const query = buildQuery(params)

    return apiClient(`/api/admin/resources/${resourceKey}${query ? `?${query}` : ''}`, {
      method: 'GET',
    })
  },

  getUserDetails(userId, params = {}) {
    const query = buildQuery(params)

    return apiClient(`/api/admin/users/${userId}${query ? `?${query}` : ''}`, {
      method: 'GET',
    })
  },

  getMatchDetails(matchId) {
    return apiClient(`/api/admin/matches/${matchId}`, {
      method: 'GET',
    })
  },

  getMatchTeamDetails(teamId) {
    return apiClient(`/api/admin/match-teams/${teamId}`, {
      method: 'GET',
    })
  },

  getSupportRequestDetails(requestId) {
    return apiClient(`/api/admin/support/requests/${requestId}`, {
      method: 'GET',
    })
  },

  replySupportRequest(requestId, message) {
    return apiClient(`/api/admin/support/requests/${requestId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  },

  createItem(resourceKey, payload) {
    return apiClient(`/api/admin/resources/${resourceKey}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateItem(resourceKey, resourceId, payload) {
    return apiClient(`/api/admin/resources/${resourceKey}/${encodeURIComponent(resourceId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  updateItemStatus(resourceKey, resourceId, status) {
    return apiClient(`/api/admin/resources/${resourceKey}/${encodeURIComponent(resourceId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  deleteItem(resourceKey, resourceId) {
    return apiClient(`/api/admin/resources/${resourceKey}/${encodeURIComponent(resourceId)}`, {
      method: 'DELETE',
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
