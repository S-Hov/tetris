import { ZodError } from 'zod'

import {
    ApplicationError,
    isApplicationErrorCode,
} from '../../application/errors/ApplicationError.js'

const DATABASE_MESSAGES = new Map([
    ['23505', 'Запись с такими данными уже существует'],
    ['23502', 'Не заполнены обязательные данные'],
    ['23503', 'Связанная запись не найдена'],
    ['22P02', 'Некорректный формат данных'],
    ['XX000', 'Ошибка базы данных. Попробуйте позже'],
])

const mapZodIssues = (issues) => issues.map(({ path, message, code }) => ({
    path,
    message,
    code,
}))

export const mapHttpError = (error, {
    includeStack = false,
} = {}) => {
    if (error instanceof ZodError) {
        return {
            status: 422,
            code: 'COMMON.VALIDATION_ERROR',
            data: {},
            errors: mapZodIssues(error.issues),
            unexpected: false,
        }
    }

    const status = Number.isInteger(error?.statusCode)
        ? error.statusCode
        : 500
    const unexpected = status >= 500 || (
        !(error instanceof ApplicationError) && !error?.statusCode
    )
    const code = isApplicationErrorCode(error?.code)
        ? error.code
        : (unexpected ? 'COMMON.INTERNAL_ERROR' : 'COMMON.BAD_REQUEST')
    const databaseMessage = DATABASE_MESSAGES.get(error?.code)

    return {
        status,
        code,
        data: error?.data ?? {},
        message: error?.legacyMessage || databaseMessage,
        unexpected,
        ...(includeStack && unexpected && error?.stack
            ? { errors: { stack: error.stack } }
            : {}),
    }
}
