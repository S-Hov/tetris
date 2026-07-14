import adminRouter from '../../routes/admin.js'
import analyticsRouter from '../../routes/analytics.js'
import authRouter from '../../routes/auth.js'
import chatRouter from '../../routes/chat.js'
import effectsRouter from '../../routes/effects.js'
import feedbackRouter from '../../routes/feedback.js'
import friendsRouter from '../../routes/friends.js'
import leaderboardRouter from '../../routes/leaderboard.js'
import matchesRouter from '../../routes/matches.js'
import settingsRouter from '../../routes/settings.js'
import supportRouter from '../../routes/support.js'
import telegramRouter from '../../routes/telegram.js'
import usersRouter from '../../routes/users.js'
import { registerSocketHandlers } from '../../sockets/index.js'

// Temporary adapters: phases 4-19 replace these legacy modules one vertical slice at a time.
export const registerLegacyHttpModules = (app) => {
    app.use('/api/authentication', authRouter)
    app.use('/api/settings', settingsRouter)
    app.use('/api/matches', matchesRouter)
    app.use('/api/leaderboard', leaderboardRouter)
    app.use('/api/analytics', analyticsRouter)
    app.use('/api/feedback', feedbackRouter)
    app.use('/api/support', supportRouter)
    app.use('/api/effects', effectsRouter)
    app.use('/api/friends', friendsRouter)
    app.use('/api/chat', chatRouter)
    app.use('/api/users', usersRouter)
    app.use('/api/admin', adminRouter)
    app.use('/api/telegram', telegramRouter)

    return app
}

export const registerLegacySocketModules = (io) => {
    registerSocketHandlers(io)

    return io
}
