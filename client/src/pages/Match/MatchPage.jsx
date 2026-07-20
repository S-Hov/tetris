import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAbilityTimer } from '@/features/tetris/hooks/useAbilityTimer.js'
import { useGameCountdown } from '@/features/tetris/hooks/useGameCountdown.js'
import { useMatchResult } from '@/features/tetris/hooks/useMatchResult.js'
import { useMatchSocketSync } from '@/features/tetris/hooks/useMatchSocketSync.js'
import { useMobileTetrisControls } from '@/features/tetris/hooks/useMobileTetrisControls.js'
import { useSoloDebuffTimer } from '@/features/tetris/hooks/useSoloDebuffTimer.js'
import { useTetrisControls } from '@/features/tetris/hooks/useTetrisControls.js'
import { useTetrisGameLoop } from '@/features/tetris/hooks/useTetrisGameLoop.js'
import {
    getRandomEffects,
} from '@/features/tetris/effects/catalog.js'
import {
    getEffectPresentationState,
} from '@/features/tetris/effects/runtime.js'
import { useEffectCatalog } from '@/features/tetris/effects/useEffectCatalog.js'
import EffectBoardLayer from '@/features/tetris/effects/presentation/EffectBoardLayer.jsx'
import EffectPresentationLayer from '@/features/tetris/effects/presentation/EffectPresentationLayer.jsx'
import {
    GAME_AUDIO_CONFIG,
    getGameAudioEffect,
} from '@/features/tetris/config/gameAudio.config.js'
import { createBoard } from '@/features/tetris/model/createBoard.js'
import { GAME_MODE_REGISTRY, GAME_MODE_TYPES } from '@/features/tetris/model/gameModes.js'
import { MATCH_PLAY_MODES } from '@/features/tetris/model/matchPlayModes.js'
import { PC_CONTROL_ACTIONS } from '@/features/tetris/model/pcControls.js'
import {
    defaultMatchSettings,
    getRandomPieceGeneratorForSettings,
    normalizeMatchSettings,
} from '@/features/tetris/model/matchSettings.js'
import {
    ABILITY_CHOICE_COUNT,
    ABILITY_CHOICE_DURATION_MS,
} from '@/features/tetris/model/abilities.data.js'
import { resolveAbilityChoice, togglePause } from '@/features/tetris/model/tetrisEngine.js'
import AbilityOverlay from '@/features/tetris/ui/AbilityOverlay.jsx'
import ActionsPanel from '@/features/tetris/ui/ActionsPanel.jsx'
import EnergyPanel from '@/features/tetris/ui/EnergyPanel.jsx'
import GameCountdownOverlay from '@/features/tetris/ui/GameCountdownOverlay.jsx'
import GameLayout from '@/features/tetris/ui/GameLayout.jsx'
import MatchResultBanner from '@/features/tetris/ui/MatchResultBanner.jsx'
import MobileButtonsOverlay from '@/features/tetris/ui/MobileButtonsOverlay.jsx'
import NextPiecePanel from '@/features/tetris/ui/NextPiecePanel.jsx'
import PlayerSummaryPanel from '@/features/tetris/ui/PlayerSummaryPanel.jsx'
import SoloDebuffTimerPanel from '@/features/tetris/ui/SoloDebuffTimerPanel.jsx'
import StatsPanel from '@/features/tetris/ui/StatsPanel.jsx'
import TetrisBoard from '@/features/tetris/ui/TetrisBoard.jsx'
import { useActiveSkinPack } from '@/features/tetris/skins/useActiveSkinPack.js'
import gameStartSound from '@/features/tetris/assets/audio/game-start.mp3'
import hardDropSound from '@/features/tetris/assets/audio/hard_drop.mp3'
import { getLocalizedGamePath } from '@/i18n'
import { useAuth } from '@/shared/hooks/useAuth.js'
import useAudio from '@/shared/hooks/useAudio.js'
import { socket } from '@/shared/api/socket'
import { matchesAPI } from '@/shared/api/matches'
import notify from '@/utils/Notifications'

import gameFoundSound from './assets/audio/game_found.wav'
import loseSound from './assets/audio/lose.wav'
import winSound from './assets/audio/win.wav'
import './MatchPage.css'

const DANGER_ZONE_ROWS = 7
const BOARD_DEFEAT_ANIMATION_MS = 1240
const DEFAULT_ONLINE_MODE_KEY = '1v1'
const MATCH_INTRO_DURATION_MS = 5000
const EMPTY_OPPONENT_BOARD = createBoard()

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

const getRoomPlayers = (room) => {
    if (!room) {
        return []
    }

    if (Array.isArray(room.players)) {
        return room.players
    }

    return (room.teams || []).flatMap((team) => team.players || [])
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
    const { playEffect, playSynthEffect, stopMusic } = useAudio()
    const effectCatalog = useEffectCatalog()
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
                currentSettings.specialBlocksEnabled === normalizedSettings.specialBlocksEnabled &&
                currentSettings.soloGameDebuffsMockEnabled === normalizedSettings.soloGameDebuffsMockEnabled
            ) {
                return currentSettings
            }

            return normalizedSettings
        })
    }, [])
    const roomSettingsKey = [
        playMode,
        roomSettings.abilitiesEnabled,
        roomSettings.specialBlocksEnabled,
        roomSettings.soloGameDebuffsMockEnabled,
        effectCatalog.status,
    ].join(':')
    const needsEffectCatalog = roomSettings.abilitiesEnabled || roomSettings.soloGameDebuffsMockEnabled

    if (needsEffectCatalog && effectCatalog.isLoading) {
        return <div>Loading effects...</div>
    }

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
            effectCatalog={effectCatalog.effects}
            effectCatalogError={effectCatalog.error}
            user={user}
            playEffect={playEffect}
            playSynthEffect={playSynthEffect}
            stopMusic={stopMusic}
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
    effectCatalog,
    effectCatalogError,
    user,
    playEffect,
    playSynthEffect,
    stopMusic,
}) => {
    const { i18n } = useTranslation()
    const activeSkinPreset = useActiveSkinPack()
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'
    const randomPieceGenerator = useMemo(
        () => getRandomPieceGeneratorForSettings(roomSettings),
        [roomSettings]
    )
    const effectiveAbilitiesEnabled = roomSettings.abilitiesEnabled && effectCatalog.length > 0
    const getAbilityOptions = useCallback(
        () => getRandomEffects(effectCatalog, ABILITY_CHOICE_COUNT),
        [effectCatalog]
    )
    const [isIntroVisible, setIsIntroVisible] = useState(() => Boolean(isOnline && matchRoom?.players?.length))
    const [introSecondsLeft, setIntroSecondsLeft] = useState(() => Math.ceil(MATCH_INTRO_DURATION_MS / 1000))
    const [countdownStartedAt, setCountdownStartedAt] = useState(() => Date.now())
    const [targetChoice, setTargetChoice] = useState(null)
    const [targetSecondsLeft, setTargetSecondsLeft] = useState(0)
    const [soloRecord, setSoloRecord] = useState(() => Number(user?.rankStats?.bestSoloScore) || 0)
    const [isSpectatingTeammate, setIsSpectatingTeammate] = useState(false)
    const boardShellRef = useRef(null)
    const didPlayMatchFoundRef = useRef(false)
    const playedResultRef = useRef(null)
    const soloResultSubmittedRef = useRef(false)
    const previousClearingRowsCountRef = useRef(0)

    useEffect(() => {
        if (!effectiveAbilitiesEnabled) {
            return undefined
        }

        const preloadedImages = effectCatalog
            .map((effect) => effect.imageUrl)
            .filter(Boolean)
            .map((imageUrl) => {
                const image = new Image()
                image.decoding = 'async'
                image.src = imageUrl
                return image
            })

        return () => {
            preloadedImages.forEach((image) => {
                image.onload = null
                image.onerror = null
            })
        }
    }, [effectiveAbilitiesEnabled, effectCatalog])

    const { countdownValue, isCountingDown } = useGameCountdown({
        enabled: !isIntroVisible,
        startedAt: countdownStartedAt,
    })
    const shouldShowCountdown = !isIntroVisible && isCountingDown
    const wasCountingDownRef = useRef(false)
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
        abilitiesEnabled: effectiveAbilitiesEnabled,
        getAbilityOptions,
        paused: isIntroVisible || isCountingDown || isMatchFinished,
        randomPiece: randomPieceGenerator,
    })
    const {
        handleAbilityChoose: submitAbilityChoice,
        opponentState,
        roomPlayers,
    } = useMatchSocketSync({
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
        isChoosingAbility: derivedState.isChoosingAbility && !targetChoice,
        randomPiece: randomPieceGenerator,
        setGameState,
    })
    const isSoloDebuffsEnabled = !isOnline &&
        roomSettings.soloGameDebuffsMockEnabled &&
        effectCatalog.length > 0
    const soloDebuffTimer = useSoloDebuffTimer({
        effects: effectCatalog,
        enabled: isSoloDebuffsEnabled,
        paused: isIntroVisible ||
            isCountingDown ||
            isMatchFinished ||
            derivedState.isGameOver ||
            derivedState.isPaused ||
            derivedState.isClearing ||
            derivedState.isChoosingAbility ||
            Boolean(targetChoice),
        setGameState,
    })

    const handleTetrisActionSound = useCallback((action) => {
        let effectName = null
        let sound = null

        switch (action) {
            case PC_CONTROL_ACTIONS.MOVE_LEFT:
            case PC_CONTROL_ACTIONS.MOVE_RIGHT:
                effectName = 'move'
                break
            case PC_CONTROL_ACTIONS.SOFT_DROP:
                effectName = 'softDrop'
                break
            case PC_CONTROL_ACTIONS.ROTATE:
                effectName = 'rotate'
                break
            case PC_CONTROL_ACTIONS.HARD_DROP:
                effectName = 'hardDrop'
                sound = hardDropSound
                break
            default:
                return
        }

        const effect = getGameAudioEffect(effectName)

        if (!effect) {
            return
        }

        if (effect.synth) {
            playSynthEffect(effect.synth, { volume: effect.volume })
        } else {
            playEffect(sound, { volume: effect.volume })
        }
    }, [playEffect, playSynthEffect])

    useEffect(() => {
        const clearingRowsCount = derivedState.clearingRows?.length || 0

        if (clearingRowsCount > 0 && previousClearingRowsCountRef.current === 0) {
            const effect = getGameAudioEffect('lineClear')

            if (effect?.synth) {
                playSynthEffect(effect.synth, {
                    volume: effect.volume * Math.min(1.35, 0.9 + clearingRowsCount * 0.12),
                })
            }
        }

        previousClearingRowsCountRef.current = clearingRowsCount
    }, [derivedState.clearingRows, playSynthEffect])

    useTetrisControls({
        disabled: isIntroVisible || isMatchFinished || isCountingDown || Boolean(targetChoice),
        gameState: derivedState,
        onAction: handleTetrisActionSound,
        randomPiece: randomPieceGenerator,
        setGameState,
    })
    const mobileControls = useMobileTetrisControls({
        disabled: isIntroVisible || isMatchFinished || isCountingDown || Boolean(targetChoice),
        onAction: handleTetrisActionSound,
        randomPiece: randomPieceGenerator,
        setGameState,
        targetRef: boardShellRef,
    })

    useEffect(() => {
        if (effectCatalogError) {
            notify('Каталог эффектов недоступен. Способности временно отключены.', 'error')
        }
    }, [effectCatalogError])

    const dangerLevel = useMemo(() => getBoardDangerLevel(derivedState.board), [derivedState.board])
    const effectPresentation = useMemo(
        () => getEffectPresentationState(derivedState),
        [derivedState]
    )
    const isSoloGameOver = !isOnline && derivedState.isGameOver
    const currentRoomPlayers = roomPlayers.length > 0 ? roomPlayers : getRoomPlayers(matchRoom)
    const selfPlayer = currentRoomPlayers.find((player) => player.socketId === socket.id) || null
    const selfTeamNumber = selfPlayer?.teamNumber || null
    const isTeamMatch = isOnline && modeKey === '2v2'
    const teammatePlayers = isTeamMatch
        ? currentRoomPlayers.filter((player) => (
            player.socketId !== socket.id && player.teamNumber === selfTeamNumber
        ))
        : []
    const spectatedTeammate = teammatePlayers.find((player) => !player.gameState?.isGameOver) || teammatePlayers[0] || null
    const isEliminatedInTeamMatch = isTeamMatch && derivedState.isGameOver
    const isWatchingTeammate = Boolean(
        isEliminatedInTeamMatch &&
        !isMatchFinished &&
        isSpectatingTeammate &&
        spectatedTeammate
    )
    const viewedGameState = isWatchingTeammate ? spectatedTeammate.gameState : derivedState
    const viewedBoard = isWatchingTeammate
        ? (spectatedTeammate.gameState?.board || EMPTY_OPPONENT_BOARD)
        : boardWithPiece
    const viewedScore = Number(viewedGameState?.score) || 0
    const viewedLines = Number(viewedGameState?.linesCleared) || 0
    const viewedLevel = Number(viewedGameState?.level) || 1
    const hasFogPiece = Boolean(effectPresentation.fogPiece) && !derivedState.isGameOver
    const hasScreenShake = Boolean(effectPresentation.screenShake) && !derivedState.isGameOver
    const hasInvisibleCells = (effectPresentation.invisibleCells || false) && !derivedState.isGameOver
    const audibleResult = matchResult || ((isSoloGameOver || isEliminatedInTeamMatch) ? 'lose' : null)
    const opponentPlayers = isOnline
        ? currentRoomPlayers.filter((player) => (
            player.socketId !== socket.id && player.teamNumber !== selfTeamNumber
        ))
        : []
    const targetablePlayers = isOnline
        ? opponentPlayers.filter((player) => !player.gameState?.isGameOver)
        : []
    const shouldPickTarget = isOnline && modeKey !== '1v1' && targetablePlayers.length > 1
    const isDefeated = matchResult === 'lose' || isSoloGameOver || (isEliminatedInTeamMatch && !isWatchingTeammate)
    const isBoardInDanger = dangerLevel > 0 && !derivedState.isGameOver
    const boardShellClassName = [
        'player-board-shell',
        isBoardInDanger ? 'player-board-shell--danger' : '',
        hasScreenShake ? 'player-board-shell--effect-shake' : '',
        isDefeated ? 'player-board-shell--defeated' : '',
        isWatchingTeammate ? 'player-board-shell--spectating' : '',
        matchResult === 'win' ? 'player-board-shell--victorious' : '',
    ].filter(Boolean).join(' ')
    const dangerStyle = {
        '--danger-level': dangerLevel.toFixed(3),
        '--danger-shake-duration': `${Math.max(700 - dangerLevel * 420, 220)}ms`,
    }

    useEffect(() => {
        if (!isEliminatedInTeamMatch || isMatchFinished || !spectatedTeammate?.socketId) {
            return undefined
        }

        const timeoutId = setTimeout(() => {
            setIsSpectatingTeammate(true)
        }, BOARD_DEFEAT_ANIMATION_MS)

        return () => clearTimeout(timeoutId)
    }, [isEliminatedInTeamMatch, isMatchFinished, spectatedTeammate?.socketId])

    useEffect(() => {
        if (!isIntroVisible || didPlayMatchFoundRef.current) {
            return
        }

        didPlayMatchFoundRef.current = true
        const effect = getGameAudioEffect('gameFound')

        if (effect) {
            playEffect(gameFoundSound, { volume: effect.volume })
        }
    }, [isIntroVisible, playEffect])

    useEffect(() => {
        if (!wasCountingDownRef.current && isCountingDown) {
            if (GAME_AUDIO_CONFIG.stopMusicOnCountdownStart) {
                stopMusic()
            }

            const effect = getGameAudioEffect('countdown')

            if (effect) {
                playEffect(gameStartSound, { volume: effect.volume })
            }
        }

        wasCountingDownRef.current = isCountingDown
    }, [isCountingDown, playEffect, stopMusic])

    useEffect(() => {
        if (!audibleResult) {
            playedResultRef.current = null
            return
        }

        if (playedResultRef.current === audibleResult) {
            return
        }

        playedResultRef.current = audibleResult
        const effect = getGameAudioEffect(audibleResult)

        if (effect) {
            playEffect(audibleResult === 'win' ? winSound : loseSound, {
                volume: effect.volume,
            })
        }
    }, [audibleResult, playEffect])

    const handlePauseToggle = () => {
        if (isIntroVisible || isCountingDown) {
            return
        }

        setGameState((prevState) => togglePause(prevState))
    }

    const handleRestart = () => {
        resetGame()
        setTargetChoice(null)
        setIsIntroVisible(false)
        soloResultSubmittedRef.current = false
        setCountdownStartedAt(Date.now())
    }

    const handleAbilityPick = (ability) => {
        if (shouldPickTarget) {
            const endsAt = Date.now() + ABILITY_CHOICE_DURATION_MS

            setTargetChoice({
                ability,
                endsAt,
            })
            setTargetSecondsLeft(Math.ceil(ABILITY_CHOICE_DURATION_MS / 1000))
            return
        }

        submitAbilityChoice(ability)
    }

    const handleTargetPick = async (targetPlayer) => {
        if (!targetChoice?.ability || !targetPlayer?.socketId) {
            return
        }

        const success = await submitAbilityChoice(targetChoice.ability, targetPlayer.socketId)

        if (success) {
            setTargetChoice(null)
            setTargetSecondsLeft(0)
        }
    }

    useEffect(() => {
        if (isOnline || !user?.id) {
            return undefined
        }

        let isCancelled = false

        const loadSoloRecord = async () => {
            try {
                const response = await matchesAPI.getSoloRecord()

                if (!isCancelled) {
                    setSoloRecord(Number(response.record) || 0)
                }
            } catch {
                if (!isCancelled) {
                    setSoloRecord(Number(user?.rankStats?.bestSoloScore) || 0)
                }
            }
        }

        loadSoloRecord()

        return () => {
            isCancelled = true
        }
    }, [isOnline, user?.id, user?.rankStats?.bestSoloScore])

    useEffect(() => {
        if (isOnline || !derivedState.isGameOver || !user?.id || soloResultSubmittedRef.current) {
            return
        }

        soloResultSubmittedRef.current = true

        const submitSoloResult = async () => {
            try {
                const response = await matchesAPI.submitSoloResult({
                    score: derivedState.score,
                    linesCleared: derivedState.linesCleared,
                    levelReached: derivedState.level,
                })

                setSoloRecord(Number(response.record) || Math.max(soloRecord, derivedState.score))
            } catch {
                setSoloRecord((currentRecord) => Math.max(currentRecord, derivedState.score))
            }
        }

        submitSoloResult()
    }, [
        derivedState.isGameOver,
        derivedState.level,
        derivedState.linesCleared,
        derivedState.score,
        isOnline,
        soloRecord,
        user?.id,
    ])

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

    useEffect(() => {
        if (!targetChoice) {
            return undefined
        }

        const intervalId = setInterval(() => {
            setTargetSecondsLeft(Math.max(0, Math.ceil(((targetChoice.endsAt ?? 0) - Date.now()) / 1000)))
        }, 250)
        const timeoutId = setTimeout(() => {
            notify('Target window expired', 'warning')
            setTargetChoice(null)
            setTargetSecondsLeft(0)
            setGameState((prevState) => resolveAbilityChoice(prevState, null, { randomPiece: randomPieceGenerator }))
        }, Math.max(0, (targetChoice.endsAt ?? Date.now()) - Date.now()))

        return () => {
            clearInterval(intervalId)
            clearTimeout(timeoutId)
        }
    }, [randomPieceGenerator, setGameState, targetChoice])

    useEffect(() => {
        if (!targetChoice) {
            return undefined
        }

        if (targetablePlayers.length === 0) {
            const timeoutId = setTimeout(() => {
                notify('Нет доступной цели для эффекта', 'warning')
                setTargetChoice(null)
                setTargetSecondsLeft(0)
                setGameState((prevState) => resolveAbilityChoice(prevState, null, { randomPiece: randomPieceGenerator }))
            }, 0)

            return () => clearTimeout(timeoutId)
        }

        return undefined
    }, [randomPieceGenerator, setGameState, targetChoice, targetablePlayers.length])

    const introTeams = getIntroTeams(currentRoomPlayers, socket.id)
    const introPlayers = {
        self: introTeams.allies[0] || null,
        opponent: introTeams.opponents[0] || null,
    }

    const handleBackToModeSelect = () => {
        navigate(getLocalizedGamePath('/game/solo/casual'), {
            state: {
                roomSettings,
            },
        })
    }

    const boardDecor = (
        <>
            {isBoardInDanger && !isMatchFinished && (
                <div className="board-danger-status" aria-hidden="true">
                    <span>CRITICAL ZONE</span>
                    <strong>{Math.round(dangerLevel * 100)}%</strong>
                </div>
            )}

            {!isMatchFinished && !derivedState.isGameOver ? (
                <EffectBoardLayer
                    activeEffects={derivedState.activeEffects}
                    feedback={derivedState.effectFeedback}
                />
            ) : null}

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
        {
            key: 'controls',
            icon: 'fa-gear',
            label: 'Controls',
            mobileOnly: true,
            onClick: () => navigate(getLocalizedGamePath('/game/controls')),
        },
    ] : []

    const sidebar = (
        <>
            {isWatchingTeammate ? (
                <PlayerSummaryPanel
                    title={`Наблюдение: ${spectatedTeammate.username || 'тиммейт'}`}
                    score={viewedScore}
                    lines={viewedLines}
                    level={viewedLevel}
                    status="В игре"
                />
            ) : (
                <NextPiecePanel hidden={hasFogPiece} nextPiece={derivedState.nextPiece} skinPreset={activeSkinPreset} />
            )}
            <StatsPanel
                score={viewedScore}
                lines={viewedLines}
                level={viewedLevel}
                record={!isOnline ? Math.max(soloRecord, derivedState.score) : soloRecord}
            />
            {isOnline && !isTeamMatch ? (
                <PlayerSummaryPanel
                    title="Opponent"
                    score={opponentState.score}
                    lines={opponentState.linesCleared}
                    level={opponentState.level}
                    status={isMatchFinished ? 'Round ended' : opponentState.isGameOver ? 'Game Over' : 'Playing'}
                />
            ) : !isOnline ? (
                <>
                    {isSoloDebuffsEnabled ? (
                        <SoloDebuffTimerPanel
                            intervalSeconds={soloDebuffTimer.intervalSeconds}
                            progress={soloDebuffTimer.progress}
                            secondsLeft={soloDebuffTimer.secondsLeft}
                        />
                    ) : null}
                    <ActionsPanel actions={actions} />
                </>
            ) : null}
        </>
    )

    const headerStats = (
        <StatsPanel
            score={viewedScore}
            lines={viewedLines}
            level={viewedLevel}
            record={!isOnline ? Math.max(soloRecord, derivedState.score) : soloRecord}
        />
    )

    const secondaryColumn = isTeamMatch ? (
        <div className={`game-team-overview ${isWatchingTeammate ? 'game-team-overview--spectating' : ''}`}>
            {!isWatchingTeammate ? (
                <section className="game-team-overview__group game-team-overview__group--allies">
                    <header className="game-team-overview__header">
                        <span>Our team</span>
                        <strong>Teammate</strong>
                    </header>
                    <div className="game-team-overview__boards game-team-overview__boards--ally">
                        {teammatePlayers.map((player) => (
                            <SecondaryBoardCard key={player.socketId} player={player} fallbackLabel="Teammate" skinPreset={activeSkinPreset} />
                        ))}
                    </div>
                </section>
            ) : null}

            <section className="game-team-overview__group game-team-overview__group--opponents">
                <header className="game-team-overview__header">
                    <span>Opponent team</span>
                    <strong>{opponentPlayers.length} players</strong>
                </header>
                <div className="game-team-overview__boards game-team-overview__boards--opponents">
                    {opponentPlayers.map((player) => (
                        <SecondaryBoardCard key={player.socketId} player={player} fallbackLabel="Opponent" skinPreset={activeSkinPreset} />
                    ))}
                </div>
            </section>
        </div>
    ) : isOnline ? (
        <>
            <h2 className="game-layout__secondary-title">
                {opponentPlayers.length > 1 ? 'Opponent Boards' : 'Opponent Board'}
            </h2>
            <div className="game-layout__secondary-stack">
                {(opponentPlayers.length > 0 ? opponentPlayers : [{ socketId: 'opponent', gameState: opponentState }]).map((player) => (
                    <div className="game-layout__secondary-board" key={player.socketId}>
                        {opponentPlayers.length > 1 ? (
                            <span className="game-layout__secondary-name">{player.username || 'Opponent'}</span>
                        ) : null}
                        <TetrisBoard
                            board={player.gameState?.board || (opponentPlayers.length > 0 ? EMPTY_OPPONENT_BOARD : opponentState.board)}
                            clearingRows={[]}
                            compact
                            skinPreset={activeSkinPreset}
                        />
                    </div>
                ))}
            </div>
        </>
    ) : null

    const eliminationBanner = isEliminatedInTeamMatch && !isMatchFinished ? (
        <div
            className={`player-elimination-banner ${isWatchingTeammate ? 'player-elimination-banner--spectating' : ''}`}
            role="status"
            aria-live="polite"
        >
            <strong>{isWatchingTeammate ? `Наблюдение: ${spectatedTeammate.username || 'тиммейт'}` : 'Вы проиграли'}</strong>
            <span>{isWatchingTeammate ? 'Ваш тиммейт ещё в игре' : 'Команда ещё в игре'}</span>
        </div>
    ) : null

    const resultStats = {
        primary: {
            id: user?.id || 'self',
            name: user?.username || 'You',
            score: derivedState.score,
            lines: derivedState.linesCleared,
            level: derivedState.level,
            ...(!isOnline ? { record: Math.max(soloRecord, derivedState.score) } : {}),
        },
        secondary: isOnline ? [
            {
                id: 'opponent',
                name: introPlayers.opponent?.username || 'Opponent',
                score: opponentState.score,
                lines: opponentState.linesCleared,
                level: opponentState.level,
            },
        ] : [],
    }

    const soloResultOverlay = isSoloGameOver ? (
        <MatchResultBanner
            result="lose"
            eyebrow="Solo run ended"
            title="Игра окончена"
            description="Фигуры дошли до верхней границы. Можно сразу начать заново или вернуться к настройкам solo режима."
            stats={resultStats}
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
            stats={resultStats}
            description={matchResult === 'win'
                ? 'Раунд завершён в вашу пользу. Через пару секунд вы вернётесь в лобби вместе с соперником.'
                : 'Раунд завершён. Через пару секунд вы вернётесь в лобби и сможете начать новую попытку.'}
        />
    ) : null

    const overlay = (
        <>
            {effectiveAbilitiesEnabled && derivedState.isChoosingAbility && !targetChoice && !isEliminatedInTeamMatch ? (
                <AbilityOverlay
                    eyebrow={currentLanguage === 'en' ? 'Time stopped' : 'Время остановлено'}
                    title={currentLanguage === 'en' ? 'Choose an effect' : 'Выберите эффект'}
                    secondsLeft={abilitySecondsLeft}
                    options={derivedState.abilityOptions}
                    onChoose={handleAbilityPick}
                />
            ) : null}
            {targetChoice && !isEliminatedInTeamMatch ? (
                <TargetOverlay
                    ability={targetChoice.ability}
                    secondsLeft={targetSecondsLeft}
                    targets={targetablePlayers}
                    onChoose={handleTargetPick}
                />
            ) : null}
            {isIntroVisible ? (
                <MatchIntroOverlay
                    secondsLeft={introSecondsLeft}
                    isTeamMatch={isTeamMatch}
                    opponent={introPlayers.opponent}
                    self={introPlayers.self}
                    teams={introTeams}
                />
            ) : null}
            {shouldShowCountdown ? <GameCountdownOverlay value={countdownValue} /> : null}
            {!isMatchFinished && !derivedState.isGameOver ? (
                <EffectPresentationLayer
                    activeEffects={derivedState.activeEffects}
                    catalog={effectCatalog}
                    feedback={derivedState.effectFeedback}
                    playSynthEffect={playSynthEffect}
                />
            ) : null}
            {onlineResultOverlay}
            {soloResultOverlay}
            <MobileButtonsOverlay
                controls={mobileControls.settings.buttonControls}
                disabled={isIntroVisible || isMatchFinished || isCountingDown || isEliminatedInTeamMatch || Boolean(targetChoice)}
                onAction={mobileControls.runAction}
                visible={mobileControls.isButtonsEnabled}
            />
        </>
    )

    return (
        <GameLayout
            mode={isWatchingTeammate
                ? { ...mode, title: `Наблюдение: ${spectatedTeammate.username || 'тиммейт'}` }
                : isTeamMatch ? { ...mode, title: '2v2 Match' } : mode}
            score={viewedScore}
            board={viewedBoard}
            clearingRows={isWatchingTeammate ? [] : derivedState.clearingRows}
            boardClassName={isBoardInDanger ? 'tetris-board--danger' : ''}
            boardShellRef={boardShellRef}
            boardShellClassName={boardShellClassName}
            boardShellStyle={dangerStyle}
            boardDecor={boardDecor}
            boardInvisibleCells={hasInvisibleCells}
            leftRail={effectiveAbilitiesEnabled && !isWatchingTeammate ? <EnergyPanel energy={derivedState.energy} /> : null}
            headerStats={headerStats}
            sidebar={sidebar}
            overlay={overlay}
            banner={eliminationBanner}
            secondaryColumn={secondaryColumn}
            isTeamLayout={isTeamMatch}
            skinPreset={activeSkinPreset}
        />
    )
}

const SecondaryBoardCard = ({ player, fallbackLabel, skinPreset }) => (
    <article className={`game-team-board ${player.gameState?.isGameOver ? 'game-team-board--finished' : ''}`}>
        <header className="game-team-board__header">
            <span>{player.username || fallbackLabel}</span>
            <strong>{Number(player.gameState?.score) || 0}</strong>
        </header>
        <TetrisBoard
            board={player.gameState?.board || EMPTY_OPPONENT_BOARD}
            clearingRows={[]}
            compact
            skinPreset={skinPreset}
        />
    </article>
)

const MatchIntroOverlay = ({ self, opponent, secondsLeft, isTeamMatch, teams }) => (
    <div className="match-intro" role="dialog" aria-modal="true" aria-label="Знакомство соперников">
        <div className="match-intro__backdrop" aria-hidden="true" />
        <div className={`match-intro__panel ${isTeamMatch ? 'match-intro__panel--team' : ''}`}>
            <div className="match-intro__heading">
                <span>Match found</span>
                <h2>{isTeamMatch ? 'Команды готовы' : 'Соперники готовы'}</h2>
            </div>

            {isTeamMatch ? (
                <div className="match-intro__teams">
                    <IntroTeam
                        label="Команда 1"
                        players={teams?.allies || []}
                        titles={['Вы', 'Тиммейт']}
                    />
                    <div className="match-intro__versus match-intro__versus--team">VS</div>
                    <IntroTeam
                        label="Команда 2"
                        players={teams?.opponents || []}
                        titles={['Соперник 1', 'Соперник 2']}
                    />
                </div>
            ) : (
                <div className="match-intro__players">
                    <IntroPlayerCard title="Вы" player={self} />
                    <div className="match-intro__versus">VS</div>
                    <IntroPlayerCard title="Соперник" player={opponent} />
                </div>
            )}

            <div className="match-intro__footer">
                <i className="fas fa-bolt"></i>
                Старт через <strong>{secondsLeft}</strong> сек.
            </div>
        </div>
    </div>
)

const IntroTeam = ({ label, players, titles }) => (
    <section className="match-intro-team">
        <h3>{label}</h3>
        <div className="match-intro-team__players">
            {players.map((player, index) => (
                <IntroPlayerCard
                    key={player.socketId || player.userId || index}
                    title={titles[index] || `Игрок ${index + 1}`}
                    player={player}
                />
            ))}
        </div>
    </section>
)

const TargetOverlay = ({ ability, secondsLeft, targets, onChoose }) => (
    <div className="game-overlay" role="dialog" aria-modal="true" aria-labelledby="target-title">
        <div className="game-overlay__panel target-overlay__panel">
            <div className="game-overlay__header">
                <span className="game-overlay__eyebrow">Time stopped</span>
                <h3 className="game-overlay__title" id="target-title">Choose a target</h3>
                <p className="game-overlay__description">
                    {ability?.title || 'Debuff'} ready - {secondsLeft}s left
                </p>
            </div>

            <div className="target-overlay__options">
                {targets.map((player) => (
                    <button
                        type="button"
                        className="target-overlay__card"
                        key={player.socketId}
                        onClick={() => onChoose(player)}
                    >
                        <span className="target-overlay__avatar">
                            {player.avatarUrl ? (
                                renderAvatarMedia(getAssetUrl(player.avatarUrl), player.username)
                            ) : (
                                <i className="fas fa-user-astronaut"></i>
                            )}
                        </span>
                        <span className="target-overlay__body">
                            <span className="target-overlay__label">Team {player.teamNumber || '?'}</span>
                            <strong>{player.username || 'Opponent'}</strong>
                            <small>
                                Score {Number(player.gameState?.score) || 0} - Lines {Number(player.gameState?.linesCleared) || 0}
                            </small>
                        </span>
                    </button>
                ))}
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

const getIntroTeams = (players = [], currentSocketId) => {
    const self = players.find((player) => player.socketId === currentSocketId) || players[0] || null
    const selfTeamNumber = self?.teamNumber
    const allies = players
        .filter((player) => player.teamNumber === selfTeamNumber)
        .sort((left, right) => (
            Number(right.socketId === currentSocketId) - Number(left.socketId === currentSocketId)
        ))
    const opponents = players.filter((player) => player.teamNumber !== selfTeamNumber)

    return { allies, opponents }
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
    if (/\.(webm|mp4|mov|ogg|ogv|m4v)(?:[?#]|$)/i.test(src)) {
        return <video src={src} autoPlay loop muted playsInline aria-label={alt || 'avatar'} />
    }

    return <img src={src} alt={alt || 'avatar'} />
}

export default MatchPage
