import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, getLanguageFromPathname, getLocalizedPath } from '@/i18n'
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

const emitWithAck = (eventName, payload, fallbackMessage) => {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (response) => {
            resolve(response || { success: false, message: fallbackMessage })
        })
    })
}

const ModeSelectPage = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { mode } = useParams()
    const { t, i18n } = useTranslation()
    const { isAuth, isLoading: isAuthLoading, user } = useAuth()
    const currentLanguage = getLanguageFromPathname(location.pathname) || DEFAULT_LANGUAGE
    const [guestNickname, setGuestNickname] = useState(() => getStoredGuestSession()?.nickname || '')
    const modeConfig = useMemo(() => getModeSelectionConfig(mode), [mode])
    const translatedModeConfig = useMemo(() => buildTranslatedModeConfig(modeConfig, t), [modeConfig, t])
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
    const visiblePlayOptions = useMemo(() => (
        playOptionCards
            .filter((option) => availablePlayOptions.includes(option.key))
            .map((option) => buildTranslatedPlayOption(option, t))
    ), [availablePlayOptions, t])
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
    const settingsCopy = translatedModeConfig.settingsCopy || {
        abilities: {
            title: t('modeSelect.settings.fallbackAbilitiesTitle'),
            description: t('modeSelect.settings.fallbackAbilitiesDescription'),
        },
        specialBlocks: {
            title: t('modeSelect.settings.fallbackSpecialBlocksTitle'),
            description: t('modeSelect.settings.fallbackSpecialBlocksDescription'),
        },
    }

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    const handleToggle = (key) => {
        if (matchmakingState.isSearching) {
            notify(t('modeSelect.notifications.cancelCurrentSearch'), 'info')
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
            notify(t('modeSelect.notifications.opponentFound'), 'success')

            navigate(getLocalizedPath(`/match/${payload.roomId}`, currentLanguage), {
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
    }, [currentLanguage, modeConfig.key, navigate, selectedPlayType, settings, t])

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
            notify(t('modeSelect.notifications.loginForRanked'), 'warning')
            return
        }

        if (!user && !isValidGuestNickname(guestNickname)) {
            notify(t('modeSelect.notifications.guestNicknameRequired'), 'warning')
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
            }, t('modeSelect.socket.noResponse'))

            if (!response.success) {
                notify(response.message || t('modeSelect.notifications.startSearchFailed'), 'error')
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
                notify(t('modeSelect.notifications.searchStarted'), 'info')
            }
        } catch (error) {
            notify(error.message || t('modeSelect.notifications.connectionFailed'), 'error')
        }
    }

    const cancelMatchmaking = async () => {
        const response = await emitWithAck('matchmaking:leave', {}, t('modeSelect.socket.noResponse'))

        if (!response.success) {
            notify(response.message || t('modeSelect.notifications.cancelSearchFailed'), 'error')
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
        notify(t('modeSelect.notifications.searchCancelled'), 'info')
    }

    const getRoomSettings = (matchType) => ({
        ...settings,
        matchType,
    })

    const getGamePath = (path) => `/${currentLanguage}${path}`

    const openSoloGame = () => {
        navigate(getGamePath('/game/solo/play'), {
            state: {
                modeKey: modeConfig.key,
                modeTitle: translatedModeConfig.title,
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
        if (!user && selectedPlayType === MATCH_PLAY_OPTIONS.RANKED) {
            notify(t('modeSelect.notifications.loginForRanked'), 'warning')
            return
        }

        if (!user && !isValidGuestNickname(guestNickname)) {
            notify(t('modeSelect.notifications.guestNicknameRequired'), 'warning')
            return
        }

        navigate(getGamePath(`/game/${modeConfig.key}/party`), {
            state: {
                modeKey: modeConfig.key,
                modeTitle: translatedModeConfig.title,
                modeIcon: modeConfig.icon,
                roomSettings: getRoomSettings(selectedPlayType),
                guestNickname: user ? undefined : guestNickname,
                partyIntent: intent,
            },
        })
    }

    const openLobby = () => {
        if (!roomActionEnabled) {
            notify(t('modeSelect.notifications.roomsComingSoon'), 'info')
            return
        }

        navigate(getGamePath(`/game/${modeConfig.key}/lobby`), {
            state: {
                modeKey: modeConfig.key,
                modeTitle: translatedModeConfig.title,
                modeIcon: modeConfig.icon,
                roomSettings: getRoomSettings('private'),
            },
        })
    }

    const handlePrimaryAction = async () => {
        if (matchmakingState.isSearching) {
            notify(t('modeSelect.notifications.searchAlreadyRunning'), 'info')
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
            notify(t('modeSelect.notifications.scenarioMock'), 'info')
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
                    modeConfig={translatedModeConfig}
                    roomActionEnabled={roomActionEnabled}
                    selectedPlayType={selectedPlayType}
                    t={t}
                    onOpenSettings={() => navigate(getGamePath('/game/controls'))}
                    onSelect={selectPlayType}
                />

                <div className="mode-select-content profile-layout-content">
                    <ModeHeroBanner
                        banner={modeBannerByKey[modeConfig.key]}
                        modeConfig={translatedModeConfig}
                        selectedPlayOption={selectedPlayOption}
                    />

                    {!user && !isSoloMode && (
                        <GuestNamePanel
                            guestNickname={guestNickname}
                            t={t}
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
                                modeConfig={translatedModeConfig}
                                selectedPlayOption={selectedPlayOption}
                                settings={settings}
                                settingsCopy={settingsCopy}
                                t={t}
                                onToggle={handleToggle}
                            />
                        </div>

                        <div className="mode-select-workspace__aside">
                            <LaunchPanel
                                hasTeams={hasTeams}
                                isRoomSelected={isRoomSelected}
                                isSoloMode={isSoloMode}
                                matchmakingState={matchmakingState}
                                modeConfig={translatedModeConfig}
                                roomActionEnabled={roomActionEnabled}
                                selectedPlayOption={selectedPlayOption}
                                t={t}
                                onPrimaryAction={handlePrimaryAction}
                            />

                            {hasTeams && !isRoomSelected && (
                                <TeamCreatePanel
                                    modeConfig={translatedModeConfig}
                                    selectedPlayOption={selectedPlayOption}
                                    t={t}
                                    onCreate={() => openTeamQueue('create')}
                                />
                            )}
                        </div>
                    </div>

                    {matchmakingState.isSearching && (
                        <MatchmakingPanel
                            matchmakingState={matchmakingState}
                            t={t}
                            onCancel={cancelMatchmaking}
                            waitSeconds={waitSeconds}
                        />
                    )}

                    {/* {(hasTeams || isRoomSelected) && (
                        <ModeTablePanel
                            hasTeams={hasTeams}
                            isRoomSelected={isRoomSelected}
                            modeConfig={translatedModeConfig}
                            selectedPlayOption={selectedPlayOption}
                            t={t}
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
    t,
    onOpenSettings,
    onSelect,
}) => (
    <aside className="profile-sidebar mode-playtype-nav" aria-label={t('modeSelect.aria.playTypeNav')}>
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
                    {selectedPlayType === item.key ? <div className="border-glow"></div> : ''}
                </button>
            )
        })}
        <button
            type="button"
            className="profile-sidebar__item mode-playtype-nav__item"
            onClick={onOpenSettings}
        >
            <i className="fas fa-gear"></i>
            <span>{t('gameControls.settings.title')}</span>
            <small>{t('gameControls.settings.controlsTitle')}</small>
        </button>
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

const GuestNamePanel = ({ guestNickname, t, onGuestNicknameChange }) => (
    <section className="mode-panel mode-guest-panel">
        <GlowEffect>
            <div className="glow-effect mode-panel__content">
                <div className="profile-section-title">
                    <i className="fas fa-user-astronaut"></i>
                    {t('modeSelect.guest.title')}
                </div>

                <label className="mode-setting-row mode-setting-row--input">
                    <span>
                        <strong>{t('modeSelect.guest.nicknameLabel')}</strong>
                        <small>{t('modeSelect.guest.nicknameHint')}</small>
                    </span>
                    <input
                        type="text"
                        value={guestNickname}
                        onChange={(event) => onGuestNicknameChange(normalizeGuestNickname(event.target.value))}
                        placeholder={t('modeSelect.guest.placeholder')}
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
    t,
    onToggle,
}) => (
    <section className="mode-panel mode-settings-panel">
        <GlowEffect>
            <div className="glow-effect mode-panel__content">
                <div className="profile-section-title">
                    <i className="fas fa-sliders-h"></i>
                    {t('modeSelect.settings.title')}
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
                        <span>{t('modeSelect.settings.summaryLabel')}</span>
                        <strong>{modeConfig.title} / {selectedPlayOption?.title}</strong>
                    </div>
                    <div className="mode-select-pills">
                        <span className={`mode-select-pill ${settings.abilitiesEnabled ? 'is-active' : ''}`}>
                            {isSoloMode
                                ? settings.abilitiesEnabled ? t('modeSelect.settings.soloAbilitiesOn') : t('modeSelect.settings.soloAbilitiesOff')
                                : settings.abilitiesEnabled ? t('modeSelect.settings.abilitiesOn') : t('modeSelect.settings.abilitiesOff')}
                        </span>
                        <span className={`mode-select-pill ${settings.specialBlocksEnabled ? 'is-active' : ''}`}>
                            {settings.specialBlocksEnabled ? t('modeSelect.settings.specialBlocksOn') : t('modeSelect.settings.specialBlocksOff')}
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
    t,
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
        t,
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
                        <h2>{isRoomSelected ? t('modeSelect.launch.roomTitle') : hasTeams ? t('modeSelect.launch.teamTitle') : t('modeSelect.launch.readyTitle')}</h2>
                        <p>
                            {isRoomSelected
                                ? t('modeSelect.launch.roomText')
                                : hasTeams
                                    ? t('modeSelect.launch.teamText')
                                    : t('modeSelect.launch.readyText')}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="mode-primary-button btn-hover-shine"
                        disabled={matchmakingState.isSearching || isUnavailable}
                        onClick={onPrimaryAction}
                    >
                        <i className={isRoomSelected ? 'fas fa-arrow-right' : 'fas fa-play'}></i>
                        {isUnavailable ? t('modeSelect.launch.soon') : buttonLabel}
                    </button>
                </div>
            </GlowEffect>
        </section>
    )
}

const TeamCreatePanel = ({ modeConfig, selectedPlayOption, t, onCreate }) => (
    <section className="mode-panel mode-create-team-panel">
        <GlowEffect>
            <div className="glow-effect mode-panel__content mode-create-team-panel__content">
                <div>
                    <span className="mode-action-kicker">{modeConfig.heroLabel}</span>
                    <h2>{t('modeSelect.team.title')}</h2>
                    <p>{t('modeSelect.team.description', { playType: selectedPlayOption?.title?.toLowerCase() })}</p>
                </div>

                <button type="button" className="mode-secondary-button" onClick={onCreate}>
                    <i className="fas fa-plus"></i>
                    {t('modeSelect.team.button')}
                </button>
            </div>
        </GlowEffect>
    </section>
)

const MatchmakingPanel = ({ matchmakingState, t, onCancel, waitSeconds }) => (
    <section className="mode-matchmaking-panel" aria-live="polite">
        <GlowEffect>
            <div className="glow-effect mode-matchmaking-panel__content">
                <div className="mode-matchmaking-radar" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <i className="fas fa-crosshairs"></i>
                </div>

                <div className="mode-matchmaking-copy">
                    <span>{matchmakingState.matchType === MATCH_PLAY_OPTIONS.RANKED ? t('modeSelect.matchmaking.rankedQueue') : t('modeSelect.matchmaking.casualQueue')}</span>
                    <h2>{t('modeSelect.matchmaking.title')}</h2>
                    <p>{t('modeSelect.matchmaking.text')}</p>
                </div>

                <div className="mode-matchmaking-meta">
                    <div>
                        <span>{t('modeSelect.matchmaking.wait')}</span>
                        <strong>{formatWaitTime(waitSeconds)}</strong>
                    </div>
                    <div>
                        <span>{t('modeSelect.matchmaking.position')}</span>
                        <strong>{matchmakingState.position || 1}</strong>
                    </div>
                </div>

                <button type="button" className="mode-matchmaking-cancel" onClick={onCancel}>
                    <i className="fas fa-times"></i>
                    {t('modeSelect.matchmaking.cancel')}
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
    t,
    onOpenLobby,
    onOpenTeamQueue,
}) => {
    const rows = isRoomSelected ? getRoomRows(modeConfig, t) : getTeamRows(modeConfig, selectedPlayOption, t)

    return (
        <section className="mode-panel mode-table-panel">
            <GlowEffect>
                <div className="glow-effect mode-panel__content">
                    <div className="mode-table-heading">
                        <div className="profile-section-title">
                            <i className={isRoomSelected ? 'fas fa-door-open' : 'fas fa-users'}></i>
                            {isRoomSelected ? t('modeSelect.table.roomsTitle') : t('modeSelect.table.teamsTitle')}
                        </div>

                        <button
                            type="button"
                            className="mode-table-action"
                            onClick={isRoomSelected ? onOpenLobby : onOpenTeamQueue}
                        >
                            <i className="fas fa-arrow-right"></i>
                            {isRoomSelected ? t('modeSelect.table.openLobby') : t('modeSelect.table.goTeams')}
                        </button>
                    </div>

                    <div className="mode-table">
                        <div className="mode-table__row mode-table__row--head">
                            <span>{isRoomSelected ? t('modeSelect.table.room') : t('modeSelect.table.team')}</span>
                            <span>{hasTeams && !isRoomSelected ? t('modeSelect.table.composition') : t('modeSelect.table.players')}</span>
                            <span>{t('modeSelect.table.type')}</span>
                            <span>{t('modeSelect.table.status')}</span>
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
    t,
}) => {
    if (isSearching) return t('modeSelect.launch.searching')
    if (isSoloMode) return t('modeSelect.launch.startSolo')
    if (isRoomSelected) return t('modeSelect.launch.openLobby')
    if (hasTeams) return t('modeSelect.launch.findTeam')
    if (modeKey === PLAY_MODE_KEYS.DUEL_1V1 && selectedPlayType === MATCH_PLAY_OPTIONS.RANKED) return t('modeSelect.launch.findRanked')

    return t('modeSelect.launch.findMatch')
}

const getTeamRows = (modeConfig, selectedPlayOption, t) => [
    {
        name: t('modeSelect.table.teamNameAlpha', { mode: modeConfig.key.toUpperCase() }),
        players: modeConfig.key === PLAY_MODE_KEYS.SQUAD_5V5 ? '4 / 5' : '1 / 2',
        type: selectedPlayOption?.title || t('modeSelect.launch.findMatch'),
        status: t('modeSelect.table.looking'),
    },
    {
        name: t('modeSelect.table.teamNamePulse', { mode: modeConfig.key.toUpperCase() }),
        players: modeConfig.key === PLAY_MODE_KEYS.SQUAD_5V5 ? '3 / 5' : '2 / 2',
        type: selectedPlayOption?.title || t('modeSelect.launch.findMatch'),
        status: t('modeSelect.table.ready'),
    },
    {
        name: t('modeSelect.table.teamNameCore', { mode: modeConfig.key.toUpperCase() }),
        players: modeConfig.key === PLAY_MODE_KEYS.SQUAD_5V5 ? '2 / 5' : '1 / 2',
        type: t('modeSelect.table.freeComposition'),
        status: t('modeSelect.table.open'),
    },
]

const getRoomRows = (modeConfig, t) => [
    {
        name: t('modeSelect.table.roomName', { mode: modeConfig.title, number: '1042' }),
        players: modeConfig.key === PLAY_MODE_KEYS.DUEL_1V1 ? '1 / 2' : '2 / 4',
        type: t('modeSelect.table.private'),
        status: t('modeSelect.table.waiting'),
    },
    {
        name: t('modeSelect.table.roomName', { mode: modeConfig.title, number: '1043' }),
        players: modeConfig.key === PLAY_MODE_KEYS.DUEL_1V1 ? '0 / 2' : '1 / 4',
        type: t('modeSelect.table.friends'),
        status: t('modeSelect.table.opened'),
    },
    {
        name: t('modeSelect.table.roomName', { mode: modeConfig.title, number: '1044' }),
        players: modeConfig.key === PLAY_MODE_KEYS.DUEL_1V1 ? '1 / 2' : '3 / 4',
        type: t('modeSelect.table.custom'),
        status: t('modeSelect.table.gathering'),
    },
]

const buildTranslatedModeConfig = (modeConfig, t) => {
    const modeKey = modeConfig.key
    const modePath = `modeSelect.modes.${modeKey}`

    return {
        ...modeConfig,
        title: t(`${modePath}.title`, { defaultValue: modeConfig.title }),
        subtitle: t(`${modePath}.subtitle`, { defaultValue: modeConfig.subtitle }),
        online: t(`${modePath}.online`, { defaultValue: modeConfig.online }),
        heroLabel: t(`${modePath}.heroLabel`, { defaultValue: modeConfig.heroLabel }),
        cardMeta: buildTranslatedCardMeta(modeConfig, t),
        settingsCopy: buildTranslatedSettingsCopy(modeConfig, t),
    }
}

const buildTranslatedCardMeta = (modeConfig, t) => {
    return Object.values(MATCH_PLAY_OPTIONS).reduce((result, playType) => {
        const translatedMeta = t(`modeSelect.modes.${modeConfig.key}.cardMeta.${playType}`, {
            defaultValue: modeConfig.cardMeta?.[playType] || [],
            returnObjects: true,
        })

        result[playType] = Array.isArray(translatedMeta)
            ? translatedMeta
            : modeConfig.cardMeta?.[playType] || []

        return result
    }, {})
}

const buildTranslatedSettingsCopy = (modeConfig, t) => {
    const settingsPath = `modeSelect.modes.${modeConfig.key}.settings`

    return {
        abilities: {
            title: t(`${settingsPath}.abilities.title`, {
                defaultValue: modeConfig.settingsCopy?.abilities?.title || t('modeSelect.settings.fallbackAbilitiesTitle'),
            }),
            description: t(`${settingsPath}.abilities.description`, {
                defaultValue: modeConfig.settingsCopy?.abilities?.description || t('modeSelect.settings.fallbackAbilitiesDescription'),
            }),
        },
        specialBlocks: {
            title: t(`${settingsPath}.specialBlocks.title`, {
                defaultValue: modeConfig.settingsCopy?.specialBlocks?.title || t('modeSelect.settings.fallbackSpecialBlocksTitle'),
            }),
            description: t(`${settingsPath}.specialBlocks.description`, {
                defaultValue: modeConfig.settingsCopy?.specialBlocks?.description || t('modeSelect.settings.fallbackSpecialBlocksDescription'),
            }),
        },
    }
}

const buildTranslatedPlayOption = (option, t) => ({
    ...option,
    title: t(`modeSelect.playOptions.${option.key}.title`, { defaultValue: option.title }),
    description: t(`modeSelect.playOptions.${option.key}.description`, { defaultValue: option.description }),
})

const formatWaitTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const restSeconds = seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`
}

export default ModeSelectPage
