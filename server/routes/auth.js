import express from 'express'
import { checkNotAuth } from '../middleware/checkAuth'
import { register } from '../controllers/authController'


const authRouter = express.Router()

authRouter.post('/register', checkNotAuth, register)

authRouter.post('/login', checkNotAuth)

authRouter.post('/verify-email/:email', checkNotAuth)

authRouter.post('resend-verification-email', checkNotAuth)

authRouter.get('/verification-time/:email', checkNotAuth)

export default authRouter