import pkg from 'pg'

const { Pool } = pkg

const DATABASE_MODE = {
    LOCAL: 'local',
    PRODUCTION: 'production',
}

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

const normalizeDatabaseMode = (value) => {
    const normalizedValue = value?.trim().toLowerCase()

    if (['local', 'development', 'dev'].includes(normalizedValue)) {
        return DATABASE_MODE.LOCAL
    }

    return DATABASE_MODE.PRODUCTION
}

const getDatabaseMode = () => normalizeDatabaseMode(process.env.DATABASE_MODE)

const getDatabaseUrl = () => {
    if (getDatabaseMode() === DATABASE_MODE.LOCAL) {
        return process.env.LOCAL_DATABASE_URL || null
    }

    return process.env.DATABASE_URL || null
}

const getLocalDatabaseValue = (name) => {
    return process.env[`LOCAL_${name}`] || process.env[name]
}

const getExplicitSslValue = () => {
    if (getDatabaseMode() === DATABASE_MODE.LOCAL) {
        return process.env.LOCAL_DB_SSL || process.env.DB_SSL || process.env.PGSSLMODE
    }

    return process.env.DB_SSL || process.env.PGSSLMODE
}

const getDatabaseHost = () => {
    const databaseUrl = getDatabaseUrl()

    if (!databaseUrl) {
        return getDatabaseMode() === DATABASE_MODE.LOCAL
            ? getLocalDatabaseValue('DB_HOST')
            : process.env.DB_HOST
    }

    try {
        return new URL(databaseUrl).hostname
    } catch {
        return null
    }
}

const getDatabaseSslMode = () => {
    const databaseUrl = getDatabaseUrl()

    if (!databaseUrl) {
        return null
    }

    try {
        return new URL(databaseUrl).searchParams.get('sslmode')
    } catch {
        return null
    }
}

const shouldUseSsl = () => {
    const explicitSsl = normalizeBoolean(getExplicitSslValue())

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
    const databaseMode = getDatabaseMode()
    const databaseUrl = getDatabaseUrl()
    const ssl = shouldUseSsl()
        ? { rejectUnauthorized: false }
        : false

    if (databaseUrl) {
        return {
            connectionString: databaseUrl,
            ssl,
        }
    }

    if (databaseMode === DATABASE_MODE.LOCAL) {
        return {
            user: getLocalDatabaseValue('DB_USERNAME'),
            host: getLocalDatabaseValue('DB_HOST'),
            database: getLocalDatabaseValue('DB_DATABASE'),
            password: getLocalDatabaseValue('DB_PASSWORD'),
            port: getLocalDatabaseValue('DB_PORT') ? Number(getLocalDatabaseValue('DB_PORT')) : undefined,
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
