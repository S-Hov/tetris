import {
    createFriendRequestService,
    findFriendCandidateService,
    getFriendsService,
    getIncomingFriendRequestsService,
    respondFriendRequestService,
} from '../services/friendsService.js'
import { ok } from '../src/shared/responses/send.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const getFriends = asyncHandler(async (req, res) => {
    const friends = await getFriendsService(req.user.id)

    return ok(res, req, 'FRIENDS.LOADED', {
        data: { friends },
    })
})

export const getIncomingRequests = asyncHandler(async (req, res) => {
    const requests = await getIncomingFriendRequestsService(req.user.id)

    return ok(res, req, 'FRIENDS.REQUESTS_LOADED', {
        data: { requests },
    })
})

export const findFriendCandidate = asyncHandler(async (req, res) => {
    const user = await findFriendCandidateService({
        currentUserId: req.user.id,
        targetUserId: req.params.userId,
    })

    return ok(res, req, 'FRIENDS.USER_FOUND', {
        data: { user },
    })
})

export const createFriendRequest = asyncHandler(async (req, res) => {
    const request = await createFriendRequestService({
        requesterId: req.user.id,
        addresseeId: req.body?.addresseeId,
    })

    return ok(res, req, 'FRIENDS.REQUEST_SENT', {
        status: 201,
        data: { request },
    })
})

export const respondFriendRequest = asyncHandler(async (req, res) => {
    const request = await respondFriendRequestService({
        userId: req.user.id,
        requestId: req.params.requestId,
        action: req.body?.action,
    })

    return ok(res, req, 'FRIENDS.REQUEST_UPDATED', {
        data: { request },
    })
})
