import express from 'express'
import { checkAuth, checkNotAuth, optionalAuth } from '../middleware/checkAuth.js'
import {
    changeUnverifiedEmail,
    completePasswordReset,
    getPasswordResetMeta,
    getVerificationMeta,
    getMe,
    login,
    logout,
    register,
    requestPasswordReset,
    resendVerificationEmail,
    setPassword,
    updateAvatar,
    updateMe,
    updatePassword,
    verifyEmail,
} from '../controllers/authController.js'
import {
    handleOAuthCallback,
    startOAuthLogin,
} from '../controllers/oauthController.js'
import { validate } from '../middleware/validateAuth.js'
import {
    changeUnverifiedEmailSchema,
    loginSchema,
    registerSchema,
    requestPasswordResetSchema,
    resendVerificationEmailSchema,
    setPasswordSchema,
    updatePasswordSchema,
    verifyEmailSchema,
} from '../validations/auth.validation.js'


const authRouter = express.Router()

authRouter.post('/register', checkNotAuth, validate(registerSchema), register)

authRouter.post('/login', checkNotAuth, validate(loginSchema), login)

authRouter.post('/password/login', checkNotAuth, validate(loginSchema), login)

authRouter.get('/me', optionalAuth, getMe)

authRouter.patch('/me', checkAuth, updateMe)

authRouter.patch('/me/password', checkAuth, validate(updatePasswordSchema), updatePassword)

authRouter.post('/password/set', checkAuth, validate(setPasswordSchema), setPassword)

authRouter.put(
    '/me/avatar',
    checkAuth,
    express.raw({
        type: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'video/webm'],
        limit: '2mb',
    }),
    updateAvatar
)

authRouter.post('/logout', optionalAuth, logout)

authRouter.get('/:provider/callback', handleOAuthCallback)

authRouter.get('/:provider', startOAuthLogin)

authRouter.post('/verify-email/:email', checkNotAuth, validate(verifyEmailSchema), verifyEmail)

authRouter.post('/change-unverified-email', checkNotAuth, validate(changeUnverifiedEmailSchema), changeUnverifiedEmail)

authRouter.post('/resend-verification-email', checkNotAuth, validate(resendVerificationEmailSchema), resendVerificationEmail)

authRouter.get('/verification-time/:email', checkNotAuth, getVerificationMeta)

authRouter.post('/password-reset', checkNotAuth, validate(requestPasswordResetSchema), requestPasswordReset)

authRouter.get('/password-reset/verification-time/:email', checkNotAuth, getPasswordResetMeta)

authRouter.post('/password-reset/verify/:email', checkNotAuth, validate(verifyEmailSchema), completePasswordReset)

export default authRouter
