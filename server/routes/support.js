import express from 'express'
import {
    createDonation,
    createSupportRequest,
    getDonationWallets,
    getMySupportRequestDetails,
    getMySupportRequestMessages,
    getMySupportRequests,
} from '../controllers/supportController.js'
import { checkAuth, optionalAuth } from '../src/modules/identity/index.js'
import { requireTurnstile } from '../middleware/requireTurnstile.js'

const supportRouter = express.Router()

supportRouter.post('/requests', optionalAuth, requireTurnstile, createSupportRequest)
supportRouter.get('/requests/my', checkAuth, getMySupportRequests)
supportRouter.get('/requests/my/:ticketId', checkAuth, getMySupportRequestDetails)
supportRouter.get('/requests/my/:ticketId/messages', checkAuth, getMySupportRequestMessages)
supportRouter.get('/donations/wallets', getDonationWallets)
supportRouter.post('/donations', optionalAuth, requireTurnstile, createDonation)

export default supportRouter
