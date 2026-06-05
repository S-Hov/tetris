import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { DEFAULT_LANGUAGE, getLanguageFromPathname } from '@/i18n'
import {
    ensureSocketSession,
    getStoredGuestSession,
    isValidGuestNickname,
    normalizeGuestNickname,
    socket,
} from '@/shared/api/socket'
import {
    defaultModeSettings,
    getModeSelectionConfig,
    MATCH_PLAY_OPTIONS,
    PLAY_MODE_KEYS,
    playOptionCards,
} from '@/shared/config/gameModes.js'
import { useAuth } from '@/shared/hooks/useAuth'
import AppSwitch from '@/shared/ui/AppSwitch'
import GlowEffect from '@/shared/ui/GlowEffect'
import PlayerStatsPanel, { buildPlayerStats } from '@/widgets/PlayerStatsPanel'
import '@/widgets/ProfileSideNav/ProfileSideNav.css'
import notify from '@/utils/Notifications'

import duelBanner from './assets/1v1/header_bg.png'
import teamBanner from './assets/2v2/header_bg.png'
import squadBanner from './assets/5v5/header_bg.png'
import royalBanner from './assets/royal/header_bg.png'
import soloBanner from './assets/solo/header_bg.png'
import './ModeSelectPage.css'

const modeBannerByKey = {
    [PLAY_MODE_KEYS.SOLO]: soloBanner,
    [PLAY_MODE_KEYS.DUEL_1V1]: duelBanner,
    [PLAY_MODE_KEYS.TEAM_2V2]: teamBanner,
    [PLAY_MODE_KEYS.SQUAD_5V5]: squadBanner,
    [PLAY_MODE_KEYS.ROYALE]: royalBanner,
}

const teamModeKeys = new Set([PLAY_MODE_KEYS.TEAM_2V2, PLAY_MODE_KEYS.SQUAD_5V5])

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
    const { isAuth, isLoading: isAuthLoading, user } = useAuth()
    const currentLanguage = getLanguageFromPathname(location.pathname) || DEFAULT_LANGUAGE
    const [guestNickname, setGuestNickname] = useState(() => getStoredGuestSession()?.nickname || '')
    const modeConfig = useMemo(() => getModeSelectionConfig(mode), [mode])
    const playerStats = useMemo(() => buildPlayerStats(user), [user])
    const isSoloMode = modeConfig.key === PLAY_MODE_KEYS.SOLO
    const hasTeams = teamModeKeys.has(modeConfig.key)
    const defaultPlayType = isSoloMode ? MATCH_PLAY_OPTIONS.CASUAL : MATCH_PLAY_OPTIONS.RANKED
    const [settings, setSettings] = useState(() => ({
        ...defaultModeSettings,
        ...(location.state?.roomSettings || {}),
    }))
    const roomActionEnabled = modeConfig.roomSupported
    const availablePlayOptions = modeConfig.availablePlayOptions || playOptionCards.map((option) => option.key)
    const visiblePlayOptions = playOptionCards.filter((option) => availablePlayOptions.includes(option.key))
    const [playTypeState, setPlayTypeState] = useState(() => ({
        modeKey: modeConfig.key,
        playType: defaultPlayType,
    }))
    const [matchmakingState, setMatchmakingState] = useState({
        isSearching: false,
        matchType: null,
        joinedAt: null,
        queueSize: 0,
        position: null,
    })
    const [waitSeconds, setWaitSeconds] = useState(0)
    const searchingRef = useRef(false)
    const selectedPlayType = playTypeState.modeKey === modeConfig.key ? playTypeState.playType : defaultPlayType
    const selectedPlayOption = visiblePlayOptions.find((option) => option.key === selectedPlayType) || visiblePlayOptions[0]
    const isRankedSelected = selectedPlayType === MATCH_PLAY_OPTIONS.RANKED
    const isRoomSelected = selectedPlayType === MATCH_PLAY_OPTIONS.ROOM
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

    const selectPlayType = (playType) => {
        setPlayTypeState({
            modeKey: modeConfig.key,
            playType,
        })
    }

    const startMatchmaking = async (matchType) => {
        if (!user && matchType === MATCH_PLAY_OPTIONS.RANKED) {
            notify('Войдите в аккаунт, чтобы искать рейтинговый матч', 'warning')
            return
        }

        if (!user && !isValidGuestNickname(guestNickname)) {
            notify('Введите никнейм для обычной игры: 2-24 символа', 'warning')
            return
        }

        try {
            await ensureSocketSession(user ? { user } : { nickname: guestNickname })

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
    }

    const cancelMatchmaking = async () => {
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
    }

    const getRoomSettings = (matchType) => ({
        ...settings,
        matchType,
    })

    const openSoloGame = () => {
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
    }

    const openTeamQueue = (intent = 'join') => {
        navigate(`/game/${modeConfig.key}/party`, {
            state: {
                modeKey: modeConfig.key,
                modeTitle: modeConfig.title,
                modeIcon: modeConfig.icon,
                roomSettings: getRoomSettings(selectedPlayType),
                partyIntent: intent,
            },
        })
    }

    const openLobby = () => {
        if (!roomActionEnabled) {
            notify('Комнаты для этого режима пока в разработке', 'info')
            return
        }

        navigate(`/game/${modeConfig.key}/lobby`, {
            state: {
                modeKey: modeConfig.key,
                modeTitle: modeConfig.title,
                modeIcon: modeConfig.icon,
                roomSettings: getRoomSettings('private'),
            },
        })
    }

    const handlePrimaryAction = async () => {
        if (matchmakingState.isSearching) {
            notify('Поиск уже идёт', 'info')
            return
        }

        if (isSoloMode) {
            openSoloGame()
            return
        }

        if (isRoomSelected) {
            openLobby()
            return
        }

        if (hasTeams) {
            openTeamQueue('join')
            return
        }

        if (!roomActionEnabled) {
            notify('Этот сценарий пока открыт как макет для будущего развития режима', 'info')
            return
        }

        await startMatchmaking(selectedPlayType)
    }

    return (
        <section className="section mode-select-page">
            <div className="container mode-select-layout profile-layout-shell">
                <ModePlayTypeNav
                    disabled={matchmakingState.isSearching}
                    items={visiblePlayOptions}
                    modeConfig={modeConfig}
                    roomActionEnabled={roomActionEnabled}
                    selectedPlayType={selectedPlayType}
                    onSelect={selectPlayType}
                />

                <div className="mode-select-content profile-layout-content">
                    <ModeHeroBanner
                        banner={modeBannerByKey[modeConfig.key]}
                        modeConfig={modeConfig}
                        selectedPlayOption={selectedPlayOption}
                    />

                    {!user && !isSoloMode && (
                        <GuestNamePanel
                            guestNickname={guestNickname}
                            onGuestNicknameChange={setGuestNickname}
                        />
                    )}

                    <div className="mode-select-workspace">
                        <div className="mode-select-workspace__main">
                            {isRankedSelected && (
                                <PlayerStatsPanel
                                    currentLanguage={currentLanguage}
                                    isAuth={isAuth}
                                    isLoading={isAuthLoading}
                                    playerStats={playerStats}
                                />
                            )}

                            <MatchSettingsPanel
                                isSoloMode={isSoloMode}
                                modeConfig={modeConfig}
                                selectedPlayOption={selectedPlayOption}
                                settings={settings}
                                settingsCopy={settingsCopy}
                                onToggle={handleToggle}
                            />
                        </div>

                        <div className="mode-select-workspace__aside">
                            <LaunchPanel
                                hasTeams={hasTeams}
                                isRoomSelected={isRoomSelected}
                                isSoloMode={isSoloMode}
                                matchmakingState={matchmakingState}
                                modeConfig={modeConfig}
                                roomActionEnabled={roomActionEnabled}
                                selectedPlayOption={selectedPlayOption}
                                onPrimaryAction={handlePrimaryAction}
                            />

                            {hasTeams && !isRoomSelected && (
                                <TeamCreatePanel
                                    modeConfig={modeConfig}
                                    selectedPlayOption={selectedPlayOption}
                                    onCreate={() => openTeamQueue('create')}
                                />
                            )}
                        </div>
                    </div>

                    {matchmakingState.isSearching && (
                        <MatchmakingPanel
                            matchmakingState={matchmakingState}
                            onCancel={cancelMatchmaking}
                            waitSeconds={waitSeconds}
                        />
                    )}

                    {/* {(hasTeams || isRoomSelected) && (
                        <ModeTablePanel
                            hasTeams={hasTeams}
                            isRoomSelected={isRoomSelected}
                            modeConfig={modeConfig}
                            selectedPlayOption={selectedPlayOption}
                            onOpenLobby={openLobby}
                            onOpenTeamQueue={() => openTeamQueue('join')}
                        />
                    )} */}
                </div>
            </div>
        </section>
    )
}

const ModePlayTypeNav = ({
    disabled,
    items,
    modeConfig,
    roomActionEnabled,
    selectedPlayType,
    onSelect,
}) => (
    <aside className="profile-sidebar mode-playtype-nav" aria-label="Выбор типа игры">
        {items.map((item) => {
            const isUnavailable = item.key === MATCH_PLAY_OPTIONS.ROOM && !roomActionEnabled
            const metaItems = modeConfig.cardMeta[item.key] || []

            return (
                <button
                    key={item.key}
                    type="button"
                    className={`profile-sidebar__item mode-playtype-nav__item ${selectedPlayType === item.key ? 'profile-sidebar__item--active' : ''}`}
                    disabled={disabled || isUnavailable}
                    onClick={() => onSelect(item.key)}
                >
                    <i className={item.icon}></i>
                    <span>{item.title}</span>
                    <small>{metaItems[0] || item.description}</small>
                    ${selectedPlayType === item.key ? <div class="border-glow"></div> : ''}
                </button>
            )
        })}
    </aside>
)

const ModeHeroBanner = ({ banner, modeConfig, selectedPlayOption }) => (
    <section className="mode-select-banner" style={{ '--mode-banner-image': `url(${banner})` }}>
        <GlowEffect>
            <div className="glow-effect mode-select-banner__content">
                <div className="mode-select-banner__copy">
                    <p className="mode-select-eyebrow">{selectedPlayOption?.title || modeConfig.heroLabel}</p>
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
)

const GuestNamePanel = ({ guestNickname, onGuestNicknameChange }) => (
    <section className="mode-panel mode-guest-panel">
        <GlowEffect>
            <div className="glow-effect mode-panel__content">
                <div className="profile-section-title">
                    <i className="fas fa-user-astronaut"></i>
                    Гостевая игра
                </div>

                <label className="mode-setting-row mode-setting-row--input">
                    <span>
                        <strong>Никнейм для обычной игры</strong>
                        <small>Рейтинговый матч остаётся только для аккаунтов.</small>
                    </span>
                    <input
                        type="text"
                        value={guestNickname}
                        onChange={(event) => onGuestNicknameChange(normalizeGuestNickname(event.target.value))}
                        placeholder="Guest"
                        maxLength={24}
                    />
                </label>
            </div>
        </GlowEffect>
    </section>
)

const MatchSettingsPanel = ({
    isSoloMode,
    modeConfig,
    selectedPlayOption,
    settings,
    settingsCopy,
    onToggle,
}) => (
    <section className="mode-panel mode-settings-panel">
        <GlowEffect>
            <div className="glow-effect mode-panel__content">
                <div className="profile-section-title">
                    <i className="fas fa-sliders-h"></i>
                    Настройки матча
                </div>

                <div className="mode-settings-grid">
                    <SettingToggle
                        title={settingsCopy.abilities.title}
                        description={settingsCopy.abilities.description}
                        checked={settings.abilitiesEnabled}
                        onToggle={() => onToggle('abilitiesEnabled')}
                    />

                    <SettingToggle
                        title={settingsCopy.specialBlocks.title}
                        description={settingsCopy.specialBlocks.description}
                        checked={settings.specialBlocksEnabled}
                        onToggle={() => onToggle('specialBlocksEnabled')}
                    />
                </div>

                <div className="mode-select-summary">
                    <div>
                        <span>Текущая конфигурация</span>
                        <strong>{modeConfig.title} / {selectedPlayOption?.title}</strong>
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
)

const LaunchPanel = ({
    hasTeams,
    isRoomSelected,
    isSoloMode,
    matchmakingState,
    modeConfig,
    roomActionEnabled,
    selectedPlayOption,
    onPrimaryAction,
}) => {
    const isUnavailable = !isSoloMode && !hasTeams && !roomActionEnabled
    const buttonLabel = getPrimaryButtonLabel({
        hasTeams,
        isRoomSelected,
        isSoloMode,
        isSearching: matchmakingState.isSearching,
        modeKey: modeConfig.key,
        selectedPlayType: selectedPlayOption?.key,
    })

    return (
        <section className="mode-panel mode-launch-panel">
            <GlowEffect>
                <div className="glow-effect mode-panel__content mode-launch-panel__content">
                    <div className="mode-action-icon">
                        <i className={isRoomSelected ? 'fas fa-door-open' : hasTeams ? 'fas fa-users' : 'fas fa-play'}></i>
                    </div>

                    <div>
                        <span className="mode-action-kicker">{selectedPlayOption?.title}</span>
                        <h2>{isRoomSelected ? 'Комната для друзей' : hasTeams ? 'Командный подбор' : 'Готово к старту'}</h2>
                        <p>
                            {isRoomSelected
                                ? 'Откройте лобби, настройте комнату и пригласите игроков.'
                                : hasTeams
                                    ? 'Сначала соберите команду, затем переходите к подбору соперников.'
                                    : 'Параметры матча применятся сразу после запуска.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="mode-primary-button btn-hover-shine"
                        disabled={matchmakingState.isSearching || isUnavailable}
                        onClick={onPrimaryAction}
                    >
                        <i className={isRoomSelected ? 'fas fa-arrow-right' : 'fas fa-play'}></i>
                        {isUnavailable ? 'Скоро будет' : buttonLabel}
                    </button>
                </div>
            </GlowEffect>
        </section>
    )
}

const TeamCreatePanel = ({ modeConfig, selectedPlayOption, onCreate }) => (
    <section className="mode-panel mode-create-team-panel">
        <GlowEffect>
            <div className="glow-effect mode-panel__content mode-create-team-panel__content">
                <div>
                    <span className="mode-action-kicker">{modeConfig.heroLabel}</span>
                    <h2>Создать команду</h2>
                    <p>Соберите состав под {selectedPlayOption?.title?.toLowerCase()} и пригласите напарников перед матчем.</p>
                </div>

                <button type="button" className="mode-secondary-button" onClick={onCreate}>
                    <i className="fas fa-plus"></i>
                    Создать команду
                </button>
            </div>
        </GlowEffect>
    </section>
)

const MatchmakingPanel = ({ matchmakingState, onCancel, waitSeconds }) => (
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
                    <p>Учитываем режим, способности и нестандартные блоки. Подходящий матч откроется автоматически.</p>
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

                <button type="button" className="mode-matchmaking-cancel" onClick={onCancel}>
                    <i className="fas fa-times"></i>
                    Отменить поиск
                </button>
            </div>
        </GlowEffect>
    </section>
)

const ModeTablePanel = ({
    hasTeams,
    isRoomSelected,
    modeConfig,
    selectedPlayOption,
    onOpenLobby,
    onOpenTeamQueue,
}) => {
    const rows = isRoomSelected ? getRoomRows(modeConfig) : getTeamRows(modeConfig, selectedPlayOption)

    return (
        <section className="mode-panel mode-table-panel">
            <GlowEffect>
                <div className="glow-effect mode-panel__content">
                    <div className="mode-table-heading">
                        <div className="profile-section-title">
                            <i className={isRoomSelected ? 'fas fa-door-open' : 'fas fa-users'}></i>
                            {isRoomSelected ? 'Открытые комнаты' : 'Команды в подборе'}
                        </div>

                        <button
                            type="button"
                            className="mode-table-action"
                            onClick={isRoomSelected ? onOpenLobby : onOpenTeamQueue}
                        >
                            <i className="fas fa-arrow-right"></i>
                            {isRoomSelected ? 'Открыть лобби' : 'К командам'}
                        </button>
                    </div>

                    <div className="mode-table">
                        <div className="mode-table__row mode-table__row--head">
                            <span>{isRoomSelected ? 'Комната' : 'Команда'}</span>
                            <span>{hasTeams && !isRoomSelected ? 'Состав' : 'Игроки'}</span>
                            <span>Тип</span>
                            <span>Статус</span>
                        </div>

                        {rows.map((row) => (
                            <div className="mode-table__row" key={row.name}>
                                <strong>{row.name}</strong>
                                <span>{row.players}</span>
                                <span>{row.type}</span>
                                <span className="mode-table__status">{row.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </GlowEffect>
        </section>
    )
}

const SettingToggle = ({ title, description, checked, onToggle }) => (
    <button type="button" className="mode-setting-row" onClick={onToggle}>
        <span>
            <strong>{title}</strong>
            <small>{description}</small>
        </span>
        <AppSwitch checked={checked} />
    </button>
)

const getPrimaryButtonLabel = ({
    hasTeams,
    isRoomSelected,
    isSoloMode,
    isSearching,
    modeKey,
    selectedPlayType,
}) => {
    if (isSearching) return 'Идёт поиск'
    if (isSoloMode) return 'Начать игру'
    if (isRoomSelected) return 'Открыть лобби'
    if (hasTeams) return 'Найти команду'
    if (modeKey === PLAY_MODE_KEYS.DUEL_1V1 && selectedPlayType === MATCH_PLAY_OPTIONS.RANKED) return 'Найти рейтинговый матч'

    return 'Найти матч'
}

const getTeamRows = (modeConfig, selectedPlayOption) => [
    {
        name: `${modeConfig.key.toUpperCase()} Alpha`,
        players: modeConfig.key === PLAY_MODE_KEYS.SQUAD_5V5 ? '4 / 5' : '1 / 2',
        type: selectedPlayOption?.title || 'Подбор',
        status: 'Ищут игрока',
    },
    {
        name: `${modeConfig.key.toUpperCase()} Pulse`,
        players: modeConfig.key === PLAY_MODE_KEYS.SQUAD_5V5 ? '3 / 5' : '2 / 2',
        type: selectedPlayOption?.title || 'Подбор',
        status: 'Готовы',
    },
    {
        name: `${modeConfig.key.toUpperCase()} Core`,
        players: modeConfig.key === PLAY_MODE_KEYS.SQUAD_5V5 ? '2 / 5' : '1 / 2',
        type: 'Свободный состав',
        status: 'Открыто',
    },
]

const getRoomRows = (modeConfig) => [
    {
        name: `${modeConfig.title} #1042`,
        players: modeConfig.key === PLAY_MODE_KEYS.DUEL_1V1 ? '1 / 2' : '2 / 4',
        type: 'Приватная',
        status: 'Ожидает',
    },
    {
        name: `${modeConfig.title} #1043`,
        players: modeConfig.key === PLAY_MODE_KEYS.DUEL_1V1 ? '0 / 2' : '1 / 4',
        type: 'С друзьями',
        status: 'Открыта',
    },
    {
        name: `${modeConfig.title} #1044`,
        players: modeConfig.key === PLAY_MODE_KEYS.DUEL_1V1 ? '1 / 2' : '3 / 4',
        type: 'Кастом',
        status: 'Сбор',
    },
]

const formatWaitTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const restSeconds = seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`
}

export default ModeSelectPage
