import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import passport, { configurePassport } from '../../config/passport.js'

import { serveUploadedAsset } from '../../controllers/uploadsController.js'
import { createErrorHandler } from '../shared/presentation/http/errorHandler.js'
import { requestContext } from '../shared/presentation/http/requestContext.js'
import { createRequestLogger } from '../shared/presentation/http/requestLogger.js'
import { registerLegacyHttpModules } from './registerModules.js'

const createCorsOriginGuard = (allowedOrigins) => (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
    }

    callback(new Error('Not allowed by CORS'))
}

export const createApp = ({
    allowedOrigins,
    uploadsPath,
    nodeEnv = 'development',
} = {}, {
    logger = console,
} = {}) => {
    const app = express()
    const origins = Array.isArray(allowedOrigins) ? allowedOrigins : []

    app.set('trust proxy', 1)
    app.use(requestContext)
    app.use(createRequestLogger({ logger }))
    app.use(cors({
        origin: createCorsOriginGuard(origins),
        credentials: true,
    }))
    app.use(express.json())
    app.use(cookieParser())

    configurePassport()
    app.use(passport.initialize())
    app.use('/uploads', express.static(uploadsPath, {
        maxAge: '7d',
    }))
    app.get(/^\/uploads\/.+/, serveUploadedAsset)

    registerLegacyHttpModules(app)
    app.use(createErrorHandler({
        logger,
        includeStack: nodeEnv !== 'production',
    }))

    return app
}
