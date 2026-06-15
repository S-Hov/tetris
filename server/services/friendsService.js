import { badRequest, notFound } from '../helpers/error.helper.js'
import {
    createFriendRequestRepo,
    findFriendCandidateByIdRepo,
    getAcceptedFriendIdsRepo,
    getFriendsRepo,
    getIncomingFriendRequestsRepo,
    respondFriendRequestRepo,
} from '../repositories/friendsRepository.js'
import { getRankTier } from './rankRules.js'

export const getFriendsService = async (userId) => {
    const rows = await getFriendsRepo(userId)

    return Promise.all(rows.map(mapFriendRow))
}

export const getIncomingFriendRequestsService = async (userId) => {
    const rows = await getIncomingFriendRequestsRepo(userId)
    const requests = await Promise.all(rows.map(mapFriendRow))

    return requests.map((request, index) => ({
        ...request,
        requestId: rows[index].request_id,
        requestedAt: rows[index].requested_at,
    }))
}

export const getFriendsStateService = async (userId) => {
    const [friends, requests] = await Promise.all([
        getFriendsService(userId),
        getIncomingFriendRequestsService(userId),
    ])

    return {
        friends,
        requests,
        requestsCount: requests.length,
        userId,
    }
}

export const getAcceptedFriendIdsService = async (userId) => {
    return await getAcceptedFriendIdsRepo(userId)
}

export const findFriendCandidateService = async ({ currentUserId, targetUserId }) => {
    const normalizedTargetUserId = Number(targetUserId)

    if (!Number.isInteger(normalizedTargetUserId) || normalizedTargetUserId <= 0) {
        throw badRequest('FRIENDS.INVALID_USER_ID')
    }

    const row = await findFriendCandidateByIdRepo({
        currentUserId,
        targetUserId: normalizedTargetUserId,
    })

    if (!row) {
        throw notFound('FRIENDS.USER_NOT_FOUND')
    }

    const candidate = await mapFriendRow(row)

    return {
        ...candidate,
        friendshipId: row.friendship_id,
        friendshipStatus: row.friendship_status || null,
        isOutgoingRequest: row.friendship_status === 'pending' && row.requester_id === currentUserId,
        isIncomingRequest: row.friendship_status === 'pending' && row.addressee_id === currentUserId,
        isSelf: normalizedTargetUserId === currentUserId,
    }
}

export const createFriendRequestService = async ({ requesterId, addresseeId }) => {
    const normalizedAddresseeId = Number(addresseeId)

    if (!Number.isInteger(normalizedAddresseeId) || normalizedAddresseeId <= 0) {
        throw badRequest('FRIENDS.INVALID_USER_ID')
    }

    if (requesterId === normalizedAddresseeId) {
        throw badRequest('FRIENDS.CANNOT_ADD_SELF')
    }

    try {
        const request = await createFriendRequestRepo({
            requesterId,
            addresseeId: normalizedAddresseeId,
        })

        if (!request) {
            throw badRequest('FRIENDS.REQUESTS_DISABLED')
        }

        return request
    } catch (error) {
        if (error?.code === '23505') {
            throw badRequest('FRIENDS.REQUEST_ALREADY_EXISTS')
        }

        throw error
    }
}

export const respondFriendRequestService = async ({ userId, requestId, action }) => {
    const normalizedRequestId = Number(requestId)

    if (!Number.isInteger(normalizedRequestId) || normalizedRequestId <= 0) {
        throw badRequest('FRIENDS.INVALID_REQUEST_ID')
    }

    const status = action === 'accept'
        ? 'accepted'
        : action === 'decline'
            ? 'declined'
            : null

    if (!status) {
        throw badRequest('FRIENDS.INVALID_REQUEST_ACTION')
    }

    const request = await respondFriendRequestRepo({
        userId,
        requestId: normalizedRequestId,
        status,
    })

    if (!request) {
        throw notFound('FRIENDS.REQUEST_NOT_FOUND')
    }

    return request
}

const mapFriendRow = async (row) => {
    const rank = await getRankTier(Number(row.rank_points) || 0)

    return {
        id: row.id,
        username: row.username,
        avatarUrl: row.avatar_url,
        isOnline: Boolean(row.is_online),
        friendsSince: row.friends_since,
        rank,
        rankStats: {
            rankPoints: Number(row.rank_points) || 0,
            mmr: Number(row.mmr) || 1000,
            wins: Number(row.wins) || 0,
            losses: Number(row.losses) || 0,
            totalMatches: Number(row.total_matches) || 0,
        },
    }
}
