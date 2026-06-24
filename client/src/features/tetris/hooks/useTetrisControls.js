import { useEffect, useRef } from 'react'

import {
    hardDrop,
    movePiece,
    rotateCurrentPiece,
    togglePause,
    withDerivedState,
} from '@/features/tetris/model/tetrisEngine.js'
import {
    applyActionWithEffects,
    createDelayedActionFeedbackState,
    getEffectActionDelayState,
    hasPendingDelayedAction,
} from '@/features/tetris/effects/runtime.js'
import {
    PC_CONTROL_ACTIONS,
    getActionForCode,
    getAllControlCodes,
    loadPcControlSettings,
} from '@/features/tetris/model/pcControls.js'

export const applyTetrisAction = (state, action, { randomPiece } = {}) => {
    switch (action) {
        case PC_CONTROL_ACTIONS.MOVE_LEFT:
            return movePiece(state, { x: -1, y: 0 })
        case PC_CONTROL_ACTIONS.MOVE_RIGHT:
            return movePiece(state, { x: 1, y: 0 })
        case PC_CONTROL_ACTIONS.SOFT_DROP:
            return movePiece(state, { x: 0, y: 1 })
        case PC_CONTROL_ACTIONS.ROTATE:
            return rotateCurrentPiece(state)
        case PC_CONTROL_ACTIONS.HARD_DROP:
            return hardDrop(state, { randomPiece })
        default:
            return state
    }
}

export const applyTetrisControl = (state, code, { randomPiece } = {}) => (
    applyTetrisAction(state, getActionForCode(code), { randomPiece })
)

export const useTetrisControls = ({
    disabled = false,
    gameState,
    onAction,
    randomPiece,
    setGameState,
} = {}) => {
    const scheduledDelayedActionRef = useRef(null)
    const pendingAction = gameState?.pendingDelayedAction
    const pendingActionId = pendingAction?.id
    const pendingActionName = pendingAction?.action
    const pendingActionExecuteAt = pendingAction?.executeAt

    useEffect(() => {
        if (!pendingActionId || scheduledDelayedActionRef.current === pendingActionId) {
            return undefined
        }

        scheduledDelayedActionRef.current = pendingActionId
        const timeoutId = window.setTimeout(() => {
            setGameState((latestState) => {
                if (latestState.pendingDelayedAction?.id !== pendingActionId) {
                    return latestState
                }

                const { pendingDelayedAction, ...stateWithoutPendingAction } = latestState
                void pendingDelayedAction

                return applyActionWithEffects(
                    stateWithoutPendingAction,
                    pendingActionName,
                    (preparedState, preparedAction) => applyTetrisAction(
                        preparedState,
                        preparedAction,
                        { randomPiece }
                    )
                )
            })
            scheduledDelayedActionRef.current = null
        }, Math.max(0, pendingActionExecuteAt - Date.now()))

        return () => window.clearTimeout(timeoutId)
    }, [
        pendingActionExecuteAt,
        pendingActionId,
        pendingActionName,
        randomPiece,
        setGameState,
    ])

    useEffect(() => {
        const settings = loadPcControlSettings()
        const controlKeys = getAllControlCodes(settings)

        const handleKeyDown = (event) => {
            const action = getActionForCode(event.code, settings)

            if (controlKeys.includes(event.code)) {
                event.preventDefault()
            }

            if (action !== PC_CONTROL_ACTIONS.PAUSE && !disabled) {
                onAction?.(action)
            }

            setGameState((prevState) => {
                const state = withDerivedState(prevState)

                if (state.isClearing) {
                    return prevState
                }

                if (action === PC_CONTROL_ACTIONS.PAUSE) {
                    if (disabled) {
                        return prevState
                    }

                    return togglePause(prevState)
                }

                if (disabled || state.isGameOver || state.isPaused || state.isChoosingAbility) {
                    return prevState
                }

                const delayState = getEffectActionDelayState(state, action)

                if (delayState.delayMs > 0) {
                    if (hasPendingDelayedAction(prevState, delayState, action)) {
                        return prevState
                    }

                    return createDelayedActionFeedbackState(prevState, delayState, action)
                }

                return applyActionWithEffects(
                    prevState,
                    action,
                    (preparedState, preparedAction) => applyTetrisAction(
                        preparedState,
                        preparedAction,
                        { randomPiece }
                    )
                )
            })
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [disabled, onAction, randomPiece, setGameState])
}
