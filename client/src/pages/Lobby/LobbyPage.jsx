import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, getLanguageFromPathname, getLocalizedGamePath } from '@/i18n'
import { useAuth } from '@/shared/hooks/useAuth'
import CustomSelect from '@/shared/ui/CustomSelect'
import {
    ensureSocketSession,
    getStoredGuestSession,
    isValidGuestNickname,
    normalizeGuestNickname,
    socket,
} from '@/shared/api/socket'
import notify from '@/utils/Notifications'
import { defaultMatchSettings, normalizeMatchSettings } from '@/features/tetris/model/matchSettings.js'
import { getModeSelectionConfig, modeSelectionCatalog } from '@/shared/config/gameModes.js'

import './LobbyPage.css'

const emitWithAck = (eventName, payload, fallbackMessage = 'No response from server') => {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (response) => {
            resolve(response || { success: false, message: fallbackMessage })
        })
    })
}

const getPlayerDisplayName = (user, nickname, t) => {
    return user?.username || user?.email || normalizeGuestNickname(nickname) || t('lobby.profile.guest')
}

const getClientUserId = (user) => {
    if (user?.id) {
        return user.id
    }

    const guestSession = getStoredGuestSession()

    return guestSession?.id ? `guest:${guestSession.id}` : null
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

const getModeRosterSize = (modeKey) => (modeKey === '2v2' ? 4 : 2)

const getTeamLabel = (teamId, t) => (teamId === 'team_2' ? t('lobby.teams.team2') : t('lobby.teams.team1'))

const getLobbyRoomPath = (language, modeKey, roomId = '') => {
    const roomSegment = roomId ? `/${roomId}` : ''

    return getLocalizedGamePath(`/game/${modeKey || '1v1'}/lobby${roomSegment}`, language)
}

const getRoomInviteMessage = ({ modeKey, roomUrl, t }) => (
    `${t('lobby.share.messageTitle')}\n${t('lobby.share.messageMode', { mode: modeKey })}\n${roomUrl}`
)

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

const LobbyPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { mode, roomId: routeRoomId } = useParams()
    const { t, i18n } = useTranslation()
    const { user } = useAuth()
    const currentLanguage = getLanguageFromPathname(location.pathname) || DEFAULT_LANGUAGE
    const [roomId, setRoomId] = useState('')
    const [currentRoom, setCurrentRoom] = useState(null)
    const [joinRoomId, setJoinRoomId] = useState('')
    const [nickname, setNickname] = useState(() => getStoredGuestSession()?.nickname || '')
    const [isBusy, setIsBusy] = useState(false)
    const [connectionState, setConnectionState] = useState(() => (socket.connected ? 'connected' : 'disconnected'))
    const notifiedRoomRef = useRef('')
    const restoredRoomRef = useRef('')
    const consumedAutoInviteRef = useRef('')
    const activeRoomIdRef = useRef('')
    const shouldLeaveRoomOnUnmountRef = useRef(true)
    const clientUserId = getClientUserId(user)
    const matchResult = location.state?.matchResult || null
    const roomIdFromMatch = location.state?.roomId || ''
    const requestedRoomId = routeRoomId || roomIdFromMatch
    const modeKey = location.state?.modeKey || currentRoom?.modeKey || mode || '1v1'
    const modeConfig = getModeSelectionConfig(modeKey)
    const modeTitle = t(`modeSelect.modes.${modeConfig.key}.title`, { defaultValue: modeConfig.title })
    const lobbyModeOptions = useMemo(() => (
        Object.values(modeSelectionCatalog)
            .filter((config) => config.roomSupported)
            .map((config) => ({
                value: config.key,
                label: t(`modeSelect.modes.${config.key}.title`, { defaultValue: config.title }),
                description: t(`modeSelect.modes.${config.key}.heroLabel`, { defaultValue: config.heroLabel }),
                icon: config.icon,
            }))
    ), [t])
    const [roomSettings, setRoomSettings] = useState(() => normalizeMatchSettings(location.state?.roomSettings || defaultMatchSettings))
    const emit = useCallback((eventName, payload) => (
        emitWithAck(eventName, payload, t('lobby.notifications.noResponse'))
    ), [t])
    const navigateToRoom = useCallback((room, { replace = true } = {}) => {
        if (!room?.id) {
            return
        }

        const nextPath = getLobbyRoomPath(currentLanguage, room.modeKey || modeKey, room.id)

        if (location.pathname !== nextPath) {
            shouldLeaveRoomOnUnmountRef.current = false
            navigate(nextPath, {
                replace,
                state: {
                    modeKey: room.modeKey || modeKey,
                    roomSettings: normalizeMatchSettings(room.settings || roomSettings),
                },
            })
            window.setTimeout(() => {
                shouldLeaveRoomOnUnmountRef.current = true
            }, 0)
        }
    }, [currentLanguage, location.pathname, modeKey, navigate, roomSettings])
    const roomShareUrl = useMemo(() => {
        if (!roomId || typeof window === 'undefined') {
            return ''
        }

        return `${window.location.origin}${getLobbyRoomPath(currentLanguage, modeKey, roomId)}`
    }, [currentLanguage, modeKey, roomId])

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    useEffect(() => {
        if (user?.username || user?.email) {
            setNickname(user.username || user.email)
        }
    }, [user])

    useEffect(() => {
        if (location.state?.roomSettings) {
            setRoomSettings(normalizeMatchSettings(location.state.roomSettings))
        }
    }, [location.state])

    useEffect(() => {
        activeRoomIdRef.current = roomId
    }, [roomId])

    useEffect(() => {
        shouldLeaveRoomOnUnmountRef.current = true

        return () => {
            const activeRoomId = activeRoomIdRef.current

            if (activeRoomId && shouldLeaveRoomOnUnmountRef.current && socket.connected) {
                socket.emit('room:leave', { roomId: activeRoomId })
            }
        }
    }, [])

    useEffect(() => {
        if (!matchResult) {
            return
        }

        notify(
            matchResult === 'win'
                ? t('lobby.notifications.matchWinReturn')
                : t('lobby.notifications.matchLoseReturn'),
            matchResult === 'win' ? 'success' : 'warning'
        )

        navigate(location.pathname, {
            replace: true,
            state: {},
        })
    }, [location.pathname, matchResult, navigate, t])

    useEffect(() => {
        const handleConnect = () => {
            setConnectionState('connected')
            notify(t('lobby.notifications.connected'), 'info')
        }

        const handleDisconnect = () => {
            setConnectionState('disconnected')
            notify(t('lobby.notifications.disconnected'), 'warning')
        }

        const handleConnectError = (error) => {
            setConnectionState('error')
            notify(error.message || t('lobby.notifications.socketConnectFailed'), 'error')
        }

        socket.on('connect', handleConnect)
        socket.on('disconnect', handleDisconnect)
        socket.on('connect_error', handleConnectError)

        return () => {
            socket.off('connect', handleConnect)
            socket.off('disconnect', handleDisconnect)
            socket.off('connect_error', handleConnectError)
        }
    }, [t])

    useEffect(() => {
        const handleRoomState = (room) => {
            setCurrentRoom(room)
            setRoomId(room?.id || '')
            setJoinRoomId(room?.id || '')
            if (room?.settings) {
                setRoomSettings(normalizeMatchSettings(room.settings))
            }
            navigateToRoom(room)
        }

        const handlePlayerJoined = ({ username, userId }) => {
            if (userId !== clientUserId) {
                notify(t('lobby.notifications.playerJoined', { username }), 'info')
            }
        }

        const handlePlayerLeft = ({ username, userId, roomId: leftRoomId }) => {
            if (currentRoom?.id === leftRoomId && userId !== clientUserId) {
                notify(t('lobby.notifications.playerLeft', { username }), 'warning')
            }
        }

        const handleRoomLeft = ({ roomId: leftRoomId }) => {
            if (leftRoomId === roomId) {
                setCurrentRoom(null)
                setRoomId('')
                setJoinRoomId('')
                navigate(getLobbyRoomPath(currentLanguage, modeKey), {
                    replace: true,
                    state: {
                        modeKey,
                        roomSettings,
                    },
                })
            }
        }

        const handleMatchStart = ({ roomId: startedRoomId }) => {
            if (notifiedRoomRef.current !== startedRoomId) {
                notifiedRoomRef.current = startedRoomId
                notify(
                    modeKey === '2v2' ? t('lobby.notifications.matchStartTeam') : t('lobby.notifications.matchStartDuel'),
                    'success'
                )
            }

            shouldLeaveRoomOnUnmountRef.current = false
            navigate(`/match/${startedRoomId}`, {
                state: {
                    roomSettings: normalizeMatchSettings(currentRoom?.settings || roomSettings),
                    modeKey: currentRoom?.modeKey || modeKey,
                },
            })
        }

        socket.on('room:state', handleRoomState)
        socket.on('room:player-joined', handlePlayerJoined)
        socket.on('room:player-left', handlePlayerLeft)
        socket.on('room:left', handleRoomLeft)
        socket.on('match:start', handleMatchStart)

        return () => {
            socket.off('room:state', handleRoomState)
            socket.off('room:player-joined', handlePlayerJoined)
            socket.off('room:player-left', handlePlayerLeft)
            socket.off('room:left', handleRoomLeft)
            socket.off('match:start', handleMatchStart)
        }
    }, [clientUserId, currentLanguage, currentRoom?.id, currentRoom?.modeKey, currentRoom?.settings, modeKey, navigate, navigateToRoom, roomId, roomSettings, t])

    const ensurePlayableIdentity = useCallback(async () => {
        if (user) {
            return await ensureSocketSession({ user })
        }

        if (!isValidGuestNickname(nickname)) {
            throw new Error(t('lobby.notifications.invalidNickname'))
        }

        return await ensureSocketSession({ nickname })
    }, [nickname, t, user])

    useEffect(() => {
        if (!requestedRoomId || restoredRoomRef.current === requestedRoomId || roomId === requestedRoomId) {
            return
        }

        restoredRoomRef.current = requestedRoomId

        const restoreRoom = async () => {
            try {
                await ensurePlayableIdentity()

                const response = await emit('room:join', { roomId: requestedRoomId })

                if (!response.success) {
                    notify(response.message || t('lobby.notifications.restoreRoomFailed'), 'error')
                    return
                }

                setCurrentRoom(response.room)
                setRoomId(response.room.id)
                setJoinRoomId(response.room.id)
                if (response.room?.settings) {
                    setRoomSettings(normalizeMatchSettings(response.room.settings))
                }
                navigateToRoom(response.room)
            } catch (error) {
                notify(error.message || t('lobby.notifications.restoreRoomFailed'), 'error')
            }
        }

        restoreRoom()
    }, [emit, ensurePlayableIdentity, navigateToRoom, requestedRoomId, roomId, t])

    const handleCreateRoom = async () => {
        setIsBusy(true)

        try {
            await ensurePlayableIdentity()
            const response = await emit('room:create', {
                modeKey,
                settings: roomSettings,
            })

            if (!response.success) {
                notify(response.message || t('lobby.notifications.createRoomFailed'), 'error')
                return
            }

            setCurrentRoom(response.room)
            setRoomId(response.room.id)
            setJoinRoomId(response.room.id)
            if (response.room?.settings) {
                setRoomSettings(normalizeMatchSettings(response.room.settings))
            }
            navigateToRoom(response.room)
            notify(response.message || t('lobby.notifications.roomCreated'), 'success')
        } catch (error) {
            notify(error.message || t('lobby.notifications.createRoomFailed'), 'error')
        } finally {
            setIsBusy(false)
        }
    }

    const handleJoinRoom = async () => {
        setIsBusy(true)

        try {
            await ensurePlayableIdentity()
            const response = await emit('room:join', { roomId: joinRoomId.trim() })

            if (!response.success) {
                notify(response.message || t('lobby.notifications.joinRoomFailed'), 'error')
                return
            }

            setCurrentRoom(response.room)
            setRoomId(response.room.id)
            if (response.room?.settings) {
                setRoomSettings(normalizeMatchSettings(response.room.settings))
            }
            navigateToRoom(response.room)
            notify(response.message || t('lobby.notifications.roomJoined'), 'success')
        } catch (error) {
            notify(error.message || t('lobby.notifications.joinRoomFailed'), 'error')
        } finally {
            setIsBusy(false)
        }
    }

    const handleReadyToggle = async () => {
        if (!roomId) {
            return
        }

        const response = await emit('player:ready', { roomId })

        if (!response.success) {
            notify(response.message || t('lobby.notifications.readyFailed'), 'error')
            return
        }

        notify(response.message || t('lobby.notifications.readyUpdated'), response.isReady ? 'success' : 'info')
    }

    const handleLeaveRoom = async () => {
        if (!roomId) {
            return
        }

        const response = await emit('room:leave', { roomId })

        if (!response.success) {
            notify(response.message || t('lobby.notifications.leaveFailed'), 'error')
            return
        }

        setCurrentRoom(null)
        setRoomId('')
        setJoinRoomId('')
        activeRoomIdRef.current = ''
        navigate(getLobbyRoomPath(currentLanguage, modeKey), {
            replace: true,
            state: {
                modeKey,
                roomSettings,
            },
        })
        notify(response.message || t('lobby.notifications.left'), 'info')
    }

    const handleSetTeam = async (player, teamId) => {
        if (!roomId || !player?.userId) {
            return
        }

        const response = await emit('room:set-team', {
            roomId,
            userId: player.userId,
            teamId,
        })

        if (!response.success) {
            notify(response.message || t('lobby.notifications.setTeamFailed'), 'error')
            return
        }

        if (response.room) {
            setCurrentRoom(response.room)
        }
        notify(response.message || t('lobby.notifications.teamUpdated'), 'success')
    }

    const handleCopyRoomLink = async () => {
        if (!roomShareUrl || !navigator?.clipboard) {
            notify(t('lobby.notifications.copyRoomLinkFailed'), 'error')
            return
        }

        try {
            await navigator.clipboard.writeText(roomShareUrl)
            notify(t('lobby.notifications.roomLinkCopied'), 'info')
        } catch {
            notify(t('lobby.notifications.copyRoomLinkFailed'), 'error')
        }
    }

    const handleNativeShareRoom = async () => {
        if (!roomShareUrl || !navigator?.share) {
            await handleCopyRoomLink()
            return
        }

        try {
            await navigator.share({
                title: t('lobby.share.title'),
                text: getRoomInviteMessage({ modeKey, roomUrl: roomShareUrl, t }),
                url: roomShareUrl,
            })
        } catch (error) {
            if (error?.name !== 'AbortError') {
                notify(t('lobby.notifications.shareRoomFailed'), 'error')
            }
        }
    }

    const handleShareChannel = (channel) => {
        if (!roomShareUrl) {
            return
        }

        const text = getRoomInviteMessage({ modeKey, roomUrl: roomShareUrl, t })
        const encodedUrl = encodeURIComponent(roomShareUrl)
        const encodedText = encodeURIComponent(text)
        const subject = encodeURIComponent(t('lobby.share.emailSubject'))
        const links = {
            telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
            whatsapp: `https://wa.me/?text=${encodedText}`,
            email: `mailto:?subject=${subject}&body=${encodedText}`,
        }

        if (links[channel]) {
            window.open(links[channel], '_blank', 'noopener,noreferrer')
        }
    }

    const sendRoomInvite = useCallback(async (friendId, targetRoom) => {
        if (!friendId || !targetRoom?.id) {
            return false
        }

        const response = await emit('friends:room-invite:send', {
            friendId,
            roomId: targetRoom.id,
        })

        if (!response.success) {
            notify(response.message || t('lobby.notifications.inviteFailed'), 'error')
            return false
        }

        notify(t('lobby.notifications.inviteSent'), 'success')
        return true
    }, [emit, t])

    const handleModeChange = async (nextModeKey) => {
        if (!nextModeKey || nextModeKey === modeKey) {
            return
        }

        if (roomId) {
            const response = await emit('room:update-mode', {
                roomId,
                modeKey: nextModeKey,
                settings: roomSettings,
            })

            if (!response.success) {
                notify(response.message || t('lobby.notifications.modeUpdateFailed'), 'error')
                return
            }

            setCurrentRoom(response.room)
            setRoomId(response.room.id)
            setJoinRoomId(response.room.id)
            if (response.room?.settings) {
                setRoomSettings(normalizeMatchSettings(response.room.settings))
            }
            shouldLeaveRoomOnUnmountRef.current = false
            navigate(getLobbyRoomPath(currentLanguage, nextModeKey, response.room.id), {
                replace: true,
                state: {
                    modeKey: nextModeKey,
                    roomSettings: normalizeMatchSettings(response.room?.settings || roomSettings),
                },
            })
            window.setTimeout(() => {
                shouldLeaveRoomOnUnmountRef.current = true
            }, 0)
            notify(response.message || t('lobby.notifications.modeUpdated'), 'success')
            return
        }

        navigate(getLobbyRoomPath(currentLanguage, nextModeKey), {
            state: {
                modeKey: nextModeKey,
                roomSettings,
            },
        })
    }

    useEffect(() => {
        const inviteFriendId = location.state?.inviteFriendId

        if (!location.state?.autoCreateRoom || !inviteFriendId) {
            return
        }

        const autoInviteKey = `${inviteFriendId}:${location.key || location.pathname}`

        if (consumedAutoInviteRef.current === autoInviteKey) {
            return
        }

        consumedAutoInviteRef.current = autoInviteKey

        const createRoomAndInvite = async () => {
            setIsBusy(true)

            try {
                await ensurePlayableIdentity()
                const response = await emit('room:create', {
                    modeKey: modeKey || '1v1',
                    settings: roomSettings,
                })

                if (!response.success) {
                    notify(response.message || t('lobby.notifications.createRoomFailed'), 'error')
                    return
                }

                setCurrentRoom(response.room)
                setRoomId(response.room.id)
                setJoinRoomId(response.room.id)
                if (response.room?.settings) {
                    setRoomSettings(normalizeMatchSettings(response.room.settings))
                }
                navigateToRoom(response.room)
                await sendRoomInvite(inviteFriendId, response.room)
            } catch (error) {
                notify(error.message || t('lobby.notifications.inviteFailed'), 'error')
            } finally {
                setIsBusy(false)
            }
        }

        createRoomAndInvite()
    }, [emit, ensurePlayableIdentity, location.key, location.pathname, location.state, modeKey, navigateToRoom, roomSettings, sendRoomInvite, t])

    const activePlayerName = getPlayerDisplayName(user, nickname, t)
    const roomPlayers = getRoomPlayers(currentRoom)
    const activePlayer = roomPlayers.find((player) => player.socketId === socket.id)
    const isRoomOwner = Boolean(currentRoom) &&
        (currentRoom.ownerSocketId === socket.id || String(currentRoom.ownerUserId) === String(clientUserId))
    const teamRoster = currentRoom?.teams?.length
        ? currentRoom.teams
        : [
            { id: 'team_1', score: 0, players: roomPlayers.filter((player) => player.teamNumber === 1) },
            { id: 'team_2', score: 0, players: roomPlayers.filter((player) => player.teamNumber === 2) },
        ]
    const maxPlayers = getModeRosterSize(modeKey)
    const isGuest = !user

    return (
        <section className="section lobby-page">
            <div className="container lobby-container">
                <header className="lobby-hero">
                    <div className="lobby-hero-copy">
                        <span className={`lobby-status-chip lobby-status-chip--${connectionState}`}>
                            {connectionState === 'connected' && t('lobby.status.connected')}
                            {connectionState === 'disconnected' && t('lobby.status.disconnected')}
                            {connectionState === 'error' && t('lobby.status.error')}
                        </span>
                        <h1 className="lobby-title">{modeTitle}</h1>
                        <p className="lobby-lead">
                            {t('lobby.hero.lead')}
                        </p>
                    </div>
                    <div className="lobby-hero-panel">
                        <div className="lobby-panel-label">{t('lobby.profile.label')}</div>
                        <div className="lobby-player-name">{activePlayerName}</div>
                        <label className="lobby-mode-switcher">
                            <span>{t('lobby.modeSwitcher.label')}</span>
                            <CustomSelect
                                className="lobby-mode-select"
                                value={modeConfig.key}
                                options={lobbyModeOptions}
                                onChange={handleModeChange}
                                menuPlacement="bottom"
                            />
                        </label>
                        <div className="lobby-player-meta">
                            <span>{isGuest ? t('lobby.profile.guestSession') : t('lobby.profile.authSession')}</span>
                            <span>{t('lobby.profile.role', { role: user?.role || 'guest' })}</span>
                            <span>{roomSettings.abilitiesEnabled ? t('lobby.settings.effectsOn') : t('lobby.settings.effectsOff')}</span>
                            <span>{roomSettings.specialBlocksEnabled ? t('lobby.settings.specialBlocksOn') : t('lobby.settings.specialBlocksOff')}</span>
                        </div>
                    </div>
                </header>

                <div className="lobby-grid">
                    <section className="lobby-card lobby-card--identity">
                        <div className="lobby-card-header">
                            <h2>{t('lobby.identity.title')}</h2>
                            <p>{t('lobby.identity.description')}</p>
                        </div>

                        {isGuest ? (
                            <label className="lobby-field">
                                <span>{t('lobby.identity.nicknameLabel')}</span>
                                <input
                                    type="text"
                                    value={nickname}
                                    maxLength={24}
                                    placeholder={t('lobby.identity.nicknamePlaceholder')}
                                    onChange={(event) => setNickname(event.target.value)}
                                />
                            </label>
                        ) : (
                            <div className="lobby-identity-lock">
                                <span className="lobby-identity-badge">{t('lobby.identity.accountLocked')}</span>
                                <strong>{activePlayerName}</strong>
                                <p>{t('lobby.identity.accountLockedDescription')}</p>
                            </div>
                        )}
                    </section>

                    <section className="lobby-card flex">
                        <div className="lobby-card-header">
                            <h2>{t('lobby.create.title')}</h2>
                            <p>{t('lobby.create.description')}</p>
                        </div>

                        <button
                            type="button"
                            className="button lobby-primary-button"
                            onClick={handleCreateRoom}
                            disabled={isBusy}
                        >
                            {t('lobby.create.button')}
                        </button>
                    </section>

                    <section className="lobby-card">
                        <div className="lobby-card-header">
                            <h2>{t('lobby.join.title')}</h2>
                            <p>{t('lobby.join.description')}</p>
                        </div>

                        <label className="lobby-field">
                            <span>{t('lobby.join.roomIdLabel')}</span>
                            <input
                                type="text"
                                value={joinRoomId}
                                placeholder={t('lobby.join.roomIdPlaceholder')}
                                onChange={(event) => setJoinRoomId(event.target.value)}
                            />
                        </label>

                        <button
                            type="button"
                            className="button lobby-secondary-button"
                            onClick={handleJoinRoom}
                            disabled={isBusy || !joinRoomId.trim()}
                        >
                            {t('lobby.join.button')}
                        </button>
                    </section>
                </div>

                <section className="lobby-room-card">
                    <div className="lobby-room-header">
                        <div>
                            <div className="lobby-panel-label">{t('lobby.room.currentLabel')}</div>
                            <h2>{roomId || t('lobby.room.emptyTitle')}</h2>
                        </div>
                        <div className="lobby-room-actions">
                            <button
                                type="button"
                                className="button lobby-ghost-button danger"
                                onClick={handleLeaveRoom}
                                disabled={!roomId}
                            >
                                {t('lobby.room.leave')}
                            </button>
                            <button
                                type="button"
                                className="button lobby-ghost-button"
                                onClick={handleCopyRoomLink}
                                disabled={!roomId}
                            >
                                {t('lobby.room.copyLink')}
                            </button>
                            <button
                                type="button"
                                className="button lobby-ghost-button"
                                onClick={handleNativeShareRoom}
                                disabled={!roomId}
                            >
                                {t('lobby.share.native')}
                            </button>
                            <button
                                type="button"
                                className={`button lobby-primary-button ${activePlayer?.isReady ? 'danger' : ''}`}
                                onClick={handleReadyToggle}
                                disabled={!currentRoom}
                            >
                                {activePlayer?.isReady ? t('lobby.room.unready') : t('lobby.room.ready')}
                            </button>
                        </div>
                    </div>

                    {roomId ? (
                        <div className="lobby-share-panel">
                            <div>
                                <span className="lobby-panel-label">{t('lobby.share.label')}</span>
                                <p>{roomShareUrl}</p>
                            </div>
                            <div className="lobby-share-panel__actions" aria-label={t('lobby.share.label')}>
                                <button type="button" onClick={() => handleShareChannel('telegram')}>
                                    <i className="fab fa-telegram-plane"></i>
                                    {t('lobby.share.telegram')}
                                </button>
                                <button type="button" onClick={() => handleShareChannel('whatsapp')}>
                                    <i className="fab fa-whatsapp"></i>
                                    {t('lobby.share.whatsapp')}
                                </button>
                                <button type="button" onClick={() => handleShareChannel('email')}>
                                    <i className="fas fa-envelope"></i>
                                    {t('lobby.share.email')}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    <div className="lobby-settings-panel">
                        <div className="lobby-settings-panel__header">
                            <span className="lobby-panel-label">{t('lobby.settings.matchConfig')}</span>
                            <strong>{modeTitle}</strong>
                            <span>{t('lobby.settings.playersCount', { count: roomPlayers.length, max: maxPlayers })}</span>
                        </div>

                        <div className="lobby-settings-pills">
                            <span className={`lobby-settings-pill ${roomSettings.abilitiesEnabled ? 'is-active' : ''}`}>
                                <i className="fas fa-bolt"></i>
                                {roomSettings.abilitiesEnabled ? t('lobby.settings.abilitiesEnabled') : t('lobby.settings.abilitiesDisabled')}
                            </span>
                            <span className={`lobby-settings-pill ${roomSettings.specialBlocksEnabled ? 'is-active' : ''}`}>
                                <i className="fas fa-shapes"></i>
                                {roomSettings.specialBlocksEnabled ? t('lobby.settings.specialBlocksEnabled') : t('lobby.settings.specialBlocksDisabled')}
                            </span>
                        </div>
                    </div>

                    <div className="lobby-roster lobby-roster--teams">
                        {teamRoster.map((team) => (
                            <section key={team.id} className="lobby-team-column">
                                <div className="lobby-team-column__header">
                                    <strong>{getTeamLabel(team.id, t)}</strong>
                                    <span>{t('lobby.teams.points', { points: Number(team.score) || 0 })}</span>
                                </div>

                                {(team.players || []).map((player) => (
                                    <article key={`${team.id}-${player.userId}`} className="lobby-player-card">
                                        <div className="lobby-player-card__identity">
                                            <PlayerAvatar player={player} />
                                            <div>
                                                <h3>{player.username}</h3>
                                                <p>{player.userId === clientUserId ? t('lobby.teams.you') : getTeamLabel(team.id, t)}</p>
                                            </div>
                                        </div>

                                        <div className="lobby-player-card__actions">
                                            {isRoomOwner && modeKey === '2v2' ? (
                                                <div className="lobby-team-switcher" aria-label={t('lobby.teams.teamSelectAria')}>
                                                    {['team_1', 'team_2'].map((nextTeamId) => (
                                                        <button
                                                            key={nextTeamId}
                                                            type="button"
                                                            className={nextTeamId === team.id ? 'is-active' : ''}
                                                            onClick={() => handleSetTeam(player, nextTeamId)}
                                                            disabled={nextTeamId === team.id}
                                                        >
                                                            {nextTeamId === 'team_1' ? 'T1' : 'T2'}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : null}
                                            <span className={`lobby-ready-badge ${player.isReady ? 'is-ready' : ''}`}>
                                                {player.isReady ? t('lobby.teams.ready') : t('lobby.teams.waiting')}
                                            </span>
                                        </div>
                                    </article>
                                ))}

                                {(team.players || []).length === 0 && currentRoom ? (
                                    <div className="lobby-empty-state">
                                        {t('lobby.teams.emptySlot')}
                                    </div>
                                ) : null}
                            </section>
                        ))}

                        {!currentRoom && (
                            <div className="lobby-empty-state">
                                {t('lobby.room.emptyRoster')}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </section>
    )
}

export default LobbyPage
