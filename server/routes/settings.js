import express from 'express'
import { checkAuth } from '../src/modules/identity/index.js'
import {
    getPrivacySettings,
    updatePrivacySettings,
} from '../controllers/settingsController.js'
import { validate } from '../middleware/validateAuth.js'
import { updatePrivacySettingsSchema } from '../validations/privacy.validation.js'

const settingsRouter = express.Router()

settingsRouter.get('/privacy', checkAuth, getPrivacySettings)

settingsRouter.patch('/privacy', checkAuth, validate(updatePrivacySettingsSchema), updatePrivacySettings)

export default settingsRouter
