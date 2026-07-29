import pg from 'pg'

import { createConfig } from '../../../config/env.js'
import { logger as defaultLogger } from '../logging/logger.js'

const { Pool } = pg

const normalizeBoolean = (value) => {
    const normalized = String(value || '').trim().toLowerCase()

    if (['1', 'true', 'yes', 'require', 'no-verify', 'verify-ca', 'verify-full'].includes(normalized)) {
        return true
    }

    if (['0', 'false', 'no', 'disable'].includes(normalized)) {
        return false
    }

    return null
}

const getUrlHost = (connectionString) => {
    try {
        return connectionString ? new URL(connectionString).hostname : null
    } catch {
        return null
    }
}

const getUrlSslMode = (connectionString) => {
    try {
        return connectionString
            ? new URL(connectionString).searchParams.get('sslmode')
            : null
    } catch {
        return null
    }
}

export const createPoolConfig = (config) => {
    const database = config.database
    const local = database.mode === 'local'
    const connectionString = local ? database.localUrl : database.url
    const host = getUrlHost(connectionString) || (
        local ? database.localHost || database.host : database.host
    )
    const explicitSsl = normalizeBoolean(
        local ? database.localSsl || database.ssl || database.pgSslMode : database.ssl || database.pgSslMode
    )
    const urlSsl = normalizeBoolean(getUrlSslMode(connectionString))
    const isSupabaseHost = host?.includes('supabase.co') || host?.includes('supabase.com')
    const useSsl = explicitSsl ?? urlSsl ?? (config.isProduction || isSupabaseHost)
    const max = database.poolMax || (
        host?.includes('pooler.supabase.') ? 1 : (local ? 10 : 3)
    )
    const common = {
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        max,
    }

    if (connectionString) {
        return { connectionString, ...common }
    }

    return {
        user: local ? database.localUsername || database.username : database.username,
        host,
        database: local ? database.localName || database.name : database.name,
        password: local ? database.localPassword || database.password : database.password,
        port: local ? database.localPort || database.port : database.port,
        ...common,
    }
}

export const createDatabasePool = ({
    config = createConfig(),
    logger = defaultLogger,
} = {}) => {
    const databasePool = new Pool(createPoolConfig(config))

    databasePool.on('error', (error) => {
        logger.error('database_idle_client_error', { error })
    })

    return databasePool
}

export const pool = createDatabasePool()
