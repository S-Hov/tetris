import express from 'express'
import { analyticsAuth, trackPageView } from '../controllers/analyticsController.js'

const analyticsRouter = express.Router()

analyticsRouter.post('/page-view', analyticsAuth, trackPageView)

export default analyticsRouter
