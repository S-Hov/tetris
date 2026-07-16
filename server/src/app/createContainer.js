import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { pool } from '../../db/index.js'
import { syncLocalUploadsToDatabase } from '../../services/uploadedAssetService.js'
import { warmActiveEffectCache } from '../../sockets/game.handlers.js'

const __filename = fileURLToPath(import.meta.url)
const defaultServerRoot = path.resolve(path.dirname(__filename), '..', '..')

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

export const resolveAllowedOrigins = (value) => {
    const configuredOrigins = String(value || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)

    return configuredOrigins.length > 0
        ? configuredOrigins
        : [...DEFAULT_ALLOWED_ORIGINS]
}

export const resolvePort = (value, fallback = 8880) => {
    if (value === undefined || value === null || String(value).trim() === '') {
        return fallback
    }

    const parsed = Number(value)

    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535
        ? parsed
        : fallback
}

export const createContainer = ({
    env = process.env,
    logger = console,
    serverRoot = defaultServerRoot,
    syncUploads = syncLocalUploadsToDatabase,
    closeDatabase = () => pool.end(),
    startupTasks = [
        {
            name: 'ability catalog warmup',
            run: warmActiveEffectCache,
        },
    ],
} = {}) => ({
    config: {
        appName: env.APP_NAME || 'App',
        port: resolvePort(env.PORT),
        allowedOrigins: resolveAllowedOrigins(env.CORS_ORIGINS),
        uploadsPath: path.join(serverRoot, 'uploads'),
    },
    logger,
    services: {
        syncUploads,
        closeDatabase,
        startupTasks,
    },
})
