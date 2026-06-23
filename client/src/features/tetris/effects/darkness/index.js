export default {
    effectKey: 'darkness',
    normalizeParameters: () => ({}),
    presentation: {
        accent: '#6f7dff',
        icon: 'fa-moon',
        label: 'Тьма',
        screenEffect: 'darkness-clouds',
        theme: 'darkness',
        audio: {
            apply: {
                volume: 0.86,
                voices: [
                    { type: 'sine', frequency: 72, endFrequency: 31, duration: 1.18, gain: 0.42 },
                    { type: 'sawtooth', frequency: 46, endFrequency: 24, duration: 0.9, gain: 0.18, delay: 0.08 },
                    { type: 'triangle', frequency: 520, endFrequency: 135, duration: 0.64, gain: 0.08, delay: 0.04 },
                    { type: 'sine', frequency: 980, endFrequency: 410, duration: 0.42, gain: 0.045, delay: 0.18 },
                ],
            },
        },
    },
}
