import express from 'express'
import {
    createDonation,
    createSupportRequest,
    getDonationWallets,
} from '../controllers/supportController.js'
import { optionalAuth } from '../middleware/checkAuth.js'
import { requireTurnstile } from '../middleware/requireTurnstile.js'

const supportRouter = express.Router()

supportRouter.post('/requests', optionalAuth, requireTurnstile, createSupportRequest)
supportRouter.get('/donations/wallets', getDonationWallets)
supportRouter.post('/donations', optionalAuth, requireTurnstile, createDonation)

export default supportRouter
