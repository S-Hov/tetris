const MESSAGE_CODE_PATTERN = /^[A-Z]+(?:\.[A-Z0-9_]+)+$/

const DEFAULT_CODES = new Map([
    [400, 'COMMON.BAD_REQUEST'],
    [401, 'COMMON.UNAUTHORIZED'],
    [403, 'COMMON.FORBIDDEN'],
    [404, 'COMMON.NOT_FOUND'],
    [409, 'COMMON.CONFLICT'],
    [422, 'COMMON.VALIDATION_ERROR'],
    [500, 'COMMON.INTERNAL_ERROR'],
])

export const isApplicationErrorCode = (value) => (
    typeof value === 'string' && MESSAGE_CODE_PATTERN.test(value)
)

export const defaultErrorCode = (statusCode) => (
    DEFAULT_CODES.get(statusCode) || (
        statusCode >= 500 ? 'COMMON.INTERNAL_ERROR' : 'COMMON.BAD_REQUEST'
    )
)

export class ApplicationError extends Error {
    constructor(code, {
        statusCode = 500,
        data = null,
        cause,
        message,
    } = {}) {
        const normalizedCode = isApplicationErrorCode(code)
            ? code
            : defaultErrorCode(statusCode)

        super(message || normalizedCode, { cause })
        this.name = 'ApplicationError'
        this.code = normalizedCode
        this.statusCode = statusCode
        this.data = data

        if (!isApplicationErrorCode(code) && typeof code === 'string') {
            this.legacyMessage = code
        }
    }
}

export class ValidationError extends ApplicationError {
    constructor(code = 'COMMON.VALIDATION_ERROR', options = {}) {
        super(code, { ...options, statusCode: 422 })
        this.name = 'ValidationError'
    }
}

export class NotFoundError extends ApplicationError {
    constructor(code = 'COMMON.NOT_FOUND', options = {}) {
        super(code, { ...options, statusCode: 404 })
        this.name = 'NotFoundError'
    }
}

export class ConflictError extends ApplicationError {
    constructor(code = 'COMMON.CONFLICT', options = {}) {
        super(code, { ...options, statusCode: 409 })
        this.name = 'ConflictError'
    }
}
