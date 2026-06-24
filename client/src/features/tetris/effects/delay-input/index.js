import { normalizeNumber } from '../effectUtils.js'

export default {
    effectKey: 'delay_input',
    normalizeParameters: (parameters = {}) => ({
        inputDelayMs: normalizeNumber(parameters.inputDelayMs, 150, { min: 0 }),
    }),
    beforeAction: ({ effect }) => ({
        delayMs: effect.parameters.inputDelayMs,
        feedback: 'inputDelay',
    }),
    presentation: {
        accent: '#7ad7ff',
        boardEffect: 'delay-input',
        icon: 'fa-hourglass-half',
        label: 'Задержка ввода',
        theme: 'delay-input',
        audio: {
            apply: {
                volume: 0.52,
                voices: [
                    { type: 'sawtooth', frequency: 92, endFrequency: 42, duration: 0.46, gain: 0.24 },
                    { type: 'triangle', frequency: 620, endFrequency: 210, duration: 0.22, gain: 0.12, delay: 0.05 },
                    { type: 'sine', frequency: 1280, endFrequency: 760, duration: 0.16, gain: 0.055, delay: 0.16 },
                ],
            },
            feedback: {
                volume: 0.28,
                voices: [
                    { type: 'square', frequency: 760, endFrequency: 330, duration: 0.08, gain: 0.14 },
                    { type: 'triangle', frequency: 190, endFrequency: 92, duration: 0.12, gain: 0.09, delay: 0.02 },
                ],
            },
        },
    },
}
