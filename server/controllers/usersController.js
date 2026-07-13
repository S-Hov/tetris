import {
    getPublicUserProfileService,
    getUserActionsService,
} from '../services/privacyService.js'
import { ok } from '../src/shared/responses/send.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const getUserActions = asyncHandler(async (req, res) => {
    const result = await getUserActionsService({
        viewerId: req.user?.id || null,
        targetUserId: req.params.userId,
    })

    return ok(res, req, 'USERS.ACTIONS_LOADED', {
        data: result,
    })
})

export const getPublicUserProfile = asyncHandler(async (req, res) => {
    const profile = await getPublicUserProfileService({
        viewerId: req.user?.id || null,
        targetUserId: req.params.userId,
    })

    return ok(res, req, 'USERS.PROFILE_LOADED', {
        data: { profile },
    })
})
