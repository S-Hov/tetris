import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'

import authRouter from './routes/auth.js'
import matchesRouter from './routes/matches.js'
import leaderboardRouter from './routes/leaderboard.js'
import adminRouter from './routes/admin.js'
import settingsRouter from './routes/settings.js'
import analyticsRouter from './routes/analytics.js'
import supportRouter from './routes/support.js'
import feedbackRouter from './routes/feedback.js'
import effectsRouter from './routes/effects.js'
import passport, { configurePassport } from './config/passport.js'

import { logger } from './middleware/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { serveUploadedAsset } from './controllers/uploadsController.js'
import { syncLocalUploadsToDatabase } from './services/uploadedAssetService.js'

import http from 'http'
import { Server } from 'socket.io'
import { registerSocketHandlers } from './sockets/index.js'
import telegramRouter from './routes/telegram.js'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'https://pvp-tetris.online',
    'https://www.pvp-tetris.online',
    // 'https://pvp-tetris.vercel.app',
    'https://admin.pvp-tetris.online'
]

const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

if (allowedOrigins.length === 0) {
    allowedOrigins.push(...defaultAllowedOrigins)
}

app.set('trust proxy', 1)

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
            return
        }

        callback(new Error('Not allowed by CORS'))
    },
    credentials: true
}))


app.use(express.json())
app.use(cookieParser())
configurePassport()
app.use(passport.initialize())


const APP_NAME = process.env.APP_NAME || "App"

console.log(`App: ${APP_NAME}`)

app.use(logger)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '7d',
}))
app.get(/^\/uploads\/.+/, serveUploadedAsset)

app.use("/api/authentication", authRouter)
app.use("/api/settings", settingsRouter)
app.use("/api/matches", matchesRouter)
app.use("/api/leaderboard", leaderboardRouter)
app.use("/api/analytics", analyticsRouter)
app.use("/api/feedback", feedbackRouter)
app.use("/api/support", supportRouter)
app.use("/api/effects", effectsRouter)
app.use("/api/admin", adminRouter)
app.use('/api/telegram', telegramRouter)

app.use(errorHandler)

const PORT = process.env.PORT || 8880

const httpServer = http.createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
})

registerSocketHandlers(io)

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)

    void syncLocalUploadsToDatabase(path.join(__dirname, 'uploads'))
        .then(({ synced, total }) => {
            if (total > 0) {
                console.log(`Synced uploaded assets to database: ${synced}/${total}`)
            }
        })
        .catch((error) => {
            console.error('Uploaded assets database sync failed:', error)
        })
})
