import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { useAbilityTimer } from '@/features/tetris/hooks/useAbilityTimer.js'
import { useGameCountdown } from '@/features/tetris/hooks/useGameCountdown.js'
import { useMatchResult } from '@/features/tetris/hooks/useMatchResult.js'
import { useMatchSocketSync } from '@/features/tetris/hooks/useMatchSocketSync.js'
import { useTetrisControls } from '@/features/tetris/hooks/useTetrisControls.js'
import { useTetrisGameLoop } from '@/features/tetris/hooks/useTetrisGameLoop.js'
import { GAME_MODE_REGISTRY, GAME_MODE_TYPES } from '@/features/tetris/model/gameModes.js'
import { MATCH_PLAY_MODES } from '@/features/tetris/model/matchPlayModes.js'
import {
    defaultMatchSettings,
    getRandomPieceGeneratorForSettings,
    normalizeMatchSettings,
} from '@/features/tetris/model/matchSettings.js'
import { togglePause } from '@/features/tetris/model/tetrisEngine.js'
import AbilityOverlay from '@/features/tetris/ui/AbilityOverlay.jsx'
import ActionsPanel from '@/features/tetris/ui/ActionsPanel.jsx'
import EnergyPanel from '@/features/tetris/ui/EnergyPanel.jsx'
import GameCountdownOverlay from '@/features/tetris/ui/GameCountdownOverlay.jsx'
import GameLayout from '@/features/tetris/ui/GameLayout.jsx'
import MatchResultBanner from '@/features/tetris/ui/MatchResultBanner.jsx'
import NextPiecePanel from '@/features/tetris/ui/NextPiecePanel.jsx'
import PlayerSummaryPanel from '@/features/tetris/ui/PlayerSummaryPanel.jsx'
import StatsPanel from '@/features/tetris/ui/StatsPanel.jsx'
import TetrisBoard from '@/features/tetris/ui/TetrisBoard.jsx'
import { useAuth } from '@/shared/hooks/useAuth.js'
import { socket } from '@/shared/api/socket'

import './MatchPage.css'

const DANGER_ZONE_ROWS = 7
const DEFAULT_ONLINE_MODE_KEY = '1v1'
const MATCH_INTRO_DURATION_MS = 5000

const modeByPlayMode = {
    [MATCH_PLAY_MODES.ONLINE]: GAME_MODE_REGISTRY[GAME_MODE_TYPES.VERSUS_1V1_EFFECTS],
    [MATCH_PLAY_MODES.SOLO]: GAME_MODE_REGISTRY[GAME_MODE_TYPES.SOLO_CLASSIC],
}

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

const getInitialSettings = ({ initialSettings, locationState, playMode }) => {
    if (initialSettings) {
        return normalizeMatchSettings(initialSettings)
    }

    if (playMode === MATCH_PLAY_MODES.SOLO) {
        return normalizeMatchSettings({
            abilitiesEnabled: false,
            specialBlocksEnabled: false,
        })
    }

    return normalizeMatchSettings(locationState?.roomSettings || defaultMatchSettings)
}

const MatchPage = ({
    initialSettings,
    mode: modeProp,
    modeKey: modeKeyProp,
    playMode = MATCH_PLAY_MODES.ONLINE,
    roomId: roomIdProp,
}) => {
    const location = useLocation()
    const navigate = useNavigate()
    const params = useParams()
    const { user } = useAuth()
    const isOnline = playMode === MATCH_PLAY_MODES.ONLINE
    const roomId = roomIdProp ?? params.roomId
    const modeKey = modeKeyProp ?? location.state?.modeKey ?? DEFAULT_ONLINE_MODE_KEY
    const mode = modeProp ?? modeByPlayMode[playMode] ?? modeByPlayMode[MATCH_PLAY_MODES.ONLINE]
    const matchRoom = location.state?.room || null
    const [roomSettings, setRoomSettingsState] = useState(() => getInitialSettings({
        initialSettings,
        locationState: location.state,
        playMode,
    }))
    const setRoomSettings = useCallback((nextSettings) => {
        setRoomSettingsState((currentSettings) => {
            const normalizedSettings = normalizeMatchSettings(nextSettings)

            if (
                currentSettings.abilitiesEnabled === normalizedSettings.abilitiesEnabled &&
                currentSettings.specialBlocksEnabled === normalizedSettings.specialBlocksEnabled
            ) {
                return currentSettings
            }

            return normalizedSettings
        })
    }, [])
    const roomSettingsKey = `${playMode}:${roomSettings.abilitiesEnabled}:${roomSettings.specialBlocksEnabled}`

    return (
        <MatchPageGame
            key={roomSettingsKey}
            isOnline={isOnline}
            mode={mode}
            modeKey={modeKey}
            navigate={navigate}
            roomId={roomId}
            matchRoom={matchRoom}
            roomSettings={roomSettings}
            setRoomSettings={setRoomSettings}
            user={user}
        />
    )
}

const MatchPageGame = ({
    isOnline,
    mode,
    modeKey,
    navigate,
    roomId,
    matchRoom,
    roomSettings,
    setRoomSettings,
    user,
}) => {
    const randomPieceGenerator = useMemo(
        () => getRandomPieceGeneratorForSettings(roomSettings),
        [roomSettings]
    )
    const [isIntroVisible, setIsIntroVisible] = useState(() => Boolean(isOnline && matchRoom?.players?.length))
    const [introSecondsLeft, setIntroSecondsLeft] = useState(() => Math.ceil(MATCH_INTRO_DURATION_MS / 1000))
    const [countdownStartedAt, setCountdownStartedAt] = useState(() => Date.now())
    const { countdownValue, isCountingDown } = useGameCountdown({
        enabled: !isIntroVisible,
        startedAt: countdownStartedAt,
    })
    const shouldShowCountdown = !isIntroVisible && isCountingDown
    const { isMatchFinished, matchResult } = useMatchResult({
        enabled: isOnline,
        modeKey,
        navigate,
        roomId,
        roomSettings,
    })
    const {
        boardWithPiece,
        derivedState,
        resetGame,
        setGameState,
    } = useTetrisGameLoop({
        abilitiesEnabled: roomSettings.abilitiesEnabled,
        paused: isIntroVisible || isCountingDown || isMatchFinished,
        randomPiece: randomPieceGenerator,
    })
    const { handleAbilityChoose, opponentState } = useMatchSocketSync({
        boardWithPiece,
        derivedState,
        enabled: isOnline,
        isMatchFinished,
        randomPiece: randomPieceGenerator,
        roomId,
        setGameState,
        setRoomSettings,
        user,
    })
    const abilitySecondsLeft = useAbilityTimer({
        abilityChoiceEndsAt: derivedState.abilityChoiceEndsAt,
        isChoosingAbility: derivedState.isChoosingAbility,
        randomPiece: randomPieceGenerator,
        setGameState,
    })

    useTetrisControls({
        disabled: isIntroVisible || isMatchFinished || isCountingDown,
        randomPiece: randomPieceGenerator,
        setGameState,
    })

    const dangerLevel = useMemo(() => getBoardDangerLevel(derivedState.board), [derivedState.board])
    const hasDarkness = derivedState.activeEffects?.some(
        (effect) => effect.type === 'darkness'
    )
    const isSoloGameOver = !isOnline && derivedState.isGameOver
    const isDefeated = matchResult === 'lose' || isSoloGameOver
    const boardShellClassName = [
        'player-board-shell',
        dangerLevel > 0 ? 'player-board-shell--danger' : '',
        isDefeated ? 'player-board-shell--defeated' : '',
        matchResult === 'win' ? 'player-board-shell--victorious' : '',
    ].filter(Boolean).join(' ')
    const dangerStyle = {
        '--danger-level': dangerLevel.toFixed(3),
        '--danger-shake-duration': `${Math.max(700 - dangerLevel * 420, 220)}ms`,
    }

    const handlePauseToggle = () => {
        if (isIntroVisible || isCountingDown) {
            return
        }

        setGameState((prevState) => togglePause(prevState))
    }

    const handleRestart = () => {
        resetGame()
        setIsIntroVisible(false)
        setCountdownStartedAt(Date.now())
    }

    useEffect(() => {
        if (!isIntroVisible) {
            return undefined
        }

        const introStartedAt = Date.now()
        const timeoutId = setTimeout(() => {
            setIsIntroVisible(false)
            setIntroSecondsLeft(Math.ceil(MATCH_INTRO_DURATION_MS / 1000))
            setCountdownStartedAt(Date.now())
        }, MATCH_INTRO_DURATION_MS)
        const intervalId = setInterval(() => {
            const elapsedMs = Date.now() - introStartedAt
            const nextSecondsLeft = Math.max(1, Math.ceil((MATCH_INTRO_DURATION_MS - elapsedMs) / 1000))

            setIntroSecondsLeft(nextSecondsLeft)
        }, 200)

        return () => {
            clearTimeout(timeoutId)
            clearInterval(intervalId)
        }
    }, [isIntroVisible])

    const introPlayers = getIntroPlayers(matchRoom)

    const handleBackToModeSelect = () => {
        navigate('/game/solo', {
            state: {
                roomSettings,
            },
        })
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

    const actions = !isOnline ? [
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
    ] : []

    const sidebar = (
        <>
            <NextPiecePanel nextPiece={derivedState.nextPiece} />
            <StatsPanel
                score={derivedState.score}
                lines={derivedState.linesCleared}
                level={derivedState.level}
                status={isCountingDown ? 'Starting' : derivedState.isPaused ? 'Paused' : 'Playing'}
            />
            {isOnline ? (
                <PlayerSummaryPanel
                    title="Opponent"
                    score={opponentState.score}
                    lines={opponentState.linesCleared}
                    level={opponentState.level}
                    status={isMatchFinished ? 'Round ended' : opponentState.isGameOver ? 'Game Over' : 'Playing'}
                />
            ) : (
                <ActionsPanel actions={actions} />
            )}
        </>
    )

    const secondaryColumn = isOnline ? (
        <>
            <h2 className="game-layout__secondary-title">Opponent Board</h2>
            <div className="game-layout__secondary-board">
                <TetrisBoard board={opponentState.board} clearingRows={[]} compact />
            </div>
        </>
    ) : null

    const soloResultOverlay = isSoloGameOver ? (
        <MatchResultBanner
            result="lose"
            eyebrow="Solo run ended"
            title="Игра окончена"
            description="Фигуры дошли до верхней границы. Можно сразу начать заново или вернуться к настройкам solo режима."
            actions={[
                {
                    key: 'restart',
                    icon: 'fa-rotate-right',
                    label: 'Сыграть заново',
                    onClick: handleRestart,
                },
                {
                    key: 'mode-select',
                    icon: 'fa-sliders',
                    label: 'К выбору режима',
                    onClick: handleBackToModeSelect,
                    variant: 'secondary',
                },
            ]}
        />
    ) : null

    const onlineResultOverlay = isMatchFinished ? (
        <MatchResultBanner
            result={matchResult}
            description={matchResult === 'win'
                ? 'Раунд завершён в вашу пользу. Через пару секунд вы вернётесь в лобби вместе с соперником.'
                : 'Раунд завершён. Через пару секунд вы вернётесь в лобби и сможете начать новую попытку.'}
        />
    ) : null

    const overlay = (
        <>
            {roomSettings.abilitiesEnabled && derivedState.isChoosingAbility ? (
                <AbilityOverlay
                    eyebrow="Time stopped"
                    title="Choose a debuff"
                    secondsLeft={abilitySecondsLeft}
                    options={derivedState.abilityOptions}
                    onChoose={handleAbilityChoose}
                />
            ) : null}
            {isIntroVisible ? (
                <MatchIntroOverlay
                    secondsLeft={introSecondsLeft}
                    opponent={introPlayers.opponent}
                    self={introPlayers.self}
                />
            ) : null}
            {shouldShowCountdown ? <GameCountdownOverlay value={countdownValue} /> : null}
            {onlineResultOverlay}
            {soloResultOverlay}
        </>
    )

    return (
        <GameLayout
            mode={mode}
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
            banner={null}
            secondaryColumn={secondaryColumn}
        />
    )
}

const MatchIntroOverlay = ({ self, opponent, secondsLeft }) => (
    <div className="match-intro" role="dialog" aria-modal="true" aria-label="Знакомство соперников">
        <div className="match-intro__backdrop" aria-hidden="true" />
        <div className="match-intro__panel">
            <div className="match-intro__heading">
                <span>Match found</span>
                <h2>Соперники готовы</h2>
            </div>

            <div className="match-intro__players">
                <IntroPlayerCard title="Вы" player={self} />
                <div className="match-intro__versus">VS</div>
                <IntroPlayerCard title="Соперник" player={opponent} />
            </div>

            <div className="match-intro__footer">
                <i className="fas fa-bolt"></i>
                Старт через <strong>{secondsLeft}</strong> сек.
            </div>
        </div>
    </div>
)

const IntroPlayerCard = ({ title, player }) => {
    const stats = player?.rankStats || {}
    const totalMatches = Number(stats.totalMatches) || 0
    const wins = Number(stats.wins) || 0
    const losses = Number(stats.losses) || 0
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

    return (
        <article className="match-intro-player">
            <span>{title}</span>
            <div className="match-intro-player__avatar">
                {player?.avatarUrl ? (
                    renderAvatarMedia(getAssetUrl(player.avatarUrl), player.username)
                ) : (
                    <i className="fas fa-user-astronaut"></i>
                )}
            </div>
            <h3>{player?.username || 'Игрок'}</h3>
            <div className="match-intro-player__stats">
                <small>RP <strong>{Number(stats.rankPoints) || 0}</strong></small>
                <small>MMR <strong>{Number(stats.mmr) || 1000}</strong></small>
                <small>W/L <strong>{wins}/{losses}</strong></small>
                <small>WR <strong>{winRate}%</strong></small>
            </div>
        </article>
    )
}

const getIntroPlayers = (matchRoom) => {
    const players = Array.isArray(matchRoom?.players) ? matchRoom.players : []
    const self = players.find((player) => player.socketId === socket.id) || players[0] || null
    const opponent = players.find((player) => player.socketId !== socket.id) || players[1] || null

    return { self, opponent }
}

const getAssetUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value

    const baseUrl = import.meta.env.VITE_API_URL || (
        typeof window !== 'undefined' && window.location.hostname
            ? `http://${window.location.hostname}:8880`
            : 'http://127.0.0.1:8880'
    )

    return `${baseUrl}${value}`
}

const renderAvatarMedia = (src, alt) => {
    if (src.toLowerCase().includes('.webm')) {
        return <video src={src} autoPlay loop muted playsInline aria-label={alt || 'avatar'} />
    }

    return <img src={src} alt={alt || 'avatar'} />
}

export default MatchPage
