import { normalizeNumber } from '../effectUtils.js'

export default {
    effectKey: 'random_rotation',
    normalizeParameters: (parameters = {}) => ({
        chance: normalizeNumber(parameters.chance, 0.3, { min: 0, max: 1 }),
        intervalMs: normalizeNumber(parameters.intervalMs, 500, { min: 50 }),
    }),
    timedIntervalMs: (effect) => effect.parameters.intervalMs,
    timedAction: (state, effect, { now = Date.now(), random = Math.random, rotate }) => {
        if (random() >= effect.parameters.chance) {
            return state
        }

        const nextState = rotate(state)

        if (nextState === state) {
            return state
        }

        return {
            ...nextState,
            effectFeedback: {
                effectKey: effect.effectKey,
                occurredAt: now,
                sequence: (nextState.effectFeedback?.sequence || 0) + 1,
                type: 'rotationPulse',
            },
        }
    },
    presentation: {
        accent: '#ff4df0',
        boardEffect: 'random-rotation',
        icon: 'fa-arrows-rotate',
        label: 'Случайный поворот',
        theme: 'random-rotation',
        audio: {
            apply: {
                volume: 0.68,
                voices: [
                    { type: 'triangle', frequency: 188, endFrequency: 740, duration: 0.42, gain: 0.22 },
                    { type: 'square', frequency: 58, endFrequency: 96, duration: 0.34, gain: 0.16, delay: 0.04 },
                    { type: 'sine', frequency: 1220, endFrequency: 520, duration: 0.22, gain: 0.08, delay: 0.13 },
                ],
            },
            feedback: {
                volume: 0.42,
                voices: [
                    { type: 'square', frequency: 860, endFrequency: 260, duration: 0.075, gain: 0.18 },
                    { type: 'triangle', frequency: 220, endFrequency: 680, duration: 0.09, gain: 0.1, delay: 0.018 },
                ],
            },
        },
    },
}
