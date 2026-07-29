import express from 'express'

import { badRequest } from '../../../../shared/responses/errors.js'
import { fail } from '../../../../shared/responses/send.js'
import { checkAuth, checkNotAuth, optionalAuth } from './authMiddleware.js'
import * as controller from './identity.controller.js'
import * as settingsController from './identitySettings.controller.js'
import { startOAuthLink, startOAuthLogin } from './oauth.controller.js'
import * as schemas from './identity.schemas.js'
import { identityPresentationPorts } from '../identityPresentationPorts.js'

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
        return next(badRequest('COMMON.BAD_REQUEST', {
            errors: result.error.issues.map(({ path, message }) => ({ path, message })),
        }))
    }
    req.body = result.data
    next()
}

const requireTurnstile = async (req, res, next) => {
    const valid = await identityPresentationPorts.verifyTurnstile(req.body?.turnstileToken, req.ip)
    if (!valid) {
        return fail(res, req, 'AUTH.TURNSTILE_FAILED', { status: 403 })
    }
    next()
}

export const identityRouter = express.Router()

identityRouter.post('/register', checkNotAuth, requireTurnstile, validate(schemas.registerSchema), controller.register)
identityRouter.post('/login', checkNotAuth, validate(schemas.loginSchema), controller.login)
identityRouter.post('/password/login', checkNotAuth, validate(schemas.loginSchema), controller.login)
identityRouter.get('/me', optionalAuth, controller.getMe)
identityRouter.patch('/me', checkAuth, controller.updateMe)
identityRouter.put('/me/avatar', checkAuth, express.raw({
    type: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'video/webm'],
    limit: '2mb',
}), controller.updateAvatar)
identityRouter.patch('/me/password', checkAuth, validate(schemas.updatePasswordSchema), controller.updatePassword)
identityRouter.post('/password/set', checkAuth, validate(schemas.setPasswordSchema), controller.setPassword)
identityRouter.post('/logout', optionalAuth, controller.logout)
identityRouter.get('/oauth/:provider', startOAuthLogin)
identityRouter.post('/connections/:provider/link', checkAuth, startOAuthLink)
identityRouter.get('/connections', checkAuth, settingsController.getConnections)
identityRouter.delete('/connections/:provider/unlink', checkAuth, settingsController.unlinkConnection)
identityRouter.patch('/account/email', checkAuth, validate(schemas.requestAccountEmailChangeSchema), settingsController.requestAccountEmailChange)
identityRouter.get('/account/login-history', checkAuth, settingsController.getLoginHistory)
identityRouter.post('/verify-email/:email', checkNotAuth, validate(schemas.verifyEmailSchema), controller.verifyEmail)
identityRouter.post('/change-unverified-email', checkNotAuth, validate(schemas.changeUnverifiedEmailSchema), controller.changeUnverifiedEmail)
identityRouter.post('/resend-verification-email', checkNotAuth, validate(schemas.resendVerificationEmailSchema), controller.resendVerificationEmail)
identityRouter.get('/verification-time/:email', checkNotAuth, controller.getVerificationMeta)
identityRouter.post('/password-reset', checkNotAuth, validate(schemas.requestPasswordResetSchema), controller.requestPasswordReset)
identityRouter.get('/password-reset/verification-time/:email', checkNotAuth, controller.getPasswordResetMeta)
identityRouter.post('/password-reset/verify/:email', checkNotAuth, validate(schemas.verifyEmailSchema), controller.completePasswordReset)
