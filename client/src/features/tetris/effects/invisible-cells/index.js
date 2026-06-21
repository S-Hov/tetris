import { normalizeNumber } from '../effectUtils.js'

export default {
    effectKey: 'invisible_cells',
    normalizeParameters: (parameters = {}) => ({
        hiddenModulo: normalizeNumber(parameters.hiddenModulo, 11, { min: 1 }),
        hiddenThreshold: normalizeNumber(parameters.hiddenThreshold, 3, { min: 0 }),
    }),
    presentation: (effect) => ({
        invisibleCells: effect.parameters,
    }),
}
