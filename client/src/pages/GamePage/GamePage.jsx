import { useEffect, useState } from 'react'
import {
    LINE_CLEAR_ANIMATION_MS,
    createGameState,
    getRenderedBoard,
    hardDrop,
    movePiece,
    resolveLineClear,
    restartGame,
    rotateCurrentPiece,
    tickGame,
    togglePause,
    withDerivedState,
} from '@/features/tetris/model/tetrisEngine.js'
import { GAME_MODE_REGISTRY, GAME_MODE_TYPES } from '@/features/tetris/model/gameModes.js'
import ActionsPanel from '@/features/tetris/ui/ActionsPanel.jsx'
import GameLayout from '@/features/tetris/ui/GameLayout.jsx'
import NextPiecePanel from '@/features/tetris/ui/NextPiecePanel.jsx'
import StatsPanel from '@/features/tetris/ui/StatsPanel.jsx'

const CONTROL_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyS', 'KeyW', 'KeyP', 'Escape']
const soloMode = GAME_MODE_REGISTRY[GAME_MODE_TYPES.SOLO_CLASSIC]
const createSoloGameState = () => createGameState({ abilitiesEnabled: false })

const GamePage = () => {
    const [gameState, setGameState] = useState(() => createSoloGameState())
    const derivedState = withDerivedState(gameState)
    const boardWithPiece = getRenderedBoard(derivedState)

    useEffect(() => {
        if (!derivedState.isClearing) {
            return undefined
        }

        const timeoutId = setTimeout(() => {
            setGameState((prevState) => resolveLineClear(prevState))
        }, LINE_CLEAR_ANIMATION_MS)

        return () => clearTimeout(timeoutId)
    }, [derivedState.isClearing])

    useEffect(() => {
        if (derivedState.isGameOver || derivedState.isPaused || derivedState.isClearing) {
            return undefined
        }

        const intervalId = setInterval(() => {
            setGameState((prevState) => tickGame(prevState))
        }, derivedState.speed)

        return () => clearInterval(intervalId)
    }, [derivedState.isClearing, derivedState.isGameOver, derivedState.isPaused, derivedState.speed])

    useEffect(() => {
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
                    return togglePause(prevState)
                }

                if (state.isGameOver || state.isPaused) {
                    return prevState
                }

                switch (event.code) {
                    case 'ArrowLeft':
                    case 'KeyA':
                        return movePiece(prevState, { x: -1, y: 0 })
                    case 'ArrowRight':
                    case 'KeyD':
                        return movePiece(prevState, { x: 1, y: 0 })
                    case 'ArrowDown':
                    case 'KeyS':
                        return movePiece(prevState, { x: 0, y: 1 })
                    case 'ArrowUp':
                    case 'KeyW':
                        return rotateCurrentPiece(prevState)
                    case 'Space':
                        return hardDrop(prevState)
                    default:
                        return prevState
                }
            })
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handlePauseToggle = () => {
        setGameState((prevState) => togglePause(prevState))
    }

    const handleRestart = () => {
        setGameState(() => restartGame({ abilitiesEnabled: false }))
    }

    const sidebar = (
        <>
            <NextPiecePanel nextPiece={derivedState.nextPiece} />
            <StatsPanel
                score={derivedState.score}
                lines={derivedState.linesCleared}
                level={derivedState.level}
                status={derivedState.isPaused ? 'Paused' : 'Playing'}
            />
            <ActionsPanel
                actions={[
                    {
                        key: 'pause',
                        icon: derivedState.isPaused ? 'fa-play' : 'fa-pause',
                        label: derivedState.isPaused ? 'Resume' : 'Pause',
                        onClick: handlePauseToggle,
                        disabled: derivedState.isGameOver,
                        pressed: derivedState.isPaused,
                    },
                    {
                        key: 'restart',
                        icon: 'fa-rotate-right',
                        label: 'Restart',
                        onClick: handleRestart,
                    },
                ]}
            />
        </>
    )

    return (
        <GameLayout
            mode={soloMode}
            score={derivedState.score}
            board={boardWithPiece}
            clearingRows={derivedState.clearingRows}
            sidebar={sidebar}
        />
    )
}

export default GamePage
