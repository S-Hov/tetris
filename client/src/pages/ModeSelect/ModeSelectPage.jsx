import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import notify from '@/utils/Notifications'
import { useAuth } from '@/shared/hooks/useAuth'
import {
    ensureSocketSession,
    socket,
} from '@/shared/api/socket'
import {
    defaultModeSettings,
    getModeSelectionConfig,
    MATCH_PLAY_OPTIONS,
    PLAY_MODE_KEYS,
    playOptionCards,
} from '@/shared/config/gameModes.js'
import './ModeSelectPage.css'

const emitWithAck = (eventName, payload) => {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (response) => {
            resolve(response || { success: false, message: 'Нет ответа от сервера' })
        })
    })
}

const ModeSelectPage = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { mode } = useParams()
    const { user } = useAuth()
    const modeConfig = useMemo(() => getModeSelectionConfig(mode), [mode])
    const [settings, setSettings] = useState(() => ({
        ...defaultModeSettings,
        ...(location.state?.roomSettings || {}),
    }))
    const isSoloMode = modeConfig.key === PLAY_MODE_KEYS.SOLO
    const availablePlayOptions = modeConfig.availablePlayOptions || playOptionCards.map((option) => option.key)
    const visiblePlayCards = playOptionCards.filter((option) => availablePlayOptions.includes(option.key))
    const [selectedPlayType, setSelectedPlayType] = useState(() => (
        isSoloMode ? MATCH_PLAY_OPTIONS.CASUAL : MATCH_PLAY_OPTIONS.ROOM
    ))
    const [matchmakingState, setMatchmakingState] = useState({
        isSearching: false,
        matchType: null,
        joinedAt: null,
        queueSize: 0,
        position: null,
    })
    const [waitSeconds, setWaitSeconds] = useState(0)
    const searchingRef = useRef(false)

    const roomActionEnabled = modeConfig.roomSupported
    const settingsCopy = modeConfig.settingsCopy || {
        abilities: {
            title: 'Способности',
            description: 'Энергия, дебаффы и выбор эффектов во время матча.',
        },
        specialBlocks: {
            title: 'Нестандартные блоки',
            description: 'В пул фигур добавляются специальные нестандартные формы.',
        },
    }

    const handleToggle = (key) => {
        if (matchmakingState.isSearching) {
            notify('Сначала отмените текущий поиск', 'info')
            return
        }

        setSettings((currentValue) => ({
            ...currentValue,
            [key]: !currentValue[key],
        }))
    }

    useEffect(() => {
        searchingRef.current = matchmakingState.isSearching
    }, [matchmakingState.isSearching])

    useEffect(() => {
        if (!matchmakingState.isSearching || !matchmakingState.joinedAt) {
            return undefined
        }

        const joinedAtTime = new Date(matchmakingState.joinedAt).getTime()
        const updateWaitTime = () => {
            setWaitSeconds(Math.max(0, Math.floor((Date.now() - joinedAtTime) / 1000)))
        }

        updateWaitTime()
        const intervalId = window.setInterval(updateWaitTime, 1000)

        return () => window.clearInterval(intervalId)
    }, [matchmakingState.isSearching, matchmakingState.joinedAt])

    useEffect(() => {
        const handleSearching = (payload = {}) => {
            setMatchmakingState({
                isSearching: true,
                matchType: payload.matchType || selectedPlayType,
                joinedAt: payload.joinedAt || new Date().toISOString(),
                queueSize: payload.queueSize || 1,
                position: payload.position || 1,
            })
        }

        const handleCancelled = () => {
            setWaitSeconds(0)
            setMatchmakingState({
                isSearching: false,
                matchType: null,
                joinedAt: null,
                queueSize: 0,
                position: null,
            })
        }

        const handleFound = (payload = {}) => {
            setWaitSeconds(0)
            setMatchmakingState({
                isSearching: false,
                matchType: null,
                joinedAt: null,
                queueSize: 0,
                position: null,
            })
            notify('Соперник найден. Матч начинается', 'success')

            navigate(`/match/${payload.roomId}`, {
                state: {
                    roomSettings: payload.settings || settings,
                    modeKey: payload.modeKey || modeConfig.key,
                    matchType: payload.matchType,
                    room: payload.room || null,
                },
            })
        }

        socket.on('matchmaking:searching', handleSearching)
        socket.on('matchmaking:cancelled', handleCancelled)
        socket.on('matchmaking:found', handleFound)

        return () => {
            socket.off('matchmaking:searching', handleSearching)
            socket.off('matchmaking:cancelled', handleCancelled)
            socket.off('matchmaking:found', handleFound)
        }
    }, [modeConfig.key, navigate, selectedPlayType, settings])

    useEffect(() => {
        return () => {
            if (searchingRef.current && socket.connected) {
                socket.emit('matchmaking:leave')
            }
        }
    }, [])

    const startMatchmaking = useCallback(async (matchType) => {
        if (!user) {
            notify('Войдите в аккаунт, чтобы искать матч', 'warning')
            return
        }

        try {
            await ensureSocketSession({ user })

            const response = await emitWithAck('matchmaking:join', {
                modeKey: modeConfig.key,
                matchType,
                settings: {
                    abilitiesEnabled: settings.abilitiesEnabled,
                    specialBlocksEnabled: settings.specialBlocksEnabled,
                },
            })

            if (!response.success) {
                notify(response.message || 'Не удалось начать поиск', 'error')
                return
            }

            if (response.searching) {
                setWaitSeconds(0)
                setMatchmakingState({
                    isSearching: true,
                    matchType,
                    joinedAt: response.joinedAt || new Date().toISOString(),
                    queueSize: response.queueSize || 1,
                    position: response.position || 1,
                })
                notify('Поиск матча запущен', 'info')
            }
        } catch (error) {
            notify(error.message || 'Не удалось подключиться к поиску матча', 'error')
        }
    }, [modeConfig.key, settings.abilitiesEnabled, settings.specialBlocksEnabled, user])

    const cancelMatchmaking = useCallback(async () => {
        const response = await emitWithAck('matchmaking:leave', {})

        if (!response.success) {
            notify(response.message || 'Не удалось отменить поиск', 'error')
            return
        }

        setMatchmakingState({
            isSearching: false,
            matchType: null,
            joinedAt: null,
            queueSize: 0,
            position: null,
        })
        setWaitSeconds(0)
        notify('Поиск отменён', 'info')
    }, [])

    const handlePlayType = async (playType) => {
        if (matchmakingState.isSearching) {
            notify('Поиск уже идёт', 'info')
            return
        }

        setSelectedPlayType(playType)

        if (isSoloMode && playType === MATCH_PLAY_OPTIONS.CASUAL) {
            navigate('/game/solo/play', {
                state: {
                    modeKey: modeConfig.key,
                    modeTitle: modeConfig.title,
                    modeIcon: modeConfig.icon,
                    roomSettings: {
                        abilitiesEnabled: false,
                        soloGameDebuffsMockEnabled: settings.abilitiesEnabled,
                        specialBlocksEnabled: settings.specialBlocksEnabled,
                    },
                },
            })
            return
        }

        if (playType === MATCH_PLAY_OPTIONS.ROOM) {
            if (!roomActionEnabled) {
                notify('Комнаты для этого режима пока в разработке', 'info')
                return
            }

            navigate(`/game/${modeConfig.key}/lobby`, {
                state: {
                    modeKey: modeConfig.key,
                    modeTitle: modeConfig.title,
                    modeIcon: modeConfig.icon,
                    roomSettings: {
                        ...settings,
                        matchType: 'private',
                    },
                },
            })
            return
        }

        if (playType === MATCH_PLAY_OPTIONS.RANKED || playType === MATCH_PLAY_OPTIONS.CASUAL) {
            if (!roomActionEnabled) {
                notify('Этот сценарий пока открыт как макет для будущего развития режима', 'info')
                return
            }

            await startMatchmaking(playType)
            return
        }

        notify('Этот сценарий пока открыт как макет для будущего развития режима', 'info')
    }

    return (
        <section className="section mode-select-page">
            <div className="container mode-select-container">
                <section className="mode-select-banner">
                    <GlowEffect>
                        <div className="glow-effect mode-select-banner__content">
                            <div>
                                <p className="mode-select-eyebrow">{modeConfig.heroLabel}</p>
                                <h1>
                                    <i className={modeConfig.icon}></i>
                                    {modeConfig.title}
                                </h1>
                                <p>{modeConfig.subtitle}</p>
                            </div>

                            <div className="mode-select-online-badge">
                                <i className="fas fa-globe"></i>
                                {modeConfig.online}
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <section className="mode-select-options">
                    {visiblePlayCards.map((option) => {
                        const isSelected = selectedPlayType === option.key
                        const isDisabled = matchmakingState.isSearching ||
                            (option.key === MATCH_PLAY_OPTIONS.ROOM && !roomActionEnabled)
                        const metaItems = modeConfig.cardMeta[option.key] || []

                        return (
                            <button
                                key={option.key}
                                type="button"
                                className={`mode-option-card ${isSelected ? 'mode-option-card--active' : ''}`}
                                onClick={() => handlePlayType(option.key)}
                                disabled={isDisabled}
                            >
                                <GlowEffect>
                                    <div className="glow-effect mode-option-card__inner">
                                        <div className="mode-option-icon">
                                            <i className={option.icon}></i>
                                        </div>

                                        <h2>{option.emoji} {option.title}</h2>
                                        <p>{option.description}</p>

                                        <div className="mode-option-meta">
                                            {metaItems.map((item) => (
                                                <span key={item}>{item}</span>
                                            ))}
                                        </div>

                                        <div className="mode-option-footer">
                                            <span className={`mode-option-state ${isDisabled ? 'mode-option-state--disabled' : ''}`}>
                                                {isSoloMode
                                                    ? 'Начать игру'
                                                    : matchmakingState.isSearching
                                                        ? 'Идёт поиск'
                                                        : isDisabled
                                                            ? 'Скоро будет'
                                                            : option.key === MATCH_PLAY_OPTIONS.ROOM
                                                                ? 'Открыть лобби'
                                                                : 'Найти матч'}
                                            </span>
                                        </div>
                                    </div>
                                </GlowEffect>
                            </button>
                        )
                    })}
                </section>

                {matchmakingState.isSearching && (
                    <section className="mode-matchmaking-panel" aria-live="polite">
                        <GlowEffect>
                            <div className="glow-effect mode-matchmaking-panel__content">
                                <div className="mode-matchmaking-radar" aria-hidden="true">
                                    <span></span>
                                    <span></span>
                                    <i className="fas fa-crosshairs"></i>
                                </div>

                                <div className="mode-matchmaking-copy">
                                    <span>{matchmakingState.matchType === MATCH_PLAY_OPTIONS.RANKED ? 'Ranked queue' : 'Casual queue'}</span>
                                    <h2>Ищем соперника</h2>
                                    <p>
                                        Учитываем режим 1v1, способности и нестандартные блоки.
                                        Подходящая пара сразу попадёт в матч.
                                    </p>
                                </div>

                                <div className="mode-matchmaking-meta">
                                    <div>
                                        <span>Ожидание</span>
                                        <strong>{formatWaitTime(waitSeconds)}</strong>
                                    </div>
                                    <div>
                                        <span>Позиция</span>
                                        <strong>{matchmakingState.position || 1}</strong>
                                    </div>
                                </div>

                                <button type="button" className="mode-matchmaking-cancel" onClick={cancelMatchmaking}>
                                    <i className="fas fa-times"></i>
                                    Отменить поиск
                                </button>
                            </div>
                        </GlowEffect>
                    </section>
                )}

                <section className="mode-select-settings">
                    <GlowEffect>
                        <div className="glow-effect mode-select-settings__content">
                            <div className="profile-section-title">
                                <i className="fas fa-sliders-h"></i>
                                Настройки матча
                            </div>

                            <div className="mode-settings-grid">
                                <SettingToggle
                                    title={settingsCopy.abilities.title}
                                    description={settingsCopy.abilities.description}
                                    checked={settings.abilitiesEnabled}
                                    onToggle={() => handleToggle('abilitiesEnabled')}
                                />

                                <SettingToggle
                                    title={settingsCopy.specialBlocks.title}
                                    description={settingsCopy.specialBlocks.description}
                                    checked={settings.specialBlocksEnabled}
                                    onToggle={() => handleToggle('specialBlocksEnabled')}
                                />
                            </div>

                            <div className="mode-select-summary">
                                <div>
                                    <span>Текущая конфигурация</span>
                                    <strong>{modeConfig.title}</strong>
                                </div>
                                <div className="mode-select-pills">
                                    <span className={`mode-select-pill ${settings.abilitiesEnabled ? 'is-active' : ''}`}>
                                        {isSoloMode
                                            ? settings.abilitiesEnabled ? 'Подлянки: макет вкл.' : 'Подлянки: выкл.'
                                            : settings.abilitiesEnabled ? 'С эффектами' : 'Без эффектов'}
                                    </span>
                                    <span className={`mode-select-pill ${settings.specialBlocksEnabled ? 'is-active' : ''}`}>
                                        {settings.specialBlocksEnabled ? 'Нестандартные блоки вкл.' : 'Стандартные блоки'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </GlowEffect>
                </section>
            </div>
        </section>
    )
}

const SettingToggle = ({ title, description, checked, onToggle }) => (
    <button type="button" className="mode-setting-row" onClick={onToggle}>
        <span>
            <strong>{title}</strong>
            <small>{description}</small>
        </span>
        <span className={`mode-toggle ${checked ? 'mode-toggle--active' : ''}`}>
            <span></span>
        </span>
    </button>
)

const formatWaitTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const restSeconds = seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`
}

export default ModeSelectPage
