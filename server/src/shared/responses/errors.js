import { ApplicationError } from '../application/errors/ApplicationError.js'

export const notFound = (
    code = 'COMMON.NOT_FOUND',
    data = null,
) => new ApplicationError(code, { statusCode: 404, data })

export const badRequest = (
    code = 'COMMON.BAD_REQUEST',
    data = null,
) => new ApplicationError(code, { statusCode: 400, data })

export const unauthorized = (
    code = 'COMMON.UNAUTHORIZED',
    data = null,
) => new ApplicationError(code, { statusCode: 401, data })

export const forbidden = (
    code = 'COMMON.FORBIDDEN',
    data = null,
) => new ApplicationError(code, { statusCode: 403, data })

export const internal = (
    code = 'COMMON.INTERNAL_ERROR',
    data = null,
) => new ApplicationError(code, { statusCode: 500, data })
