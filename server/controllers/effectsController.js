import { getActiveGameEffectsRepo, toClientEffect } from '../repositories/gameEffectsRepository.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ok } from '../src/shared/responses/send.js'

export const getGameEffects = asyncHandler(async (req, res) => {
    const effects = await getActiveGameEffectsRepo()

    return ok(res, req, 'EFFECTS.LOADED', {
        data: {
            effects: effects.map(toClientEffect),
        },
    })
})
