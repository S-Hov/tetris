import {
    ApplicationError,
    defaultErrorCode,
} from '../src/shared/application/errors/ApplicationError.js'

// Temporary phase 3 compatibility adapter. New modules use ApplicationError directly.
export class ApiError extends ApplicationError {
    constructor(code, statusCode, data = null) {
        super(code || defaultErrorCode(statusCode), { statusCode, data })
        this.name = 'ApiError'
    }
}
