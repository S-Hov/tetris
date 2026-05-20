import { apiClient } from '../apiClient.js'

export const databaseAPI = {
  getSchema() {
    return apiClient('/api/admin/database/schema', {
      method: 'GET',
    })
  },

  getControl() {
    return apiClient('/api/admin/database/control', {
      method: 'GET',
    })
  },

  getBackups() {
    return apiClient('/api/admin/database/backups', {
      method: 'GET',
    })
  },

  createBackup(tables = []) {
    return apiClient('/api/admin/database/backups', {
      method: 'POST',
      body: JSON.stringify({ tables }),
    })
  },

  restoreBackup(fileName, payload) {
    return apiClient(`/api/admin/database/backups/${encodeURIComponent(fileName)}/restore`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  deleteBackup(fileName) {
    return apiClient(`/api/admin/database/backups/${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
    })
  },

  importBackup(file, { mode = 'append', tables = [] } = {}) {
    const query = new URLSearchParams({ mode })

    if (tables.length > 0) {
      query.set('tables', tables.join(','))
    }

    return apiClient(`/api/admin/database/import?${query.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: file,
    })
  },
}

export async function downloadDatabaseExport(tables = []) {
  return downloadFromAdmin('/api/admin/database/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tables }),
  })
}

export async function downloadDatabaseBackup(fileName) {
  return downloadFromAdmin(`/api/admin/database/backups/${encodeURIComponent(fileName)}/download`, {
    method: 'GET',
  })
}

async function downloadFromAdmin(url, options) {
  const response = await fetch(getBaseUrl() + url, {
    credentials: 'include',
    ...options,
  })

  if (!response.ok) {
    throw new Error('Не удалось скачать файл')
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || 'database-export.json'
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

function getBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:8880`
  }

  return 'http://127.0.0.1:8880'
}
