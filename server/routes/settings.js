import express from 'express'
import { checkAuth } from '../middleware/checkAuth.js'
import {
    getConnections,
    getLoginHistory,
    requestAccountEmailChange,
    unlinkConnection,
} from '../controllers/settingsController.js'
import { startOAuthLink } from '../controllers/oauthController.js'
import { validate } from '../middleware/validateAuth.js'
import { requestAccountEmailChangeSchema } from '../validations/auth.validation.js'

const settingsRouter = express.Router()

settingsRouter.get('/connections', checkAuth, getConnections)

settingsRouter.post('/connections/:provider/link', checkAuth, startOAuthLink)

settingsRouter.delete('/connections/:provider/unlink', checkAuth, unlinkConnection)

settingsRouter.patch('/account/email', checkAuth, validate(requestAccountEmailChangeSchema), requestAccountEmailChange)

settingsRouter.get('/account/login-history', checkAuth, getLoginHistory)

export default settingsRouter
