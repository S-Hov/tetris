import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { useAbilityTimer } from '@/features/tetris/hooks/useAbilityTimer.js'
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
import GameLayout from '@/features/tetris/ui/GameLayout.jsx'
import MatchResultBanner from '@/features/tetris/ui/MatchResultBanner.jsx'
import NextPiecePanel from '@/features/tetris/ui/NextPiecePanel.jsx'
import PlayerSummaryPanel from '@/features/tetris/ui/PlayerSummaryPanel.jsx'
import StatsPanel from '@/features/tetris/ui/StatsPanel.jsx'
import TetrisBoard from '@/features/tetris/ui/TetrisBoard.jsx'
import { useAuth } from '@/shared/hooks/useAuth.js'

import './MatchPage.css'

const DANGER_ZONE_ROWS = 7
const DEFAULT_ONLINE_MODE_KEY = '1v1'

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
    roomSettings,
    setRoomSettings,
    user,
}) => {
    const randomPieceGenerator = useMemo(
        () => getRandomPieceGeneratorForSettings(roomSettings),
        [roomSettings]
    )
    const {
        boardWithPiece,
        derivedState,
        resetGame,
        setGameState,
    } = useTetrisGameLoop({
        abilitiesEnabled: roomSettings.abilitiesEnabled,
        paused: false,
        randomPiece: randomPieceGenerator,
    })
    const { isMatchFinished, matchResult } = useMatchResult({
        enabled: isOnline,
        modeKey,
        navigate,
        roomId,
        roomSettings,
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
        disabled: isMatchFinished,
        randomPiece: randomPieceGenerator,
        setGameState,
    })

    const dangerLevel = useMemo(() => getBoardDangerLevel(derivedState.board), [derivedState.board])
    const hasDarkness = derivedState.activeEffects?.some(
        (effect) => effect.type === 'darkness'
    )
    const boardShellClassName = [
        'player-board-shell',
        dangerLevel > 0 ? 'player-board-shell--danger' : '',
        matchResult === 'lose' ? 'player-board-shell--defeated' : '',
        matchResult === 'win' ? 'player-board-shell--victorious' : '',
    ].filter(Boolean).join(' ')
    const dangerStyle = {
        '--danger-level': dangerLevel.toFixed(3),
        '--danger-shake-duration': `${Math.max(700 - dangerLevel * 420, 220)}ms`,
    }

    const handlePauseToggle = () => {
        setGameState((prevState) => togglePause(prevState))
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
            onClick: resetGame,
        },
    ] : []

    const sidebar = (
        <>
            <NextPiecePanel nextPiece={derivedState.nextPiece} />
            <StatsPanel
                score={derivedState.score}
                lines={derivedState.linesCleared}
                level={derivedState.level}
                status={derivedState.isPaused ? 'Paused' : 'Playing'}
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
            banner={isMatchFinished ? <MatchResultBanner result={matchResult} /> : null}
            secondaryColumn={secondaryColumn}
        />
    )
}

export default MatchPage
