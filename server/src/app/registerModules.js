import adminRouter from '../../routes/admin.js'
import analyticsRouter from '../../routes/analytics.js'
import chatRouter from '../../routes/chat.js'
import effectsRouter from '../../routes/effects.js'
import feedbackRouter from '../../routes/feedback.js'
import friendsRouter from '../../routes/friends.js'
import leaderboardRouter from '../../routes/leaderboard.js'
import matchesRouter from '../../routes/matches.js'
import meRouter from '../../routes/me.js'
import settingsRouter from '../../routes/settings.js'
import supportRouter from '../../routes/support.js'
import telegramRouter from '../../routes/telegram.js'
import usersRouter from '../../routes/users.js'
import { registerSocketHandlers } from '../../sockets/index.js'
import passport from '../../config/passport.js'
import {
    sendRegistrationVerificationEmail,
    sendTemporaryPasswordEmail,
    sendVerificationEmail,
} from '../../services/emailService.js'
import { publishActivityEvent } from '../../services/activityFeedService.js'
import { verifyTurnstile } from '../../utils/turnstile.js'
import { getRoleByKeyRepo } from '../../repositories/helper.js'
import { storeUploadedAssetRepo } from '../../repositories/uploadedAssetRepository.js'
import { getRankTier } from '../../services/rankRules.js'
import {
    configureIdentityApplication,
    configureIdentityDatabase,
    configureIdentityPorts,
    configureIdentityPresentationPorts,
    identityRouter,
    oauthCallbackRouter,
} from '../modules/identity/index.js'
import * as identityUseCases from '../modules/identity/application/identityUseCases.js'
import * as identityOAuthUseCases from '../modules/identity/application/oauthUseCases.js'
import * as identityRepository from '../modules/identity/infrastructure/identityRepository.js'
import * as identityOAuthRepository from '../modules/identity/infrastructure/oauthRepository.js'
import { pool } from '../shared/infrastructure/database/pool.js'

// Phase 4 composition adapter. Persistence and provider implementations remain
// replaceable ports until their owning infrastructure is migrated in phases 5-6.
configureIdentityDatabase(pool)

configureIdentityPorts({
    ...identityRepository,
    ...identityOAuthRepository,
    getRoleByKeyRepo,
    getRankTier,
    storeUploadedAssetRepo,
})

configureIdentityPresentationPorts({
    passport,
    publishActivity: publishActivityEvent,
    sendRegistrationVerificationEmail,
    sendTemporaryPasswordEmail,
    sendVerificationEmail,
    verifyTurnstile,
})

configureIdentityApplication({
    registerUser: identityUseCases.registerUser,
    findPasswordLoginUser: identityUseCases.findPasswordLoginUser,
    confirmLogin: identityUseCases.confirmLogin,
    getSessionUser: identityUseCases.getSessionUser,
    getSocketUser: identityUseCases.getSocketUser,
    updateProfile: identityUseCases.updateProfile,
    updateAvatar: identityUseCases.updateAvatar,
    requestAccountEmailChange: identityUseCases.requestAccountEmailChange,
    changeUnverifiedEmail: identityUseCases.changeUnverifiedEmail,
    getVerificationMeta: identityUseCases.getVerificationMeta,
    verifyEmail: identityUseCases.verifyEmail,
    requestPasswordReset: identityUseCases.requestPasswordReset,
    getPasswordResetMeta: identityUseCases.getPasswordResetMeta,
    completePasswordReset: identityUseCases.completePasswordReset,
    updatePassword: identityUseCases.updatePassword,
    resendVerificationCode: identityUseCases.resendVerificationCode,
    ensurePendingVerification: identityUseCases.ensurePendingVerification,
    createAuthLog: identityUseCases.createAuthLog,
    getLoginHistory: identityUseCases.getLoginHistory,
    handleOAuthLogin: identityOAuthUseCases.handleOAuthLogin,
    getConnections: identityOAuthUseCases.getConnections,
    unlinkConnection: identityOAuthUseCases.unlinkConnection,
    setInitialPassword: identityOAuthUseCases.setInitialPassword,
})

// Temporary adapters: phases 4-19 replace these legacy modules one vertical slice at a time.
export const registerLegacyHttpModules = (app) => {
    app.use('/api/identity', identityRouter)
    app.use('/api/authentication', oauthCallbackRouter)
    app.use('/api/settings', settingsRouter)
    app.use('/api/matches', matchesRouter)
    app.use('/api/me', meRouter)
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
