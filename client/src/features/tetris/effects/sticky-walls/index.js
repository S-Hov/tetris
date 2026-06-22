import { touchesHorizontalWall } from '../effectUtils.js'

const horizontalActions = new Set(['moveLeft', 'moveRight'])

export default {
    effectKey: 'sticky_walls',
    normalizeParameters: (parameters = {}) => ({
        blockHorizontalAtWall: parameters.blockHorizontalAtWall !== false,
    }),
    beforeAction: ({ action, effect, state }) => ({
        blocked: effect.parameters.blockHorizontalAtWall &&
            horizontalActions.has(action) &&
            touchesHorizontalWall(state),
        feedback: 'wallImpact',
    }),
    presentation: {
        accent: '#a8ff3e',
        boardEffect: 'sticky-walls',
        icon: 'fa-grip-lines-vertical',
        label: 'Липкие стены',
        theme: 'sticky-walls',
        audio: {
            apply: {
                volume: 0.82,
                voices: [
                    { type: 'sawtooth', frequency: 118, endFrequency: 48, duration: 0.7, gain: 0.5 },
                    { type: 'square', frequency: 66, endFrequency: 36, duration: 0.48, gain: 0.22, delay: 0.08 },
                    { type: 'triangle', frequency: 420, endFrequency: 92, duration: 0.32, gain: 0.16, delay: 0.03 },
                ],
            },
            feedback: {
                volume: 0.5,
                voices: [
                    { type: 'square', frequency: 164, endFrequency: 70, duration: 0.16, gain: 0.3 },
                    { type: 'sawtooth', frequency: 92, endFrequency: 42, duration: 0.22, gain: 0.2, delay: 0.02 },
                ],
            },
        },
    },
}
