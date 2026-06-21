import { normalizeNumber } from '../effectUtils.js'

export default {
    effectKey: 'random_rotation',
    normalizeParameters: (parameters = {}) => ({
        chance: normalizeNumber(parameters.chance, 0.3, { min: 0, max: 1 }),
        intervalMs: normalizeNumber(parameters.intervalMs, 500, { min: 50 }),
    }),
    timedIntervalMs: (effect) => effect.parameters.intervalMs,
    timedAction: (state, effect, { random = Math.random, rotate }) => (
        random() < effect.parameters.chance ? rotate(state) : state
    ),
    presentation: {},
}
