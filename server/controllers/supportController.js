import { asyncHandler } from '../utils/asyncHandler.js'
import {
    createDonationService,
    createSupportRequestService,
    getDonationWalletsService,
    getUserSupportRequestDetailsService,
    getUserSupportRequestMessagesService,
    getUserSupportRequestsService,
} from '../services/supportService.js'
import { ok } from '../src/shared/responses/send.js'

export const createSupportRequest = asyncHandler(async (req, res) => {
    const data = await createSupportRequestService({
        userId: req.user?.id,
        body: req.body || {},
        headers: req.headers,
    })

    return ok(res, req, 'SUPPORT.CREATED', {
        status: 201,
        data,
        extra: {
            ticketId: data.ticketId,
            telegramUrl: data.telegramUrl,
        },
    })
})

export const getDonationWallets = asyncHandler(async (req, res) => {
    const data = await getDonationWalletsService()

    return ok(res, req, 'PAYMENT.DONATION_WALLETS_LOADED', {
        data,
    })
})

export const getMySupportRequests = asyncHandler(async (req, res) => {
    const data = await getUserSupportRequestsService(req.user.id)

    return ok(res, req, 'SUPPORT.LOADED', {
        data,
    })
})

export const getMySupportRequestDetails = asyncHandler(async (req, res) => {
    const data = await getUserSupportRequestDetailsService({
        userId: req.user.id,
        ticketId: req.params.ticketId,
    })

    return ok(res, req, 'SUPPORT.REQUEST_LOADED', {
        data,
    })
})

export const getMySupportRequestMessages = asyncHandler(async (req, res) => {
    const data = await getUserSupportRequestMessagesService({
        userId: req.user.id,
        ticketId: req.params.ticketId,
    })

    return ok(res, req, 'SUPPORT.MESSAGES_LOADED', {
        data,
    })
})

export const createDonation = asyncHandler(async (req, res) => {
    const data = await createDonationService({
        userId: req.user?.id,
        body: req.body || {},
    })

    return ok(res, req, 'PAYMENT.DONATION_CREATED', {
        status: 201,
        data,
    })
})
