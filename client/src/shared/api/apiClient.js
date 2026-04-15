export async function apiClient(url, options = {}) {
    const headers = new Headers(options.headers || {})
    const isFormDataBody = typeof FormData !== 'undefined' && options.body instanceof FormData

    if (!isFormDataBody && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(url, {
        credentials: 'include',
        headers,
        ...options
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
            const message = extractMessage(data, 'Не удалось выполнить запрос')

            throw {
                status: response.status,
                data,
                message,
                error: message,
                success: false
            }
        }

        return unwrapUnifiedResponse(data)
    }

    if (!response.ok) {
        const message = extractMessage(data, 'Не удалось выполнить запрос')

        throw {
            status: response.status,
            data,
            message,
            error: message,
            success: false
        }
    }

    return data
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
        message: payload.message
    }

    const hasData = Object.prototype.hasOwnProperty.call(payload, 'data')
    const responseData = hasData ? payload.data : null

    if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
        return {
            ...responseData,
            ...responseMeta
        }
    }

    if (responseData === null || responseData === undefined) {
        return responseMeta
    }

    return {
        ...responseMeta,
        data: responseData
    }
}