import { normalizeNumber } from '../effectUtils.js'

export default {
    effectKey: 'speed_x2_for_4s',
    normalizeParameters: (parameters = {}) => ({
        speedMultiplier: normalizeNumber(parameters.speedMultiplier, 2, { min: 1 }),
    }),
    modifyDerivedState: (derivedState, effect) => ({
        ...derivedState,
        effectSpeedMultiplier: Math.max(
            derivedState.effectSpeedMultiplier || 1,
            effect.parameters.speedMultiplier
        ),
    }),
    presentation: {},
}
