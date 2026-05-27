import { fail } from '../src/shared/responses/send.js'

export const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || 500
    const isUnexpected = !err.statusCode || status >= 500
    const code = err.code || (isUnexpected ? 'COMMON.INTERNAL_ERROR' : 'COMMON.BAD_REQUEST')
    const data = err.data ?? {}

    if (isUnexpected) {
        console.error('ERROR:', err)
    }

    return fail(res, req, code, {
        status,
        data,
        message: err.legacyMessage,
        ...(process.env.NODE_ENV !== 'production' && isUnexpected
            ? { errors: { stack: err.stack } }
            : {}),
    })
}
