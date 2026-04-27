import express from 'express'
import { getLeaderboard } from '../controllers/leaderboardController.js'

const leaderboardRouter = express.Router()

leaderboardRouter.get('/', getLeaderboard)

export default leaderboardRouter