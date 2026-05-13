import { apiClient } from '../apiClient.js'

export const dashboardAPI = {
  getOverview(params = {}) {
    const query = buildQuery(params)

    return apiClient(`/api/admin/dashboard${query ? `?${query}` : ''}`, {
      method: 'GET',
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
