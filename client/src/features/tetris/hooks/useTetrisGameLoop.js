import { useEffect, useMemo, useState } from 'react'

import {
    LINE_CLEAR_ANIMATION_MS,
    createGameState,
    getRenderedBoard,
    rotateCurrentPiece,
    resolveLineClear,
    restartGame,
    tickGame,
    withDerivedState,
} from '@/features/tetris/model/tetrisEngine.js'
import {
    applyActionWithEffects,
    applyEffectModifiers,
    hasTimedEffects,
    runTimedEffects,
} from '@/features/tetris/effects/runtime.js'

export const useTetrisGameLoop = ({
    abilitiesEnabled,
    getAbilityOptions,
    randomPiece,
    paused = false,
} = {}) => {
    const [gameState, setGameState] = useState(() => createGameState({
        abilitiesEnabled,
        randomPiece,
    }))

    const derivedState = useMemo(
        () => applyEffectModifiers(withDerivedState(gameState)),
        [gameState]
    )
    const boardWithPiece = useMemo(() => getRenderedBoard(derivedState), [derivedState])
    const hasActiveTimedEffects = hasTimedEffects(derivedState)

    useEffect(() => {
        if (!derivedState.isClearing) {
            return undefined
        }

        const timeoutId = setTimeout(() => {
            setGameState((prevState) => resolveLineClear(prevState, {
                getAbilityOptions,
                randomPiece,
            }))
        }, LINE_CLEAR_ANIMATION_MS)

        return () => clearTimeout(timeoutId)
    }, [derivedState.isClearing, getAbilityOptions, randomPiece])

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
            setGameState((prevState) => applyActionWithEffects(
                prevState,
                'tick',
                (preparedState) => tickGame(preparedState, { randomPiece })
            ))
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
            !hasActiveTimedEffects
        ) {
            return undefined
        }

        const intervalId = setInterval(() => {
            setGameState((prevState) => runTimedEffects(prevState, {
                rotate: rotateCurrentPiece,
            }))
        }, 50)

        return () => clearInterval(intervalId)
    }, [
        derivedState.isClearing,
        derivedState.isChoosingAbility,
        derivedState.isGameOver,
        derivedState.isPaused,
        hasActiveTimedEffects,
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
