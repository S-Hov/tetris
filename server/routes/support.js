import express from 'express'
import {
    createDonation,
    createSupportRequest,
    getDonationWallets,
} from '../controllers/supportController.js'
import { optionalAuth } from '../middleware/checkAuth.js'

const supportRouter = express.Router()

supportRouter.post('/requests', optionalAuth, createSupportRequest)
supportRouter.get('/donations/wallets', getDonationWallets)
supportRouter.post('/donations', optionalAuth, createDonation)

export default supportRouter
