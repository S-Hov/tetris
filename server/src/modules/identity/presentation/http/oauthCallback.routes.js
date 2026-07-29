import express from 'express'

import { handleOAuthCallback } from './oauth.controller.js'

// Canonical endpoint registered at external OAuth providers; intentionally keeps its old URL.
export const oauthCallbackRouter = express.Router()
oauthCallbackRouter.get('/:provider/callback', handleOAuthCallback)
