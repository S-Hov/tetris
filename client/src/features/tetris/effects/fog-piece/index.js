export default {
    effectKey: 'fog_piece',
    normalizeParameters: () => ({}),
    presentation: {
        accent: '#04f7ff',
        fogPiece: true,
        icon: 'fa-eye-slash',
        label: 'Слепая следующая',
        screenEffect: 'fog-piece',
        theme: 'fog-piece',
        audio: {
            apply: {
                volume: 0.58,
                voices: [
                    { type: 'sine', frequency: 190, endFrequency: 82, duration: 0.52, gain: 0.26 },
                    { type: 'triangle', frequency: 760, endFrequency: 330, duration: 0.42, gain: 0.12, delay: 0.04 },
                    { type: 'sawtooth', frequency: 58, endFrequency: 36, duration: 0.72, gain: 0.1, delay: 0.08 },
                    { type: 'sine', frequency: 1380, endFrequency: 940, duration: 0.28, gain: 0.045, delay: 0.18 },
                ],
            },
        },
    },
}
