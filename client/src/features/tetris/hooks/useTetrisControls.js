import { useEffect } from 'react'

import {
    hardDrop,
    movePiece,
    rotateCurrentPiece,
    togglePause,
    withDerivedState,
} from '@/features/tetris/model/tetrisEngine.js'
import { EFFECT_TYPES, hasEffect } from '@/features/tetris/model/effects.js'
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
    randomPiece,
    setGameState,
} = {}) => {
    useEffect(() => {
        const settings = loadPcControlSettings()
        const controlKeys = getAllControlCodes(settings)

        const handleKeyDown = (event) => {
            const action = getActionForCode(event.code, settings)

            if (controlKeys.includes(event.code)) {
                event.preventDefault()
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

                if (hasEffect(state, EFFECT_TYPES.DELAY_INPUT)) {
                    setTimeout(() => {
                        setGameState((latestState) => applyTetrisAction(latestState, action, { randomPiece }))
                    }, 150)

                    return prevState
                }

                return applyTetrisAction(prevState, action, { randomPiece })
            })
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [disabled, randomPiece, setGameState])
}
