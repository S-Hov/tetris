import express from 'express'
import { checkNotAuth } from '../middleware/checkAuth.js'
import { register } from '../controllers/authController.js'
import { validate } from '../middleware/validateAuth.js'
import { registerSchema } from '../validations/auth.validation.js'


const authRouter = express.Router()

authRouter.post('/register', checkNotAuth, validate(registerSchema), register)

authRouter.post('/login', checkNotAuth)

authRouter.post('/verify-email/:email', checkNotAuth)

authRouter.post('/resend-verification-email', checkNotAuth)

authRouter.get('/verification-time/:email', checkNotAuth)

export default authRouter