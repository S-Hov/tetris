import { normalizeNumber } from '../effectUtils.js'

export default {
    effectKey: 'delay_input',
    normalizeParameters: (parameters = {}) => ({
        inputDelayMs: normalizeNumber(parameters.inputDelayMs, 150, { min: 0 }),
    }),
    beforeAction: ({ effect }) => ({
        delayMs: effect.parameters.inputDelayMs,
    }),
    presentation: {},
}
