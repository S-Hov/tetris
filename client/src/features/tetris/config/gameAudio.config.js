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
            volume: 0.42,
        },
        rotate: {
            enabled: false,
            volume: 0.5,
        },
        softDrop: {
            enabled: false,
            volume: 0.24,
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
