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
    }),
    presentation: {},
}
