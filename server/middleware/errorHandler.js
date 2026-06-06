import { fail } from '../src/shared/responses/send.js'

export const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || 500
    const isUnexpected = !err.statusCode || status >= 500
    const code = isApiMessageCode(err.code)
        ? err.code
        : (isUnexpected ? 'COMMON.INTERNAL_ERROR' : 'COMMON.BAD_REQUEST')
    const data = err.data ?? {}
    const message = err.legacyMessage || getDatabaseErrorMessage(err)

    if (isUnexpected) {
        console.error('ERROR:', err)
    }

    return fail(res, req, code, {
        status,
        data,
        message,
        ...(process.env.NODE_ENV !== 'production' && isUnexpected
            ? { errors: { stack: err.stack } }
            : {}),
    })
}

const isApiMessageCode = (code) => (
    typeof code === 'string' && /^[A-Z]+(?:\.[A-Z0-9_]+)+$/.test(code)
)

const getDatabaseErrorMessage = (error) => {
    if (!isDatabaseErrorCode(error?.code)) {
        return undefined
    }

    switch (error.code) {
        case '23505':
            return 'Запись с такими данными уже существует'
        case '23502':
            return 'Не заполнены обязательные данные'
        case '23503':
            return 'Связанная запись не найдена'
        case '22P02':
            return 'Некорректный формат данных'
        case 'XX000':
            return 'Ошибка базы данных. Попробуйте позже'
        default:
            return undefined
    }
}

const isDatabaseErrorCode = (code) => (
    typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)
)
