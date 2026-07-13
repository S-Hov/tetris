import express from 'express'

import { getPublicUserProfile, getUserActions } from '../controllers/usersController.js'
import { optionalAuth } from '../middleware/checkAuth.js'

const usersRouter = express.Router()

usersRouter.get('/:userId/actions', optionalAuth, getUserActions)
usersRouter.get('/:userId/profile', optionalAuth, getPublicUserProfile)

export default usersRouter
