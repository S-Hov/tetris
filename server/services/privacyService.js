import { badRequest, notFound } from '../helpers/error.helper.js'
import {
    getUserActionContextRepo,
    getUserPrivacySettingsRepo,
    updateUserPrivacySettingsRepo,
} from '../repositories/privacyRepository.js'

export const PRIVACY_VISIBILITIES = ['public', 'friends', 'private']

const isAllowed = (
    visibility,
    {
        allowGuest = false,
        isAuthenticated,
        isFriend,
        hasMutualFriend = false,
        isSelf = false,
        useMutualFriend = false,
    }
) => {
    if (isSelf) {
        return true
    }

    if (visibility === 'public') {
        return allowGuest || isAuthenticated
    }

    if (visibility === 'friends') {
        return useMutualFriend ? hasMutualFriend : isFriend
    }

    return false
}

const createAction = ({ allowed, available = true, reason = null }) => ({
    visible: Boolean(allowed),
    enabled: Boolean(allowed && available),
    reason: allowed && !available ? reason : allowed ? null : 'PRIVACY_RESTRICTED',
})

export const getPrivacySettingsService = async (userId) => {
    return await getUserPrivacySettingsRepo(userId)
}

export const updatePrivacySettingsService = async ({ userId, updates }) => {
    const invalidValue = Object.values(updates).find((value) => !PRIVACY_VISIBILITIES.includes(value))

    if (invalidValue) {
        throw badRequest('PRIVACY.INVALID_VISIBILITY')
    }

    return await updateUserPrivacySettingsRepo({ userId, updates })
}

export const getUserActionsService = async ({ viewerId, targetUserId }) => {
    const normalizedTargetUserId = Number(targetUserId)
    const normalizedViewerId = Number(viewerId)

    if (!Number.isInteger(normalizedTargetUserId) || normalizedTargetUserId <= 0) {
        throw badRequest('FRIENDS.INVALID_USER_ID')
    }

    const context = await getUserActionContextRepo({
        viewerId: Number.isInteger(normalizedViewerId) ? normalizedViewerId : 0,
        targetUserId: normalizedTargetUserId,
    })

    if (!context) {
        throw notFound('FRIENDS.USER_NOT_FOUND')
    }

    const isAuthenticated = Number.isInteger(normalizedViewerId) && normalizedViewerId > 0
    const isSelf = isAuthenticated && normalizedViewerId === normalizedTargetUserId
    const isFriend = context.relationship_status === 'accepted'
    const isBlocked = context.relationship_status === 'blocked'
    const baseContext = {
        isAuthenticated,
        isFriend,
        isSelf,
        hasMutualFriend: Boolean(context.has_mutual_friend),
    }
    const canInteract = !isSelf && !isBlocked
    const profileAllowed = !isBlocked && isAllowed(context.profile_visibility, {
        ...baseContext,
        allowGuest: true,
    })
    const friendRequestAllowed = canInteract &&
        !context.relationship_status &&
        isAllowed(context.friend_requests_visibility, {
            ...baseContext,
            useMutualFriend: true,
        })
    const roomInviteAllowed = canInteract && isAllowed(context.room_invites_visibility, baseContext)
    const matchInviteAllowed = canInteract && isAllowed(context.match_invites_visibility, baseContext)
    const messageAllowed = canInteract && isAllowed(context.messages_visibility, baseContext)
    const clubInviteAllowed = canInteract && isAllowed(context.club_invites_visibility, baseContext)
    const roomInviteAvailable = Boolean(context.is_online) && !context.is_in_game

    return {
        user: {
            id: context.id,
            username: context.username,
            avatarUrl: context.avatar_url,
            isOnline: Boolean(context.is_online),
            isInGame: Boolean(context.is_in_game),
        },
        actions: {
            roomInvite: createAction({
                allowed: roomInviteAllowed && roomInviteAvailable,
                available: roomInviteAvailable,
                reason: context.is_in_game ? 'USER_IN_GAME' : 'USER_OFFLINE',
            }),
            matchInvite: createAction({
                allowed: matchInviteAllowed,
                available: false,
                reason: 'FEATURE_NOT_AVAILABLE',
            }),
            message: createAction({
                allowed: messageAllowed,
                available: true,
            }),
            profile: createAction({
                allowed: profileAllowed,
                available: false,
                reason: 'FEATURE_NOT_AVAILABLE',
            }),
            friendRequest: createAction({
                allowed: friendRequestAllowed,
                available: true,
            }),
            clubInvite: createAction({
                allowed: clubInviteAllowed,
                available: false,
                reason: 'FEATURE_NOT_AVAILABLE',
            }),
        },
        relationship: {
            status: context.relationship_status || null,
            isFriend,
            isBlocked,
        },
    }
}

export const canSendFriendRequestService = async ({ requesterId, addresseeId }) => {
    const result = await getUserActionsService({
        viewerId: requesterId,
        targetUserId: addresseeId,
    })

    return {
        allowed: result.actions.friendRequest.visible,
        relationshipStatus: result.relationship.status,
    }
}

export const canInviteUserToRoomService = async ({ inviterId, inviteeId }) => {
    const context = await getUserActionContextRepo({
        viewerId: inviterId,
        targetUserId: inviteeId,
    })

    if (!context || context.relationship_status === 'blocked' || inviterId === inviteeId) {
        return false
    }

    return isAllowed(context.room_invites_visibility, {
        isAuthenticated: true,
        isFriend: context.relationship_status === 'accepted',
        isSelf: false,
    })
}
