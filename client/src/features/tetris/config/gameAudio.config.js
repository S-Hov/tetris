export const GAME_AUDIO_CONFIG = {
    enabled: true,
    stopMusicOnCountdownStart: true,
    effects: {
        countdown: {
            enabled: true,
            volume: 0.76,
        },
        gameFound: {
            enabled: true,
            volume: 0.82,
        },
        hardDrop: {
            enabled: true,
            volume: 0.72,
        },
        lose: {
            enabled: true,
            volume: 0.9,
        },
        move: {
            enabled: true,
            volume: 0.28,
            synth: {
                voices: [
                    { type: 'square', frequency: 420, endFrequency: 255, duration: 0.045, gain: 0.16 },
                    { type: 'triangle', frequency: 880, endFrequency: 620, duration: 0.035, gain: 0.07, delay: 0.006 },
                ],
            },
        },
        rotate: {
            enabled: true,
            volume: 0.34,
            synth: {
                voices: [
                    { type: 'triangle', frequency: 340, endFrequency: 860, duration: 0.085, gain: 0.18 },
                    { type: 'square', frequency: 1040, endFrequency: 580, duration: 0.055, gain: 0.08, delay: 0.025 },
                    { type: 'sine', frequency: 1500, endFrequency: 1180, duration: 0.08, gain: 0.045, delay: 0.018 },
                ],
            },
        },
        softDrop: {
            enabled: true,
            volume: 0.16,
            synth: {
                voices: [
                    { type: 'sawtooth', frequency: 150, endFrequency: 92, duration: 0.04, gain: 0.07 },
                    { type: 'triangle', frequency: 320, endFrequency: 190, duration: 0.055, gain: 0.04, delay: 0.012 },
                ],
            },
        },
        win: {
            enabled: true,
            volume: 0.9,
        },
    },
}
    
export const getGameAudioEffect = (effectName) => {
    if (!GAME_AUDIO_CONFIG.enabled) {
        return null
    }

    const effect = GAME_AUDIO_CONFIG.effects[effectName]

    return effect?.enabled ? effect : null
}
