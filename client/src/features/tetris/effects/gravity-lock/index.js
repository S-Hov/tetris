import { normalizeNumber } from '../effectUtils.js'

const horizontalActions = new Set(['moveLeft', 'moveRight'])

export default {
    effectKey: 'gravity_lock',
    normalizeParameters: (parameters = {}) => ({
        lockDelayMultiplier: normalizeNumber(parameters.lockDelayMultiplier, 0.5, { min: 0.05 }),
        lockHorizontalAfterDrop: parameters.lockHorizontalAfterDrop !== false,
        speedMultiplier: normalizeNumber(parameters.speedMultiplier, 3, { min: 1 }),
    }),
    beforeAction: ({ action, effect, state }) => ({
        blocked: effect.parameters.lockHorizontalAfterDrop &&
            horizontalActions.has(action) &&
            Boolean(state.currentPiece.isLockedPhase),
    }),
    afterAction: ({ action, nextState, previousState }) => {
        const movedDown = nextState.currentPosition.y > previousState.currentPosition.y

        if ((action === 'softDrop' || action === 'tick') && movedDown) {
            return {
                ...nextState,
                currentPiece: {
                    ...nextState.currentPiece,
                    isLockedPhase: true,
                },
            }
        }

        return nextState
    },
    modifyDerivedState: (derivedState, effect) => ({
        ...derivedState,
        lockDelay: Math.max(
            50,
            Math.floor(derivedState.lockDelay * effect.parameters.lockDelayMultiplier)
        ),
        effectSpeedMultiplier: Math.max(
            derivedState.effectSpeedMultiplier || 1,
            effect.parameters.speedMultiplier
        ),
    }),
    presentation: {},
}
