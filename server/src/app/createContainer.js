import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { syncLocalUploadsToDatabase } from '../../services/uploadedAssetService.js'
import { warmActiveEffectCache } from '../../sockets/game.handlers.js'
import { DEFAULT_ALLOWED_ORIGINS, parseAllowedOrigins } from '../config/cors.js'
import { createConfig } from '../config/env.js'
import { pool } from '../shared/infrastructure/database/pool.js'
import { logger as defaultLogger } from '../shared/infrastructure/logging/logger.js'

const __filename = fileURLToPath(import.meta.url)
const defaultServerRoot = path.resolve(path.dirname(__filename), '..', '..')

export { DEFAULT_ALLOWED_ORIGINS }

export const resolveAllowedOrigins = parseAllowedOrigins

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
    logger = defaultLogger,
    serverRoot = defaultServerRoot,
    syncUploads = syncLocalUploadsToDatabase,
    closeDatabase = () => pool.end(),
    startupTasks = [
        {
            name: 'ability catalog warmup',
            run: warmActiveEffectCache,
        },
    ],
} = {}) => {
    const config = createConfig(env)

    return {
        config: {
            ...config,
            uploadsPath: path.join(serverRoot, 'uploads'),
        },
        logger,
        services: {
            syncUploads,
            closeDatabase,
            startupTasks,
        },
    }
}
