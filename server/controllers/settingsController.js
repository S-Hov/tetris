import { asyncHandler } from '../src/shared/presentation/http/asyncHandler.js'
import {
    getPrivacySettingsService,
    updatePrivacySettingsService,
} from '../services/privacyService.js'
import { ok } from '../src/shared/responses/send.js'

export const getPrivacySettings = asyncHandler(async (req, res) => {
    const settings = await getPrivacySettingsService(req.user.id)

    return ok(res, req, 'PRIVACY.LOADED', {
        data: { settings },
    })
})

export const updatePrivacySettings = asyncHandler(async (req, res) => {
    const settings = await updatePrivacySettingsService({
        userId: req.user.id,
        updates: req.body,
    })

    return ok(res, req, 'PRIVACY.UPDATED', {
        data: { settings },
    })
})
