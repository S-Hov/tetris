import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

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
const MATCH_END_REDIRECT_DELAY_MS = 3200
const DANGER_ZONE_ROWS = 7

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const getBoardDangerLevel = (board) => {
    if (!Array.isArray(board) || board.length === 0) {
        return 0
    }

    const topFilledRowIndex = board.findIndex((row) => row.some(Boolean))

    if (topFilledRowIndex === -1) {
        return 0
    }

    const rowsLeftToLose = topFilledRowIndex
    const rawDanger = (DANGER_ZONE_ROWS - rowsLeftToLose) / DANGER_ZONE_ROWS

    return clamp(rawDanger, 0, 1)
}

const emitWithAck = (eventName, payload) => {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (response) => {
            resolve(response || { success: false, message: 'Нет ответа от сервера' })
        })
    })
}

const MatchPage = () => {
    const [gameState, setGameState] = useState(() => createGameState())
    const [abilityTick, setAbilityTick] = useState(0)
    const [matchResult, setMatchResult] = useState(null)
    const derivedState = withDerivedState(gameState)
    const boardWithPiece = getRenderedBoard(derivedState)
    const navigate = useNavigate()
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
    const redirectTimeoutRef = useRef(null)
    const isMatchFinished = Boolean(matchResult)
    const dangerLevel = useMemo(() => getBoardDangerLevel(derivedState.board), [derivedState.board])
    const abilitySecondsLeft = useMemo(() => {
        void abilityTick
        return derivedState.isChoosingAbility ? getAbilitySecondsLeft(derivedState.abilityChoiceEndsAt) : 0
    }, [abilityTick, derivedState.abilityChoiceEndsAt, derivedState.isChoosingAbility])
    const boardShellClassName = [
        'player-board-shell',
        dangerLevel > 0 ? 'player-board-shell--danger' : '',
        matchResult === 'lose' ? 'player-board-shell--defeated' : '',
        matchResult === 'win' ? 'player-board-shell--victorious' : '',
    ].filter(Boolean).join(' ')

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
        if (isMatchFinished || derivedState.isGameOver || derivedState.isPaused || derivedState.isClearing || derivedState.isChoosingAbility) {
            return undefined
        }

        const intervalId = setInterval(() => {
            setGameState((prevState) => tickGame(prevState))
        }, derivedState.speed)

        return () => clearInterval(intervalId)
    }, [derivedState.isClearing, derivedState.isGameOver, derivedState.isPaused, derivedState.speed, derivedState.isChoosingAbility, isMatchFinished])

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
                    if (isMatchFinished) {
                        return prevState
                    }

                    return togglePause(prevState)
                }

                if (isMatchFinished || state.isGameOver || state.isPaused || state.isChoosingAbility) {
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
    }, [isMatchFinished])

    useEffect(() => {
        const handleOpponentUpdate = ({ payload }) => {
            setOpponentState((prevState) => ({
                ...prevState,
                ...payload,
                board: Array.isArray(payload?.board) ? payload.board : prevState.board,
            }))
        }

        socket.on('opponent:update', handleOpponentUpdate)

        return () => {
            socket.off('opponent:update', handleOpponentUpdate)
        }
    }, [])

    useEffect(() => {
        if (!roomId || isMatchFinished) return
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
        isMatchFinished,
    ])

    useEffect(() => {
        if (!derivedState.isGameOver || !roomId || isMatchFinished) return

        socket.emit('game:over', {
            roomId,
            payload: {
                score: derivedState.score,
                linesCleared: derivedState.linesCleared,
                level: derivedState.level,
            },
        })
    }, [derivedState.isGameOver, derivedState.level, derivedState.linesCleared, derivedState.score, isMatchFinished, roomId])

    useEffect(() => {
        const handleMatchEnd = ({ loserSocketId, winnerSocketId }) => {
            const nextMatchResult = loserSocketId === socket.id ? 'lose' : 'win'

            setMatchResult((currentValue) => currentValue || nextMatchResult)

            notify(
                nextMatchResult === 'lose'
                    ? 'Раунд завершён. Вы проиграли'
                    : 'Раунд завершён. Вы победили',
                nextMatchResult === 'lose' ? 'warning' : 'success'
            )

            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current)
            }

            redirectTimeoutRef.current = setTimeout(() => {
                navigate('/lobby', {
                    replace: true,
                    state: {
                        roomId,
                        matchResult: nextMatchResult,
                        winnerSocketId,
                    },
                })
            }, MATCH_END_REDIRECT_DELAY_MS)
        }

        socket.on('match:end', handleMatchEnd)

        return () => {
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current)
            }

            socket.off('match:end', handleMatchEnd)
        }
    }, [navigate, roomId])

    const handleAbilityChoose = (ability) => {
        notify(`${ability.title} is prepared`, 'success')
        setGameState((prevState) => resolveAbilityChoice(prevState, ability))
    }

    useEffect(() => {
        if (!derivedState.isChoosingAbility) return

        const intervalId = setInterval(() => {
            setAbilityTick((currentValue) => currentValue + 1)
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

    const dangerStyle = {
        '--danger-level': dangerLevel.toFixed(3),
        '--danger-shake-duration': `${Math.max(700 - dangerLevel * 420, 220)}ms`,
    }

    return (
        <section className="tetris-section">
            <div className="container tetris-container">
                <div className="tetris-box tetris-box--player">
                    <div className='tetris-box-header'>
                        <h2>Solo mod</h2>
                        <p><i className="fa-solid fa-star"></i> Score: <b>{derivedState.score}</b></p>
                    </div>

                    <div className="tetris-layout">
                        <div className={boardShellClassName} style={dangerStyle}>
                            <TetrisBoard
                                board={boardWithPiece}
                                clearingRows={derivedState.clearingRows}
                                className={dangerLevel > 0 ? 'tetris-board--danger' : ''}
                            />

                            {dangerLevel > 0 && !isMatchFinished && (
                                <div className="board-danger-status" aria-hidden="true">
                                    <span>CRITICAL ZONE</span>
                                    <strong>{Math.round(dangerLevel * 100)}%</strong>
                                </div>
                            )}

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
                                <p>Status: {isMatchFinished ? 'Round ended' : opponentState.isGameOver ? 'Game Over' : 'Playing'}</p>
                            </div>
                        </div>

                        {isMatchFinished && (
                            <div
                                className={`match-result-banner match-result-banner--${matchResult}`}
                                role="status"
                                aria-live="polite"
                            >
                                <span className="match-result-banner__eyebrow">
                                    {matchResult === 'win' ? 'Round Complete' : 'Round Lost'}
                                </span>
                                <h3>{matchResult === 'win' ? 'Победа' : 'Поражение'}</h3>
                                <p>
                                    {matchResult === 'win'
                                        ? 'Вы забрали этот раунд. Возвращаем вас в лобби вместе с соперником.'
                                        : 'Раунд завершён. Сейчас вы оба вернётесь в лобби и сможете начать заново.'}
                                </p>
                            </div>
                        )}
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
