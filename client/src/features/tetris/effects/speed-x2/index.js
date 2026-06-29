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
    presentation: {
        accent: '#32f6ff',
        audio: {
            apply: {
                volume: 0.64,
                voices: [
                    {
                        duration: 0.42,
                        endFrequency: 760,
                        frequency: 180,
                        gain: 0.22,
                        type: 'sawtooth',
                    },
                    {
                        delay: 0.04,
                        duration: 0.28,
                        endFrequency: 1280,
                        frequency: 420,
                        gain: 0.12,
                        type: 'triangle',
                    },
                    {
                        delay: 0.13,
                        duration: 0.18,
                        endFrequency: 2200,
                        frequency: 1200,
                        gain: 0.055,
                        type: 'sine',
                    },
                ],
            },
        },
        boardEffect: 'speed-surge',
        icon: 'fa-gauge-high',
        label: 'Ускорение',
        theme: 'speed-surge',
    },
}
