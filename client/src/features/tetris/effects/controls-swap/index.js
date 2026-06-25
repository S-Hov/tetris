const swappedActions = {
    moveLeft: 'moveRight',
    moveRight: 'moveLeft',
}

export default {
    effectKey: 'controls_swap',
    normalizeParameters: () => ({}),
    beforeAction: ({ action }) => {
        const swappedAction = swappedActions[action] || action

        return {
            action: swappedAction,
            feedback: swappedAction !== action
                ? {
                    requestedAction: action,
                    resolvedAction: swappedAction,
                    type: 'controlsSwapped',
                }
                : null,
        }
    },
    presentation: {
        accent: '#ff42c6',
        boardEffect: 'controls-swap',
        icon: 'fa-shuffle',
        label: 'Сбой управления',
        theme: 'controls-swap',
        audio: {
            apply: {
                volume: 0.62,
                voices: [
                    { type: 'triangle', frequency: 620, endFrequency: 210, duration: 0.34, gain: 0.18 },
                    { type: 'square', frequency: 184, endFrequency: 360, duration: 0.22, gain: 0.14, delay: 0.05 },
                    { type: 'sine', frequency: 1180, endFrequency: 540, duration: 0.18, gain: 0.055, delay: 0.12 },
                ],
            },
            feedback: {
                volume: 0.42,
                voices: [
                    { type: 'square', frequency: 460, endFrequency: 230, duration: 0.075, gain: 0.16 },
                    { type: 'triangle', frequency: 760, endFrequency: 1120, duration: 0.09, gain: 0.09, delay: 0.025 },
                    { type: 'sine', frequency: 1320, endFrequency: 840, duration: 0.08, gain: 0.045, delay: 0.05 },
                ],
            },
        },
    },
}
