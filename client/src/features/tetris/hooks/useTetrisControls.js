import { useEffect } from 'react'

import {
    hardDrop,
    movePiece,
    rotateCurrentPiece,
    togglePause,
    withDerivedState,
} from '@/features/tetris/model/tetrisEngine.js'
import { EFFECT_TYPES, hasEffect } from '@/features/tetris/model/effects.js'

const CONTROL_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyS', 'KeyW', 'KeyP', 'Escape']

export const useTetrisControls = ({
    disabled = false,
    randomPiece,
    setGameState,
} = {}) => {
    useEffect(() => {
        const applyControl = (state, code) => {
            switch (code) {
                case 'ArrowLeft':
                case 'KeyA':
                    return movePiece(state, { x: -1, y: 0 })
                case 'ArrowRight':
                case 'KeyD':
                    return movePiece(state, { x: 1, y: 0 })
                case 'ArrowDown':
                case 'KeyS':
                    return movePiece(state, { x: 0, y: 1 })
                case 'ArrowUp':
                case 'KeyW':
                    return rotateCurrentPiece(state)
                case 'Space':
                    return hardDrop(state, { randomPiece })
                default:
                    return state
            }
        }

        const handleKeyDown = (event) => {
            if (CONTROL_KEYS.includes(event.code)) {
                event.preventDefault()
            }

            setGameState((prevState) => {
                const state = withDerivedState(prevState)

                if (state.isClearing) {
                    return prevState
                }

                if (event.code === 'KeyP' || event.code === 'Escape') {
                    if (disabled) {
                        return prevState
                    }

                    return togglePause(prevState)
                }

                if (disabled || state.isGameOver || state.isPaused || state.isChoosingAbility) {
                    return prevState
                }

                if (hasEffect(state, EFFECT_TYPES.DELAY_INPUT)) {
                    const code = event.code

                    setTimeout(() => {
                        setGameState((latestState) => applyControl(latestState, code))
                    }, 150)

                    return prevState
                }

                return applyControl(prevState, event.code)
            })
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [disabled, randomPiece, setGameState])
}
