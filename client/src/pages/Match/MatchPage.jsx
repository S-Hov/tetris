import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import TetrisBoard from '../../features/tetris/ui/TetrisBoard.jsx'
import {
    LINE_CLEAR_ANIMATION_MS,
    createGameState,
    getRenderedBoard,
    hardDrop,
    movePiece,
    resolveAbilityChoice,
    resolveLineClear,
    // restartGame,
    rotateCurrentPiece,
    tickGame,
    togglePause,
    withDerivedState,
} from '../../features/tetris/model/tetrisEngine.js'
import { createBoard } from '../../features/tetris/model/createBoard.js'
import { ensureSocketSession, socket } from '../../shared/api/socket/index.js'
import { useAuth } from '../../shared/hooks/useAuth.js'
import notify from '../../utils/Notifications'

import './MatchPage.css'

const CONTROL_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyS', 'KeyW', 'KeyP', 'Escape']
const getAbilitySecondsLeft = (endsAt) => Math.max(0, Math.ceil(((endsAt ?? 0) - Date.now()) / 1000))

const emitWithAck = (eventName, payload) => {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (response) => {
            resolve(response || { success: false, message: 'Нет ответа от сервера' })
        })
    })
}

const MatchPage = () => {
    const [gameState, setGameState] = useState(() => createGameState())
    const [abilitySecondsLeft, setAbilitySecondsLeft] = useState(0)
    const derivedState = withDerivedState(gameState)
    const boardWithPiece = getRenderedBoard(derivedState)
    const [opponentState, setOpponentState] = useState({
        score: 0,
        linesCleared: 0,
        level: 1,
        isGameOver: false,
        isPaused: false,
        energy: 0,
        board: createBoard(),
        isChoosingAbility: false,
        abilityOptions: [],
        abilityChoiceEndsAt: null,
    })
    const { roomId } = useParams()
    const { user } = useAuth()

    useEffect(() => {
        const restoreMatchSocketSession = async () => {
            try {
                await ensureSocketSession({ user })

                if (!roomId) {
                    return
                }

                const response = await emitWithAck('room:join', { roomId })

                if (!response.success) {
                    notify(response.message || 'Не удалось восстановить участие в матче', 'warning')
                }
            } catch (error) {
                notify(error.message || 'Не удалось восстановить подключение к матчу', 'error')
            }
        }

        restoreMatchSocketSession()
    }, [roomId, user])

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
        if (derivedState.isGameOver || derivedState.isPaused || derivedState.isClearing || derivedState.isChoosingAbility) {
            return undefined
        }

        const intervalId = setInterval(() => {
            setGameState((prevState) => tickGame(prevState))
        }, derivedState.speed)

        return () => clearInterval(intervalId)
    }, [derivedState.isClearing, derivedState.isGameOver, derivedState.isPaused, derivedState.speed, derivedState.isChoosingAbility])

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

                if (state.isGameOver || state.isPaused || state.isChoosingAbility) {
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

    useEffect(() => {
        const handleOpponentUpdate = ({ payload }) => {
            setOpponentState(payload)
        }

        socket.on('opponent:update', handleOpponentUpdate)

        return () => {
            socket.off('opponent:update', handleOpponentUpdate)
        }
    }, [])

    useEffect(() => {
        if (!roomId) return
        socket.emit('game:update', {
            roomId,
            payload: {
                score: derivedState.score,
                linesCleared: derivedState.linesCleared,
                level: derivedState.level,
                isGameOver: derivedState.isGameOver,
                isPaused: derivedState.isPaused,
                board: boardWithPiece,
            },
        })
    }, [
        roomId,
        derivedState.score,
        derivedState.linesCleared,
        derivedState.level,
        derivedState.isGameOver,
        derivedState.isPaused,
        boardWithPiece,
    ])

    useEffect(() => {
        if (!derivedState.isGameOver || !roomId) return

        socket.emit('game:over', {
            roomId,
            payload: {
                score: derivedState.score,
                linesCleared: derivedState.linesCleared,
                level: derivedState.level,
            },
        })
    }, [derivedState.isGameOver, derivedState.level, derivedState.linesCleared, derivedState.score, roomId])

    useEffect(() => {
        const handleMatchEnd = ({ loserSocketId }) => {
            notify(
                loserSocketId === socket.id ? 'Матч завершён. Вы проиграли раунд' : 'Матч завершён. Вы победили',
                loserSocketId === socket.id ? 'warning' : 'success'
            )
        }

        socket.on('match:end', handleMatchEnd)

        return () => socket.off('match:end', handleMatchEnd)
    }, [])

    const handleAbilityChoose = (ability) => {
        notify(`${ability.title} is prepared`, 'success')
        setGameState((prevState) => resolveAbilityChoice(prevState, ability))
    }

    useEffect(() => {
        if (!derivedState.isChoosingAbility) return

        setAbilitySecondsLeft(getAbilitySecondsLeft(derivedState.abilityChoiceEndsAt))

        const intervalId = setInterval(() => {
            setAbilitySecondsLeft(getAbilitySecondsLeft(derivedState.abilityChoiceEndsAt))
        }, 250)

        const timeout = setTimeout(() => {
            notify('Ability window expired', 'warning')
            setGameState((prevState) => resolveAbilityChoice(prevState))
        }, Math.max(0, (derivedState.abilityChoiceEndsAt ?? Date.now()) - Date.now()))

        return () => {
            clearInterval(intervalId)
            clearTimeout(timeout)
        }
    }, [derivedState.abilityChoiceEndsAt, derivedState.isChoosingAbility])

    return (
        <section className="tetris-section">
            <div className="container tetris-container">
                <div className="tetris-box tetris-box--player">
                    <div className='tetris-box-header'>
                        <h2>Solo mod</h2>
                        <p><i className="fa-solid fa-star"></i> Score: <b>{derivedState.score}</b></p>
                    </div>

                    <div className="tetris-layout">
                        <div className="player-board-shell">
                            <TetrisBoard board={boardWithPiece} clearingRows={derivedState.clearingRows} />

                            {derivedState.isChoosingAbility && (
                                <div className="ability-overlay" role="dialog" aria-modal="true" aria-labelledby="ability-title">
                                    <div className="ability-picker">
                                        <div className="ability-picker-header">
                                            <span className="ability-kicker">Time stopped</span>
                                            <h3 id="ability-title">Choose a debuff</h3>
                                            <p>{abilitySecondsLeft}s left</p>
                                        </div>

                                        <div className="ability-options">
                                            {derivedState.abilityOptions.map((ability) => (
                                                <button
                                                    type="button"
                                                    className="ability-card"
                                                    key={ability.id}
                                                    onClick={() => handleAbilityChoose(ability)}
                                                >
                                                    <span className={`ability-visual ability-visual--${ability.visual}`}>
                                                        <i className={`fa-solid ${ability.icon}`} aria-hidden="true"></i>
                                                    </span>
                                                    <span className="ability-card-label">{ability.label}</span>
                                                    <span className="ability-card-title">{ability.title}</span>
                                                    <span className="ability-card-description">{ability.description}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className='right-board'>
                            <div className="next-piece-panel">
                                <h3><i className="fa-solid fa-eye"></i> Next Piece</h3>
                                <div className='next-piece'>
                                    <div
                                        className="next-piece-grid"
                                        style={{
                                            gridTemplateColumns: `repeat(${derivedState.nextPiece.shape[0].length}, var(--next-piece-cell-size))`,
                                            gridTemplateRows: `repeat(${derivedState.nextPiece.shape.length}, var(--next-piece-cell-size))`,
                                        }}
                                    >
                                        {derivedState.nextPiece.shape.flatMap((row, rowIndex) =>
                                            row.map((cell, cellIndex) => (
                                                <div
                                                    key={`${rowIndex}-${cellIndex}`}
                                                    className={`next-piece-cell ${cell ? 'filled' : ''}`}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className='info-panel'>
                                <p><i className="fa-solid fa-star"></i> Score: <span>{derivedState.score}</span></p>
                                <p><i className="fa-solid fa-grip-lines"></i> Lines: <span>{derivedState.linesCleared}</span></p>
                                <p><i className="fas fa-gauge-high"></i> Level: <span>{derivedState.level}</span></p>
                                <p><i className="fa-solid fa-trophy"></i> РЕКОРД <span>7984</span></p>
                                <p>Status: {derivedState.isPaused ? 'Paused' : 'Playing'}</p>
                            </div>
                            <div className="energy-panel">
                                <p><i className="fa-solid fa-bolt"></i> Skill Energy</p>
                                <div className="energy-bar">
                                    <div
                                        className="energy-fill"
                                        style={{ height: `${derivedState.energy}%` }}
                                    />
                                </div>
                                <span>{derivedState.energy}%</span>
                            </div>
                            <div className='opponent-panel'>
                                <h3>Opponent</h3>
                                <p>Score: {opponentState.score}</p>
                                <p>Lines: {opponentState.linesCleared}</p>
                                <p>Level: {opponentState.level}</p>
                                <p>Status: {opponentState.isGameOver ? 'Game Over' : 'Playing'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='opponent-board-panel tetris-box tetris-box--opponent'>
                    <h2>Opponent Board</h2>
                    <div className='opponent-board-wrapper'>
                        <TetrisBoard board={opponentState.board} clearingRows={[]} compact />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default MatchPage
