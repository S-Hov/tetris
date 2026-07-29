import { fail } from '../../responses/send.js'
import { mapHttpError } from './mapHttpError.js'

export const createErrorHandler = ({
    logger = console,
    includeStack = process.env.NODE_ENV !== 'production',
} = {}) => (error, req, res, next) => {
    const mapped = mapHttpError(error, { includeStack })

    if (mapped.unexpected) {
        logger.error('request_failed', {
            error,
            method: req.method,
            path: req.originalUrl || req.url,
        })
    }

    return fail(res, req, mapped.code, {
        status: mapped.status,
        data: mapped.data,
        message: mapped.message,
        ...(mapped.errors === undefined ? {} : { errors: mapped.errors }),
    })
}

export const errorHandler = createErrorHandler()
