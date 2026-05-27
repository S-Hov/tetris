export class ApiError extends Error {
    constructor(code, statusCode, data = null) {
        const isMessageCode = typeof code === 'string' && /^[A-Z]+(?:\.[A-Z0-9_]+)+$/.test(code)
        const normalizedCode = isMessageCode ? code : getDefaultCode(statusCode)

        super(normalizedCode)
        this.code = normalizedCode
        this.statusCode = statusCode
        this.data = data

        if (!isMessageCode && typeof code === 'string') {
            this.legacyMessage = code
        }
    }
}

const getDefaultCode = (statusCode) => {
    switch (statusCode) {
        case 400:
            return 'COMMON.BAD_REQUEST'
        case 401:
            return 'COMMON.UNAUTHORIZED'
        case 403:
            return 'COMMON.FORBIDDEN'
        case 404:
            return 'COMMON.NOT_FOUND'
        default:
            return 'COMMON.INTERNAL_ERROR'
    }
}
