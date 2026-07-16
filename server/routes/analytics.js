import express from 'express'
import { analyticsAuth, getPublicStats, trackPageView } from '../controllers/analyticsController.js'

const analyticsRouter = express.Router()

analyticsRouter.get('/public-stats', getPublicStats)
analyticsRouter.post('/page-view', analyticsAuth, trackPageView)

export default analyticsRouter
