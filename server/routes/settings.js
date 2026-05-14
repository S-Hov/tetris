import express from 'express'
import { checkAuth } from '../middleware/checkAuth.js'
import { getConnections, unlinkConnection } from '../controllers/settingsController.js'
import { startOAuthLink } from '../controllers/oauthController.js'

const settingsRouter = express.Router()

settingsRouter.get('/connections', checkAuth, getConnections)

settingsRouter.post('/connections/:provider/link', checkAuth, startOAuthLink)

settingsRouter.delete('/connections/:provider/unlink', checkAuth, unlinkConnection)

export default settingsRouter
