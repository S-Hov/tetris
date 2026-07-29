import express from 'express'
import { createSupportRequest } from '../controllers/supportController.js'
import { optionalAuth } from '../src/modules/identity/index.js'
import { requireTurnstile } from '../middleware/requireTurnstile.js'

const feedbackRouter = express.Router()

feedbackRouter.post('/', optionalAuth, requireTurnstile, createSupportRequest)

export default feedbackRouter
