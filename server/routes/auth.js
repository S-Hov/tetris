import express from 'express'
import { checkNotAuth, optionalAuth } from '../middleware/checkAuth.js'
import {
    getVerificationMeta,
    getMe,
    login,
    logout,
    register,
    resendVerificationEmail,
    verifyEmail,
} from '../controllers/authController.js'
import { validate } from '../middleware/validateAuth.js'
import {
    loginSchema,
    registerSchema,
    resendVerificationEmailSchema,
    verifyEmailSchema,
} from '../validations/auth.validation.js'


const authRouter = express.Router()

authRouter.post('/register', checkNotAuth, validate(registerSchema), register)

authRouter.post('/login', checkNotAuth, validate(loginSchema), login)

authRouter.get('/me', optionalAuth, getMe)

authRouter.post('/logout', optionalAuth, logout)

authRouter.post('/verify-email/:email', checkNotAuth, validate(verifyEmailSchema), verifyEmail)

authRouter.post('/resend-verification-email', checkNotAuth, validate(resendVerificationEmailSchema), resendVerificationEmail)

authRouter.get('/verification-time/:email', checkNotAuth, getVerificationMeta)

export default authRouter
