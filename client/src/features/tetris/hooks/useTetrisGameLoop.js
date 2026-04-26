import { useEffect, useMemo, useState } from 'react'

import {
    LINE_CLEAR_ANIMATION_MS,
    createGameState,
    getRenderedBoard,
    resolveLineClear,
    restartGame,
    tickGame,
    withDerivedState,
} from '@/features/tetris/model/tetrisEngine.js'
import { removeExpiredEffects } from '@/features/tetris/model/effects.js'

export const useTetrisGameLoop = ({
    abilitiesEnabled,
    randomPiece,
    paused = false,
} = {}) => {
    const [gameState, setGameState] = useState(() => createGameState({
        abilitiesEnabled,
        randomPiece,
    }))

    const derivedState = useMemo(() => withDerivedState(gameState), [gameState])
    const boardWithPiece = useMemo(() => getRenderedBoard(derivedState), [derivedState])

    useEffect(() => {
        if (!derivedState.isClearing) {
            return undefined
        }

        const timeoutId = setTimeout(() => {
            setGameState((prevState) => resolveLineClear(prevState, { randomPiece }))
        }, LINE_CLEAR_ANIMATION_MS)

        return () => clearTimeout(timeoutId)
    }, [derivedState.isClearing, randomPiece])

    useEffect(() => {
        if (
            paused ||
            derivedState.isGameOver ||
            derivedState.isPaused ||
            derivedState.isClearing ||
            derivedState.isChoosingAbility
        ) {
            return undefined
        }

        const intervalId = setInterval(() => {
            setGameState((prevState) => {
                const cleanedState = removeExpiredEffects(prevState)
                return tickGame(cleanedState, { randomPiece })
            })
        }, derivedState.speed)

        return () => clearInterval(intervalId)
    }, [
        derivedState.isClearing,
        derivedState.isChoosingAbility,
        derivedState.isGameOver,
        derivedState.isPaused,
        derivedState.speed,
        paused,
        randomPiece,
    ])

    const resetGame = () => {
        setGameState(() => restartGame({
            abilitiesEnabled,
            randomPiece,
        }))
    }

    return {
        boardWithPiece,
        derivedState,
        gameState,
        resetGame,
        setGameState,
    }
}
