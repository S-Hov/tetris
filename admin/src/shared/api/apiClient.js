const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:8880`
  }

  return 'http://127.0.0.1:8880'
}

export async function apiClient(url, options = {}) {
  const headers = new Headers(options.headers || {})
  const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData

  if (!isFormDataBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(getBaseUrl() + url, {
    credentials: 'include',
    headers,
    ...options,
  })

  const text = await response.text()
  let data

  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  const isUnifiedApiResponse =
    data &&
    typeof data === 'object' &&
    Object.prototype.hasOwnProperty.call(data, 'success') &&
    Object.prototype.hasOwnProperty.call(data, 'message')

  if (isUnifiedApiResponse) {
    if (!response.ok || data.success === false) {
      throw createApiError(response.status, data)
    }

    return unwrapUnifiedResponse(data)
  }

  if (!response.ok) {
    throw createApiError(response.status, data)
  }

  return data
}

function createApiError(status, payload) {
  const message = extractMessage(payload, 'Не удалось выполнить запрос')

  return {
    status,
    data: payload,
    message,
    error: message,
    success: false,
  }
}

function extractMessage(payload, fallbackMessage) {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
      return payload.message
    }

    if (typeof payload.error === 'string' && payload.error.trim().length > 0) {
      return payload.error
    }
  }

  return fallbackMessage
}

function unwrapUnifiedResponse(payload) {
  const responseMeta = {
    success: payload.success,
    status: payload.status,
    message: payload.message,
  }

  const hasData = Object.prototype.hasOwnProperty.call(payload, 'data')
  const responseData = hasData ? payload.data : null

  if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
    return {
      ...responseData,
      ...responseMeta,
    }
  }

  if (responseData === null || responseData === undefined) {
    return responseMeta
  }

  return {
    ...responseMeta,
    data: responseData,
  }
}
