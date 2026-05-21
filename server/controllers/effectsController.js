import { getActiveGameEffectsRepo, toClientEffect } from '../repositories/gameEffectsRepository.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const getGameEffects = asyncHandler(async (req, res) => {
    const effects = await getActiveGameEffectsRepo()

    res.json({
        success: true,
        message: 'Game effects loaded',
        data: {
            effects: effects.map(toClientEffect),
        },
    })
})
