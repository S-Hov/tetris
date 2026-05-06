import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'

import authRouter from './routes/auth.js'
import matchesRouter from './routes/matches.js'
import leaderboardRouter from './routes/leaderboard.js'

import { logger } from './middleware/logger.js'
import { errorHandler } from './middleware/errorHandler.js'

import http from 'http'
import { Server } from 'socket.io'
import { registerSocketHandlers } from './sockets/index.js'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'https://pvp-tetris.online',
    'https://www.pvp-tetris.online',
]

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


const APP_NAME = process.env.APP_NAME || "App"

console.log(`App: ${APP_NAME}`)

app.use(logger)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    fallthrough: false,
    maxAge: '7d',
}))

app.use("/api/authentication", authRouter)
app.use("/api/matches", matchesRouter)
app.use("/api/leaderboard", leaderboardRouter)

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
})
