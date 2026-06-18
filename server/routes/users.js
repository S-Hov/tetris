import express from 'express'

import { getUserActions } from '../controllers/usersController.js'
import { optionalAuth } from '../middleware/checkAuth.js'

const usersRouter = express.Router()

usersRouter.get('/:userId/actions', optionalAuth, getUserActions)

export default usersRouter
