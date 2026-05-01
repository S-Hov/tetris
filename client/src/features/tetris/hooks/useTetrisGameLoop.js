import { useEffect, useMemo, useState } from 'react'

import {
    LINE_CLEAR_ANIMATION_MS,
    createGameState,
    getRenderedBoard,
    rotateCurrentPiece,
    resolveLineClear,
    restartGame,
    shiftBoard,
    tickGame,
    withDerivedState,
} from '@/features/tetris/model/tetrisEngine.js'
import { EFFECT_TYPES, hasEffect, removeExpiredEffects } from '@/features/tetris/model/effects.js'

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
    const hasRandomRotation = hasEffect(derivedState, EFFECT_TYPES.RANDOM_ROTATION)
    const hasRandomShift = hasEffect(derivedState, EFFECT_TYPES.RANDOM_SHIFT)

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

    useEffect(() => {
        if (
            paused ||
            derivedState.isGameOver ||
            derivedState.isPaused ||
            derivedState.isClearing ||
            derivedState.isChoosingAbility ||
            !hasRandomRotation
        ) {
            return undefined
        }

        const intervalId = setInterval(() => {
            if (Math.random() >= 0.3) {
                return
            }

            setGameState((prevState) => rotateCurrentPiece(removeExpiredEffects(prevState)))
        }, 500)

        return () => clearInterval(intervalId)
    }, [
        hasRandomRotation,
        derivedState.isClearing,
        derivedState.isChoosingAbility,
        derivedState.isGameOver,
        derivedState.isPaused,
        paused,
    ])

    useEffect(() => {
        if (
            paused ||
            derivedState.isGameOver ||
            derivedState.isPaused ||
            derivedState.isClearing ||
            derivedState.isChoosingAbility ||
            !hasRandomShift
        ) {
            return undefined
        }

        const intervalId = setInterval(() => {
            const direction = Math.random() < 0.5 ? -1 : 1

            setGameState((prevState) => shiftBoard(removeExpiredEffects(prevState), direction))
        }, 1000)

        return () => clearInterval(intervalId)
    }, [
        hasRandomShift,
        derivedState.isClearing,
        derivedState.isChoosingAbility,
        derivedState.isGameOver,
        derivedState.isPaused,
        paused,
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
