import { asyncHandler } from '../utils/asyncHandler.js'
import {
    createDonationService,
    createSupportRequestService,
    getDonationWalletsService,
} from '../services/supportService.js'

export const createSupportRequest = asyncHandler(async (req, res) => {
    const data = await createSupportRequestService({
        userId: req.user?.id,
        body: req.body || {},
        headers: req.headers,
    })

    res.status(201).json({
        success: true,
        message: 'Support request created',
        ticketId: data.ticketId,
        telegramUrl: data.telegramUrl,
        data,
    })
})

export const getDonationWallets = asyncHandler(async (req, res) => {
    const data = await getDonationWalletsService()

    res.json({
        success: true,
        message: 'Donation wallets loaded',
        data,
    })
})

export const createDonation = asyncHandler(async (req, res) => {
    const data = await createDonationService({
        userId: req.user?.id,
        body: req.body || {},
    })

    res.status(201).json({
        success: true,
        message: 'Donation created',
        data,
    })
})
