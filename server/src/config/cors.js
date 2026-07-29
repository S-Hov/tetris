export const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'https://pvp-blocks.online',
    'https://www.pvp-blocks.online',
    'https://admin.pvp-blocks.online',
])

export const parseAllowedOrigins = (value) => {
    const configuredOrigins = String(value || '')
        .split(',')
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean)

    return configuredOrigins.length > 0
        ? [...new Set(configuredOrigins)]
        : [...DEFAULT_ALLOWED_ORIGINS]
}
