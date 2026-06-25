import { normalizeNumber } from '../effectUtils.js'

const horizontalActions = new Set(['moveLeft', 'moveRight'])

export default {
    effectKey: 'gravity_lock',
    normalizeParameters: (parameters = {}) => ({
        lockImmediately: parameters.lockImmediately !== false,
        lockDelayMultiplier: normalizeNumber(parameters.lockDelayMultiplier, 0.5, { min: 0.05 }),
        lockHorizontalAfterDrop: parameters.lockHorizontalAfterDrop !== false,
        speedMultiplier: normalizeNumber(parameters.speedMultiplier, 3, { min: 1 }),
    }),
    beforeAction: ({ action, effect, state }) => ({
        blocked: effect.parameters.lockHorizontalAfterDrop &&
            horizontalActions.has(action) &&
            (effect.parameters.lockImmediately || Boolean(state.currentPiece.isLockedPhase)),
        feedback: 'gravityLockBlocked',
    }),
    afterAction: ({ action, nextState, previousState }) => {
        const movedDown = nextState.currentPosition.y > previousState.currentPosition.y

        if (
            ((action === 'softDrop' || action === 'tick') && movedDown) ||
            nextState.currentPiece !== previousState.currentPiece
        ) {
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
    presentation: {
        accent: '#ff2e4f',
        boardEffect: 'gravity-lock',
        icon: 'fa-weight-hanging',
        label: 'Липкое падение',
        theme: 'gravity-lock',
        audio: {
            apply: {
                volume: 0.62,
                voices: [
                    { type: 'sawtooth', frequency: 96, endFrequency: 44, duration: 0.5, gain: 0.26 },
                    { type: 'square', frequency: 64, endFrequency: 38, duration: 0.42, gain: 0.14, delay: 0.08 },
                    { type: 'triangle', frequency: 420, endFrequency: 160, duration: 0.24, gain: 0.08, delay: 0.04 },
                ],
            },
            feedback: {
                volume: 0.52,
                voices: [
                    { type: 'square', frequency: 92, endFrequency: 64, duration: 0.08, gain: 0.22 },
                    { type: 'sawtooth', frequency: 148, endFrequency: 70, duration: 0.12, gain: 0.18, delay: 0.025 },
                    { type: 'triangle', frequency: 520, endFrequency: 240, duration: 0.07, gain: 0.07, delay: 0.055 },
                ],
            },
        },
    },
}
