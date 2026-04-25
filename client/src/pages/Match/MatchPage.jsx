import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import {
    LINE_CLEAR_ANIMATION_MS,
    createGameState,
    getRenderedBoard,
    hardDrop,
    movePiece,
    resolveAbilityChoice,
    resolveLineClear,
    rotateCurrentPiece,
    tickGame,
    togglePause,
    withDerivedState,
} from '@/features/tetris/model/tetrisEngine.js'
import { ABILITY_IDS } from '@/features/tetris/model/abilities.data.js'
import { GAME_MODE_REGISTRY, GAME_MODE_TYPES } from '@/features/tetris/model/gameModes.js'
import { createBoard } from '@/features/tetris/model/createBoard.js'
import AbilityOverlay from '@/features/tetris/ui/AbilityOverlay.jsx'
import EnergyPanel from '@/features/tetris/ui/EnergyPanel.jsx'
import GameLayout from '@/features/tetris/ui/GameLayout.jsx'
import MatchResultBanner from '@/features/tetris/ui/MatchResultBanner.jsx'
import NextPiecePanel from '@/features/tetris/ui/NextPiecePanel.jsx'
import PlayerSummaryPanel from '@/features/tetris/ui/PlayerSummaryPanel.jsx'
import StatsPanel from '@/features/tetris/ui/StatsPanel.jsx'
import TetrisBoard from '@/features/tetris/ui/TetrisBoard.jsx'
import { ensureSocketSession, socket } from '@/shared/api/socket/index.js'
import { useAuth } from '@/shared/hooks/useAuth.js'
import notify from '@/utils/Notifications'
import { EFFECT_TYPES, removeExpiredEffects } from '@/features/tetris/model/effects.js'
import {
    defaultMatchSettings,
    getRandomPieceGeneratorForSettings,
    normalizeMatchSettings,
} from '@/features/tetris/model/matchSettings.js'

import './MatchPage.css'

const CONTROL_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyS', 'KeyW', 'KeyP', 'Escape']
const getAbilitySecondsLeft = (endsAt) => Math.max(0, Math.ceil(((endsAt ?? 0) - Date.now()) / 1000))
const MATCH_END_REDIRECT_DELAY_MS = 3200
const DANGER_ZONE_ROWS = 7
const versusMode = GAME_MODE_REGISTRY[GAME_MODE_TYPES.VERSUS_1V1_EFFECTS]

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
    const location = useLocation()
    const [roomSettings, setRoomSettings] = useState(() => normalizeMatchSettings(location.state?.roomSettings || defaultMatchSettings))
    const randomPieceGenerator = useMemo(
        () => getRandomPieceGeneratorForSettings(roomSettings),
        [roomSettings]
    )
    const [gameState, setGameState] = useState(() => createGameState({
        abilitiesEnabled: roomSettings.abilitiesEnabled,
        randomPiece: randomPieceGenerator,
    }))
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
        setGameState(() => createGameState({
            abilitiesEnabled: roomSettings.abilitiesEnabled,
            randomPiece: randomPieceGenerator,
        }))
    }, [randomPieceGenerator, roomSettings.abilitiesEnabled])

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
                    return
                }

                if (response.room?.settings) {
                    setRoomSettings(normalizeMatchSettings(response.room.settings))
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
            setGameState((prevState) => {
                const cleanedState = removeExpiredEffects(prevState)
                return tickGame(cleanedState, { randomPiece: randomPieceGenerator })
            })
        }, derivedState.speed)

        return () => clearInterval(intervalId)
    }, [derivedState.isClearing, derivedState.isGameOver, derivedState.isPaused, derivedState.speed, derivedState.isChoosingAbility, isMatchFinished, randomPieceGenerator])

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
                        return hardDrop(prevState, { randomPiece: randomPieceGenerator })
                    default:
                        return prevState
                }
            })
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isMatchFinished, randomPieceGenerator])

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
                energy: derivedState.energy,
            }
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
        derivedState.energy
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
                navigate(`/game/${location.state?.modeKey || '1v1'}/lobby`, {
                    replace: true,
                    state: {
                        roomId,
                        matchResult: nextMatchResult,
                        winnerSocketId,
                        roomSettings,
                        modeKey: location.state?.modeKey || '1v1',
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
    }, [location.state?.modeKey, navigate, roomId, roomSettings])

    const handleAbilityChoose = (ability) => {
        if (!roomId) return

        socket.emit('ability:use', {
            roomId,
            abilityId: ability.id,
        }, (response) => {
            if (!response?.success) {
                notify(response?.message || 'Не удалось применить способность', 'error')
                return
            }

            notify(`${ability.title} activated`, 'success')
            setGameState((prev) => resolveAbilityChoice(prev, ability, { randomPiece: randomPieceGenerator }))
        })
    }

    useEffect(() => {
        const handleEffectApply = ({ effect }) => {
            if (!effect?.type) return

            const expiresAt = Date.now() + (effect.durationMs || 4000)

            setGameState((prevState) => ({
                ...prevState,
                activeEffects: [
                    ...prevState.activeEffects.filter((item) => item.type !== effect.type),
                    {
                        type: effect.type,
                        expiresAt,
                    },
                ],
            }))

            if (effect.type === 'speed_x2_for_4s') {
                notify('На вас применили ускорение x2 на 4 секунды', 'warning')
            }

            if (effect.type === 'darkness') {
                notify(`Поле затемнено на ${(effect.durationMs || 4000) / 1000} секунды`, 'warning')
            }
        }

        socket.on('effect:apply', handleEffectApply)

        return () => {
            socket.off('effect:apply', handleEffectApply)
        }
    }, [])

    const hasDarkness = derivedState.activeEffects?.some(
        (effect) => effect.type === 'darkness'
    )

    useEffect(() => {
        if (!derivedState.isChoosingAbility) return

        const intervalId = setInterval(() => {
            setAbilityTick((currentValue) => currentValue + 1)
        }, 250)

        const timeout = setTimeout(() => {
            notify('Ability window expired', 'warning')
            setGameState((prevState) => resolveAbilityChoice(prevState, null, { randomPiece: randomPieceGenerator }))
        }, Math.max(0, (derivedState.abilityChoiceEndsAt ?? Date.now()) - Date.now()))

        return () => {
            clearInterval(intervalId)
            clearTimeout(timeout)
        }
    }, [derivedState.abilityChoiceEndsAt, derivedState.isChoosingAbility, randomPieceGenerator])

    const dangerStyle = {
        '--danger-level': dangerLevel.toFixed(3),
        '--danger-shake-duration': `${Math.max(700 - dangerLevel * 420, 220)}ms`,
    }

    const boardDecor = (
        <>
            {dangerLevel > 0 && !isMatchFinished && (
                <div className="board-danger-status" aria-hidden="true">
                    <span>CRITICAL ZONE</span>
                    <strong>{Math.round(dangerLevel * 100)}%</strong>
                </div>
            )}

            {hasDarkness && !isMatchFinished && (
                <div className="board-darkness-layer" aria-hidden="true" />
            )}
        </>
    )


    const sidebar = (
        <>
            <NextPiecePanel nextPiece={derivedState.nextPiece} />
            <StatsPanel
                score={derivedState.score}
                lines={derivedState.linesCleared}
                level={derivedState.level}
                status={derivedState.isPaused ? 'Paused' : 'Playing'}
            />
            <PlayerSummaryPanel
                title="Opponent"
                score={opponentState.score}
                lines={opponentState.linesCleared}
                level={opponentState.level}
                status={isMatchFinished ? 'Round ended' : opponentState.isGameOver ? 'Game Over' : 'Playing'}
            />
        </>
    )

    const secondaryColumn = (
        <>
            <h2 className="game-layout__secondary-title">Opponent Board</h2>
            <div className="game-layout__secondary-board">
                <TetrisBoard board={opponentState.board} clearingRows={[]} compact />
            </div>
        </>
    )

    const overlay = roomSettings.abilitiesEnabled && derivedState.isChoosingAbility ? (
        <AbilityOverlay
            eyebrow="Time stopped"
            title="Choose a debuff"
            secondsLeft={abilitySecondsLeft}
            options={derivedState.abilityOptions}
            onChoose={handleAbilityChoose}
        />
    ) : null

    return (
        <GameLayout
            mode={versusMode}
            score={derivedState.score}
            board={boardWithPiece}
            clearingRows={derivedState.clearingRows}
            boardClassName={dangerLevel > 0 ? 'tetris-board--danger' : ''}
            boardShellClassName={boardShellClassName}
            boardShellStyle={dangerStyle}
            boardDecor={boardDecor}
            leftRail={roomSettings.abilitiesEnabled ? <EnergyPanel energy={derivedState.energy} /> : null}
            sidebar={sidebar}
            overlay={overlay}
            banner={isMatchFinished ? <MatchResultBanner result={matchResult} /> : null}
            secondaryColumn={secondaryColumn}
        />
    )
}

export default MatchPage
