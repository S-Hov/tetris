export default {
    effectKey: 'screen_shake',
    normalizeParameters: () => ({}),
    presentation: {
        accent: '#ffcf5a',
        boardEffect: 'screen-shake',
        icon: 'fa-wave-square',
        label: 'Тряска',
        screenShake: true,
        theme: 'screen-shake',
        audio: {
            apply: {
                volume: 0.72,
                voices: [
                    { type: 'sawtooth', frequency: 72, endFrequency: 34, duration: 0.58, gain: 0.34 },
                    { type: 'square', frequency: 46, endFrequency: 30, duration: 0.42, gain: 0.18, delay: 0.04 },
                    { type: 'triangle', frequency: 560, endFrequency: 120, duration: 0.16, gain: 0.1, delay: 0.02 },
                    { type: 'square', frequency: 920, endFrequency: 480, duration: 0.08, gain: 0.055, delay: 0.12 },
                ],
            },
        },
    },
}
