import { normalizeNumber } from '../effectUtils.js'

export default {
    effectKey: 'invisible_cells',
    normalizeParameters: (parameters = {}) => ({
        hiddenModulo: normalizeNumber(parameters.hiddenModulo, 11, { min: 1 }),
        hiddenThreshold: normalizeNumber(parameters.hiddenThreshold, 3, { min: 0 }),
    }),
    presentation: (effect) => ({
        accent: '#32f6ff',
        audio: {
            apply: {
                volume: 0.62,
                voices: [
                    { type: 'triangle', frequency: 1280, endFrequency: 420, duration: 0.34, gain: 0.16 },
                    { type: 'sawtooth', frequency: 88, endFrequency: 46, duration: 0.28, gain: 0.12, delay: 0.02 },
                    { type: 'square', frequency: 720, endFrequency: 980, duration: 0.055, gain: 0.08, delay: 0.08 },
                    { type: 'sine', frequency: 2100, endFrequency: 1360, duration: 0.18, gain: 0.045, delay: 0.16 },
                ],
            },
        },
        boardEffect: 'signal-loss',
        icon: 'fa-eye-slash',
        invisibleCells: effect.parameters,
        label: 'Невидимые клетки',
        theme: 'signal-loss',
    }),
}
