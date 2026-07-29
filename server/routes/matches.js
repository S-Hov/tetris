import express from 'express'
import { checkAuth } from '../src/modules/identity/index.js'
import {
    getUserMatchDetails,
    getUserMatches,
    getUserSoloRecord,
    submitSoloResult,
} from '../controllers/matchesController.js'

const matchesRouter = express.Router()

matchesRouter.get('/', checkAuth, getUserMatches)
matchesRouter.get('/solo/record', checkAuth, getUserSoloRecord)
matchesRouter.post('/solo/results', checkAuth, submitSoloResult)
matchesRouter.get('/:matchId', checkAuth, getUserMatchDetails)

export default matchesRouter
