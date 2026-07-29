import { getRequestContext } from '../../presentation/http/requestContext.js'

const REDACTED = '[REDACTED]'
const SENSITIVE_KEY = /authorization|cookie|password|secret|token|api[-_]?key|connectionstring/i

const sanitizeString = (value) => value
    .replace(/\b(Bearer)\s+\S+/gi, '$1 [REDACTED]')
    .replace(/\b(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s/]+@/gi, '$1[REDACTED]@')
    .replace(/\b(password|secret|token|api[-_]?key)=([^&\s]+)/gi, '$1=[REDACTED]')

const serializeError = (error) => ({
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
})

const sanitize = (value, seen = new WeakSet()) => {
    if (value instanceof Error) {
        return sanitize(serializeError(value), seen)
    }

    if (typeof value === 'string') {
        return sanitizeString(value)
    }

    if (!value || typeof value !== 'object') {
        return value
    }

    if (seen.has(value)) {
        return '[Circular]'
    }

    seen.add(value)

    if (Array.isArray(value)) {
        return value.map((item) => sanitize(item, seen))
    }

    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : sanitize(item, seen),
    ]))
}

export const createLogger = ({
    sink = console,
    service = 'pvp-blocks-backend',
    clock = () => new Date(),
} = {}) => {
    const write = (level, message, fields = {}) => {
        const context = getRequestContext()
        const entry = sanitize({
            timestamp: clock().toISOString(),
            level,
            service,
            message,
            ...(context || {}),
            ...(fields && typeof fields === 'object' ? fields : { value: fields }),
        })
        const target = level === 'error'
            ? 'error'
            : (level === 'warn' ? 'warn' : 'log')

        sink[target](JSON.stringify(entry))
        return entry
    }

    return {
        debug: (message, fields) => write('debug', message, fields),
        info: (message, fields) => write('info', message, fields),
        log: (message, fields) => write('info', message, fields),
        warn: (message, fields) => write('warn', message, fields),
        error: (message, fields) => write('error', message, fields),
        child: (fields = {}) => ({
            debug: (message, extra) => write('debug', message, { ...fields, ...extra }),
            info: (message, extra) => write('info', message, { ...fields, ...extra }),
            log: (message, extra) => write('info', message, { ...fields, ...extra }),
            warn: (message, extra) => write('warn', message, { ...fields, ...extra }),
            error: (message, extra) => write('error', message, { ...fields, ...extra }),
        }),
    }
}

export const logger = createLogger()
