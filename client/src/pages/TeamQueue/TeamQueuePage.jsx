import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, getLanguageFromPathname, getLocalizedPath } from '@/i18n'
import { useAuth } from '@/shared/hooks/useAuth.js'
import {
    ensureSocketSession,
    socket,
} from '@/shared/api/socket'
import notify from '@/utils/Notifications'
import { defaultMatchSettings, normalizeMatchSettings } from '@/features/tetris/model/matchSettings.js'
import PlayerActionTrigger from '@/shared/ui/PlayerActionTrigger'
import { getModeSelectionConfig } from '@/shared/config/gameModes.js'

import '@/pages/Lobby/LobbyPage.css'
import '@/pages/ModeSelect/ModeSelectPage.css'
import './TeamQueuePage.css'

const emitWithAck = (eventName, payload, fallbackMessage = 'No response from server') => {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (response) => {
            resolve(response || { success: false, message: fallbackMessage })
        })
    })
}

const formatWaitTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const restSeconds = seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`
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

const PlayerAvatar = ({ player }) => (
    <div className="lobby-player-avatar">
        {player?.avatarUrl ? (
            renderAvatarMedia(getAssetUrl(player.avatarUrl), player.username)
        ) : (
            <i className="fas fa-user-astronaut"></i>
        )}
    </div>
)

const TeamQueuePage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { mode } = useParams()
    const { t, i18n } = useTranslation()
    const { user } = useAuth()
    const currentLanguage = getLanguageFromPathname(location.pathname) || DEFAULT_LANGUAGE
    const modeKey = location.state?.modeKey || mode || '2v2'
    const modeConfig = useMemo(() => getModeSelectionConfig(modeKey), [modeKey])
    const modeTitle = t(`modeSelect.modes.${modeConfig.key}.title`, { defaultValue: modeConfig.title })
    const [settings] = useState(() => normalizeMatchSettings(location.state?.roomSettings || defaultMatchSettings))
    const matchType = settings.matchType === 'ranked' ? 'ranked' : 'casual'
    const isRanked = matchType === 'ranked'
    const [party, setParty] = useState(null)
    const [partyIdInput, setPartyIdInput] = useState('')
    const [isBusy, setIsBusy] = useState(false)
    const [searchState, setSearchState] = useState({
        isSearching: false,
        joinedAt: null,
        teamSize: 1,
        position: null,
    })
    const [waitSeconds, setWaitSeconds] = useState(0)
    const searchingRef = useRef(false)
    const emit = useCallback((eventName, payload) => (
        emitWithAck(eventName, payload, t('teamQueue.notifications.noResponse'))
    ), [t])

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    const ensurePlayerSession = useCallback(async () => {
        if (!user) {
            throw new Error(t('teamQueue.notifications.loginRequired'))
        }

        return await ensureSocketSession({ user })
    }, [t, user])

    useEffect(() => {
        searchingRef.current = searchState.isSearching
    }, [searchState.isSearching])

    useEffect(() => {
        if (!searchState.isSearching || !searchState.joinedAt) {
            return undefined
        }

        const joinedAtTime = new Date(searchState.joinedAt).getTime()
        const intervalId = window.setInterval(() => {
            setWaitSeconds(Math.max(0, Math.floor((Date.now() - joinedAtTime) / 1000)))
        }, 1000)

        setWaitSeconds(0)

        return () => window.clearInterval(intervalId)
    }, [searchState.isSearching, searchState.joinedAt])

    useEffect(() => {
        const handlePartyState = (nextParty) => {
            setParty(nextParty)
            setPartyIdInput(nextParty?.id || '')
        }

        const handleSearching = (payload = {}) => {
            setSearchState({
                isSearching: true,
                joinedAt: payload.joinedAt || new Date().toISOString(),
                teamSize: payload.teamSize || 1,
                position: payload.position || 1,
            })
        }

        const handleCancelled = () => {
            setSearchState({
                isSearching: false,
                joinedAt: null,
                teamSize: party?.players?.length || 1,
                position: null,
            })
            setWaitSeconds(0)
        }

        const handleFound = (payload = {}) => {
            setSearchState({
                isSearching: false,
                joinedAt: null,
                teamSize: 2,
                position: null,
            })
            setWaitSeconds(0)
            notify(t('teamQueue.notifications.matchFound'), 'success')

            navigate(getLocalizedPath(`/match/${payload.roomId}`, currentLanguage), {
                state: {
                    roomSettings: payload.settings || settings,
                    modeKey: payload.modeKey || modeKey,
                    matchType: payload.matchType,
                    room: payload.room || null,
                },
            })
        }

        socket.on('party:state', handlePartyState)
        socket.on('matchmaking:searching', handleSearching)
        socket.on('matchmaking:cancelled', handleCancelled)
        socket.on('matchmaking:found', handleFound)

        return () => {
            socket.off('party:state', handlePartyState)
            socket.off('matchmaking:searching', handleSearching)
            socket.off('matchmaking:cancelled', handleCancelled)
            socket.off('matchmaking:found', handleFound)
        }
    }, [currentLanguage, modeKey, navigate, party?.players?.length, settings, t])

    useEffect(() => {
        return () => {
            if (searchingRef.current && socket.connected) {
                socket.emit('matchmaking:leave')
                socket.emit('party:cancel-search', { partyId: party?.id })
            }
        }
    }, [party?.id])

    const handleSoloSearch = async () => {
        setIsBusy(true)

        try {
            await ensurePlayerSession()
            const response = await emit('matchmaking:join', {
                modeKey,
                matchType,
                settings,
            })

            if (!response.success) {
                notify(response.message || t('teamQueue.notifications.startSearchFailed'), 'error')
                return
            }

            if (response.searching) {
                notify(response.message || t('teamQueue.notifications.soloSearchStarted'), 'info')
            }
        } catch (error) {
            notify(error.message || t('teamQueue.notifications.startSearchFailed'), 'error')
        } finally {
            setIsBusy(false)
        }
    }

    const handleCreateParty = async () => {
        setIsBusy(true)

        try {
            await ensurePlayerSession()
            const response = await emit('party:create', {
                modeKey,
                settings,
            })

            if (!response.success) {
                notify(response.message || t('teamQueue.notifications.createPartyFailed'), 'error')
                return
            }

            setParty(response.party)
            setPartyIdInput(response.party.id)
            notify(response.message || t('teamQueue.notifications.partyCreated'), 'success')
        } catch (error) {
            notify(error.message || t('teamQueue.notifications.createPartyFailed'), 'error')
        } finally {
            setIsBusy(false)
        }
    }

    const handleJoinParty = async () => {
        setIsBusy(true)

        try {
            await ensurePlayerSession()
            const response = await emit('party:join', {
                partyId: partyIdInput.trim(),
            })

            if (!response.success) {
                notify(response.message || t('teamQueue.notifications.joinPartyFailed'), 'error')
                return
            }

            setParty(response.party)
            notify(response.message || t('teamQueue.notifications.partyJoined'), 'success')
        } catch (error) {
            notify(error.message || t('teamQueue.notifications.joinPartyFailed'), 'error')
        } finally {
            setIsBusy(false)
        }
    }

    const handlePartySearch = async () => {
        if (!party?.id) {
            return
        }

            const response = await emit('party:start-search', {
                partyId: party.id,
            matchType,
        })

        if (!response.success) {
            notify(response.message || t('teamQueue.notifications.partySearchFailed'), 'error')
            return
        }

        if (response.searching) {
            notify(response.message || t('teamQueue.notifications.partySearchStarted'), 'info')
        }
    }

    const handleCancelSearch = async () => {
        const response = party?.id
            ? await emit('party:cancel-search', { partyId: party.id })
            : await emit('matchmaking:leave', {})

        if (!response.success) {
            notify(response.message || t('teamQueue.notifications.cancelSearchFailed'), 'error')
            return
        }

        notify(t('teamQueue.notifications.searchCancelled'), 'info')
    }

    const handleLeaveParty = async () => {
        if (!party?.id) {
            return
        }

        if (searchState.isSearching) {
            await emit('party:cancel-search', { partyId: party.id })
        }

        const response = await emit('party:leave', {})

        if (!response.success) {
            notify(response.message || t('teamQueue.notifications.leaveFailed'), 'error')
            return
        }

        setParty(null)
        setPartyIdInput('')
        setSearchState({
            isSearching: false,
            joinedAt: null,
            teamSize: 1,
            position: null,
        })
        setWaitSeconds(0)
        notify(t('teamQueue.notifications.left'), 'info')
    }

    const handleCopyPartyId = async () => {
        if (!party?.id || !navigator?.clipboard) {
            notify(t('teamQueue.notifications.copyFailed'), 'error')
            return
        }

        try {
            await navigator.clipboard.writeText(party.id)
            notify(t('teamQueue.notifications.copied'), 'info')
        } catch {
            notify(t('teamQueue.notifications.copyFailed'), 'error')
        }
    }

    const isOwner = party?.ownerSocketId === socket.id
    const partyPlayers = party?.players || []
    const canStartPartySearch = isOwner && partyPlayers.length === 2 && !searchState.isSearching

    return (
        <section className="section lobby-page team-queue-page">
            <div className="container lobby-container">
                <header className="lobby-hero">
                    <div className="lobby-hero-copy">
                        <span className="lobby-status-chip lobby-status-chip--connected">
                            {isRanked ? t('teamQueue.hero.rankedChip') : t('teamQueue.hero.casualChip')}
                        </span>
                        <h1 className="lobby-title">{modeTitle}</h1>
                        <p className="lobby-lead">
                            {isRanked
                                ? t('teamQueue.hero.rankedLead')
                                : t('teamQueue.hero.casualLead')}
                        </p>
                    </div>

                    <div className="lobby-hero-panel">
                        <div className="lobby-panel-label">{t('teamQueue.config.label')}</div>
                        <div className="lobby-player-name">{isRanked ? t('teamQueue.config.rankedName') : t('teamQueue.config.casualName')}</div>
                        <div className="lobby-player-meta">
                            <span>{isRanked ? t('teamQueue.config.ratingOn') : t('teamQueue.config.ratingOff')}</span>
                            <span>{settings.abilitiesEnabled ? t('teamQueue.config.effectsOn') : t('teamQueue.config.effectsOff')}</span>
                            <span>{settings.specialBlocksEnabled ? t('teamQueue.config.specialBlocksOn') : t('teamQueue.config.specialBlocksOff')}</span>
                            <span>{t('teamQueue.config.alliesCount', { count: partyPlayers.length || 1 })}</span>
                        </div>
                    </div>
                </header>

                <div className="lobby-grid team-queue-grid">
                    <section className="lobby-card flex">
                        <div className="lobby-card-header">
                            <h2>{t('teamQueue.solo.title')}</h2>
                            <p>
                                {isRanked
                                    ? t('teamQueue.solo.rankedDescription')
                                    : t('teamQueue.solo.casualDescription')}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="button lobby-primary-button"
                            onClick={handleSoloSearch}
                            disabled={isBusy || searchState.isSearching}
                        >
                            {t('teamQueue.solo.button')}
                        </button>
                    </section>

                    <section className="lobby-card">
                        <div className="lobby-card-header">
                            <h2>{t('teamQueue.friend.title')}</h2>
                            <p>
                                {isRanked
                                    ? t('teamQueue.friend.rankedDescription')
                                    : t('teamQueue.friend.casualDescription')}
                            </p>
                        </div>

                        <div className="team-queue-actions">
                            <button
                                type="button"
                                className="button lobby-secondary-button team-queue-button-reset"
                                onClick={handleCreateParty}
                                disabled={isBusy || Boolean(party)}
                            >
                                {t('teamQueue.friend.createButton')}
                            </button>

                            <label className="lobby-field">
                                <span>{t('teamQueue.friend.partyIdLabel')}</span>
                                <input
                                    type="text"
                                    value={partyIdInput}
                                    placeholder={t('teamQueue.friend.partyIdPlaceholder')}
                                    onChange={(event) => setPartyIdInput(event.target.value)}
                                    disabled={searchState.isSearching}
                                />
                            </label>

                            <button
                                type="button"
                                className="button lobby-secondary-button"
                                onClick={handleJoinParty}
                                disabled={isBusy || !partyIdInput.trim() || searchState.isSearching}
                            >
                                {t('teamQueue.friend.joinButton')}
                            </button>
                        </div>
                    </section>
                </div>
                {party?.id && (
                    <section className="lobby-room-card">
                        <div className="lobby-room-header">
                            <div>
                                <div className="lobby-panel-label">{t('teamQueue.party.label')}</div>
                                <h2>{party?.id || t('teamQueue.party.emptyTitle')}</h2>
                            </div>

                            <div className="lobby-room-actions">
                            <button
                                type="button"
                                className="button lobby-ghost-button"
                                onClick={handleCopyPartyId}
                                disabled={!party?.id}
                            >
                                {t('teamQueue.party.copyId')}
                            </button>
                            <button
                                type="button"
                                className="button lobby-ghost-button"
                                onClick={handleLeaveParty}
                                disabled={!party?.id}
                            >
                                {t('teamQueue.party.leave')}
                            </button>
                            <button
                                type="button"
                                className="button lobby-primary-button"
                                    onClick={handlePartySearch}
                                    disabled={!canStartPartySearch}
                                >
                                    {t('teamQueue.party.search')}
                                </button>
                            </div>
                        </div>

                        <div className="lobby-settings-panel">
                            <div className="lobby-settings-panel__header">
                            <span className="lobby-panel-label">{t('teamQueue.party.statusLabel')}</span>
                            <strong>{party?.status === 'searching' ? t('teamQueue.party.searching') : t('teamQueue.party.waitingStart')}</strong>
                            <span>{t('teamQueue.party.playersCount', { count: partyPlayers.length })}</span>
                            </div>

                        <div className="lobby-settings-pills">
                            <span className={`lobby-settings-pill ${isRanked ? 'is-active' : ''}`}>
                                <i className="fas fa-trophy"></i>
                                {isRanked ? t('teamQueue.party.ranked') : t('teamQueue.party.unranked')}
                            </span>
                            <span className={`lobby-settings-pill ${settings.abilitiesEnabled ? 'is-active' : ''}`}>
                                <i className="fas fa-bolt"></i>
                                    {settings.abilitiesEnabled ? t('teamQueue.party.abilitiesEnabled') : t('teamQueue.party.abilitiesDisabled')}
                                </span>
                                <span className={`lobby-settings-pill ${settings.specialBlocksEnabled ? 'is-active' : ''}`}>
                                    <i className="fas fa-shapes"></i>
                                    {settings.specialBlocksEnabled ? t('teamQueue.party.specialBlocksEnabled') : t('teamQueue.party.specialBlocksDisabled')}
                                </span>
                            </div>
                        </div>

                        <div className="lobby-roster team-queue-slots">
                            {[0, 1].map((slotIndex) => {
                                const player = partyPlayers[slotIndex]

                            return (
                                <PlayerActionTrigger asChild disabled={!player} key={slotIndex} player={player}>
                                    <article className="lobby-player-card team-queue-slot">
                                        <div className="lobby-player-card__identity">
                                            <PlayerAvatar player={player} />
                                            <div>
                                                <h3>{player?.username || t('teamQueue.slots.waitingPlayer')}</h3>
                                                <p>{player?.isOwner ? t('teamQueue.slots.leader') : player ? t('teamQueue.slots.ally') : t('teamQueue.slots.free')}</p>
                                            </div>
                                        </div>
                                        <span className={`lobby-ready-badge ${player ? 'is-ready' : ''}`}>
                                            {t('teamQueue.slots.slot', { number: slotIndex + 1 })}
                                        </span>
                                    </article>
                                </PlayerActionTrigger>
                                )
                            })}
                        </div>
                    </section>
                )}
                {searchState.isSearching ? (
                    <section className="mode-matchmaking-panel team-queue-matchmaking" aria-live="polite">
                        <div className="mode-matchmaking-panel__content">
                            <div className="mode-matchmaking-radar" aria-hidden="true">
                                <span></span>
                                <span></span>
                                <i className="fas fa-crosshairs"></i>
                            </div>

                            <div className="mode-matchmaking-copy">
                                <span>{isRanked ? t('teamQueue.matchmaking.rankedQueue') : t('teamQueue.matchmaking.casualQueue')}</span>
                                <h2>{searchState.teamSize >= 2 ? t('teamQueue.matchmaking.findingOpponents') : t('teamQueue.matchmaking.findingAlly')}</h2>
                                <p>
                                    {isRanked
                                        ? t('teamQueue.matchmaking.rankedDescription')
                                        : t('teamQueue.matchmaking.casualDescription')}
                                </p>
                            </div>

                            <div className="mode-matchmaking-meta">
                                <div>
                                    <span>{t('teamQueue.matchmaking.wait')}</span>
                                    <strong>{formatWaitTime(waitSeconds)}</strong>
                                </div>
                                <div>
                                    <span>{t('teamQueue.matchmaking.team')}</span>
                                    <strong>{Math.min(searchState.teamSize, 2)}/2</strong>
                                </div>
                            </div>

                            <button type="button" className="mode-matchmaking-cancel" onClick={handleCancelSearch}>
                                <i className="fas fa-times"></i>
                                {t('teamQueue.matchmaking.cancel')}
                            </button>
                        </div>
                    </section>
                ) : null}
            </div>
        </section>
    )
}

export default TeamQueuePage
