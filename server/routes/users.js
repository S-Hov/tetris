import express from 'express'

import { getPublicUserProfile, getUserActions } from '../controllers/usersController.js'
import { optionalAuth } from '../src/modules/identity/index.js'

const usersRouter = express.Router()

usersRouter.get('/:userId/actions', optionalAuth, getUserActions)
usersRouter.get('/:userId/profile', optionalAuth, getPublicUserProfile)

export default usersRouter
