import { ApiError } from '../../../utils/ApiError.js'

export const notFound = (
    code = 'COMMON.NOT_FOUND',
    data = null,
) => new ApiError(code, 404, data)

export const badRequest = (
    code = 'COMMON.BAD_REQUEST',
    data = null,
) => new ApiError(code, 400, data)

export const unauthorized = (
    code = 'COMMON.UNAUTHORIZED',
    data = null,
) => new ApiError(code, 401, data)

export const forbidden = (
    code = 'COMMON.FORBIDDEN',
    data = null,
) => new ApiError(code, 403, data)

export const internal = (
    code = 'COMMON.INTERNAL_ERROR',
    data = null,
) => new ApiError(code, 500, data)
