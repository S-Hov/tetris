import express from 'express'
import { createSupportRequest } from '../controllers/supportController.js'
import { optionalAuth } from '../middleware/checkAuth.js'

const feedbackRouter = express.Router()

feedbackRouter.post('/', optionalAuth, createSupportRequest)

export default feedbackRouter
