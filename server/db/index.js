import pkg from 'pg'

const { Pool } = pkg

const normalizeBoolean = (value) => {
    if (!value) {
        return null
    }

    const normalizedValue = value.toLowerCase()

    if (['1', 'true', 'yes', 'require', 'no-verify', 'verify-ca', 'verify-full'].includes(normalizedValue)) {
        return true
    }

    if (['0', 'false', 'no', 'disable'].includes(normalizedValue)) {
        return false
    }

    return null
}

const getDatabaseHost = () => {
    if (!process.env.DATABASE_URL) {
        return process.env.DB_HOST
    }

    try {
        return new URL(process.env.DATABASE_URL).hostname
    } catch {
        return null
    }
}

const getDatabaseSslMode = () => {
    if (!process.env.DATABASE_URL) {
        return null
    }

    try {
        return new URL(process.env.DATABASE_URL).searchParams.get('sslmode')
    } catch {
        return null
    }
}

const shouldUseSsl = () => {
    const explicitSsl = normalizeBoolean(process.env.DB_SSL || process.env.PGSSLMODE)

    if (explicitSsl !== null) {
        return explicitSsl
    }

    const connectionStringSsl = normalizeBoolean(getDatabaseSslMode())

    if (connectionStringSsl !== null) {
        return connectionStringSsl
    }

    const host = getDatabaseHost()
    const isSupabaseHost = host?.includes('supabase.co') || host?.includes('supabase.com')

    return process.env.NODE_ENV === 'production' || isSupabaseHost
}

const getPoolConfig = () => {
    const ssl = shouldUseSsl()
        ? { rejectUnauthorized: false }
        : false

    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl,
        }
    }

    return {
        user: process.env.DB_USERNAME,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
        ssl,
    }
}

export const pool = new Pool(getPoolConfig())
