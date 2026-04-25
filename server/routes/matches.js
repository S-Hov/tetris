import express from 'express'
import { checkAuth } from '../middleware/checkAuth.js'
import {
    getUserMatchDetails,
    getUserMatches,
} from '../controllers/matchesController.js'

const matchesRouter = express.Router()

matchesRouter.get('/', checkAuth, getUserMatches)
matchesRouter.get('/:matchId', checkAuth, getUserMatchDetails)

export default matchesRouter
