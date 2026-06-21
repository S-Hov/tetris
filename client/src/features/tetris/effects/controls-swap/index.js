const swappedActions = {
    moveLeft: 'moveRight',
    moveRight: 'moveLeft',
}

export default {
    effectKey: 'controls_swap',
    normalizeParameters: () => ({}),
    beforeAction: ({ action }) => ({
        action: swappedActions[action] || action,
    }),
    presentation: {},
}
