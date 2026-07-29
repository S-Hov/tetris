import { z } from 'zod'

import { parseAllowedOrigins } from './cors.js'

const optionalString = z.preprocess(
    (value) => value === undefined || value === null || value === '' ? undefined : value,
    z.string().trim().min(1).optional(),
)

const optionalUrl = z.preprocess(
    (value) => value === undefined || value === null || value === '' ? undefined : value,
    z.string().url().optional(),
)

const optionalPort = z.preprocess(
    (value) => value === undefined || value === null || value === '' ? undefined : value,
    z.coerce.number().int().min(1).max(65535).optional(),
)

const optionalPositiveInteger = z.preprocess(
    (value) => value === undefined || value === null || value === '' ? undefined : value,
    z.coerce.number().int().positive().optional(),
)

const envSchema = z.object({
    APP_NAME: z.string().trim().min(1).default('App'),
    PORT: z.coerce.number().int().min(0).max(65535).default(8880),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    CORS_ORIGINS: optionalString,
    DATABASE_MODE: z.enum(['local', 'production', 'development', 'dev']).default('production'),
    DATABASE_URL: optionalUrl,
    LOCAL_DATABASE_URL: optionalUrl,
    DB_HOST: optionalString,
    DB_PORT: optionalPort,
    DB_DATABASE: optionalString,
    DB_USERNAME: optionalString,
    DB_PASSWORD: optionalString,
    DB_SSL: optionalString,
    DB_POOL_MAX: optionalPositiveInteger,
    LOCAL_DB_HOST: optionalString,
    LOCAL_DB_PORT: optionalPort,
    LOCAL_DB_DATABASE: optionalString,
    LOCAL_DB_USERNAME: optionalString,
    LOCAL_DB_PASSWORD: optionalString,
    LOCAL_DB_SSL: optionalString,
    PGSSLMODE: optionalString,
    JWT_SECRET: optionalString,
    TOKEN_LIFETIME: optionalPositiveInteger,
    COOKIE_DOMAIN: optionalString,
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    EMAIL_VERIFICATION_CODE_LENGTH: z.preprocess(
        (value) => value === undefined || value === null || value === '' ? undefined : value,
        z.coerce.number().int().min(4).max(8).optional(),
    ),
    EMAIL_VERIFICATION_TTL_SECONDS: optionalPositiveInteger,
})

export class EnvironmentValidationError extends Error {
    constructor(issues) {
        const details = issues
            .map(({ path, message }) => `${path.join('.') || 'environment'}: ${message}`)
            .join('; ')

        super(`Invalid server environment: ${details}`)
        this.name = 'EnvironmentValidationError'
        this.issues = issues
    }
}

export const parseEnvironment = (source = process.env) => {
    const result = envSchema.safeParse(source)

    if (!result.success) {
        throw new EnvironmentValidationError(result.error.issues)
    }

    return Object.freeze(result.data)
}

export const createConfig = (source = process.env) => {
    const env = parseEnvironment(source)

    return Object.freeze({
        appName: env.APP_NAME,
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
        isProduction: env.NODE_ENV === 'production',
        allowedOrigins: Object.freeze(parseAllowedOrigins(env.CORS_ORIGINS)),
        identity: Object.freeze({
            jwtSecret: env.JWT_SECRET,
            tokenLifetimeDays: env.TOKEN_LIFETIME || 7,
            cookieDomain: env.COOKIE_DOMAIN,
            cookieSameSite: env.COOKIE_SAME_SITE || (
                env.NODE_ENV === 'production' ? 'none' : 'lax'
            ),
            cookieSecure: env.COOKIE_SECURE === undefined
                ? env.NODE_ENV === 'production'
                : env.COOKIE_SECURE === 'true',
            verificationCodeLength: env.EMAIL_VERIFICATION_CODE_LENGTH || 6,
            verificationTtlSeconds: env.EMAIL_VERIFICATION_TTL_SECONDS || 180,
        }),
        database: Object.freeze({
            mode: ['local', 'development', 'dev'].includes(env.DATABASE_MODE)
                ? 'local'
                : 'production',
            url: env.DATABASE_URL,
            localUrl: env.LOCAL_DATABASE_URL,
            host: env.DB_HOST,
            port: env.DB_PORT,
            name: env.DB_DATABASE,
            username: env.DB_USERNAME,
            password: env.DB_PASSWORD,
            ssl: env.DB_SSL,
            poolMax: env.DB_POOL_MAX,
            localHost: env.LOCAL_DB_HOST,
            localPort: env.LOCAL_DB_PORT,
            localName: env.LOCAL_DB_DATABASE,
            localUsername: env.LOCAL_DB_USERNAME,
            localPassword: env.LOCAL_DB_PASSWORD,
            localSsl: env.LOCAL_DB_SSL,
            pgSslMode: env.PGSSLMODE,
        }),
    })
}
