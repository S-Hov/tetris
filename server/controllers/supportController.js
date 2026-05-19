import { asyncHandler } from '../utils/asyncHandler.js'
import {
    createDonationService,
    createSupportRequestService,
    getDonationWalletsService,
    getUserSupportRequestDetailsService,
    getUserSupportRequestMessagesService,
    getUserSupportRequestsService,
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

export const getMySupportRequests = asyncHandler(async (req, res) => {
    const data = await getUserSupportRequestsService(req.user.id)

    res.json({
        success: true,
        message: 'Support requests loaded',
        data,
    })
})

export const getMySupportRequestDetails = asyncHandler(async (req, res) => {
    const data = await getUserSupportRequestDetailsService({
        userId: req.user.id,
        ticketId: req.params.ticketId,
    })

    res.json({
        success: true,
        message: 'Support request loaded',
        data,
    })
})

export const getMySupportRequestMessages = asyncHandler(async (req, res) => {
    const data = await getUserSupportRequestMessagesService({
        userId: req.user.id,
        ticketId: req.params.ticketId,
    })

    res.json({
        success: true,
        message: 'Support messages loaded',
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
