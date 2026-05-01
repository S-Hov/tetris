import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/shared/hooks/useAuth'
import {
    ensureSocketSession,
    getStoredGuestSession,
    isValidGuestNickname,
    normalizeGuestNickname,
    socket,
} from '@/shared/api/socket'
import notify from '@/utils/Notifications'
import { defaultMatchSettings, normalizeMatchSettings } from '@/features/tetris/model/matchSettings.js'
import { getModeSelectionConfig } from '@/shared/config/gameModes.js'

import './LobbyPage.css'

const emitWithAck = (eventName, payload) => {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (response) => {
            resolve(response || { success: false, message: 'Нет ответа от сервера' })
        })
    })
}

const getPlayerDisplayName = (user, nickname) => {
    return user?.username || user?.email || normalizeGuestNickname(nickname) || 'Гость'
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

const getTeamLabel = (teamId) => (teamId === 'team_2' ? 'Команда 2' : 'Команда 1')

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
    const { mode } = useParams()
    const { user } = useAuth()
    const [roomId, setRoomId] = useState('')
    const [currentRoom, setCurrentRoom] = useState(null)
    const [joinRoomId, setJoinRoomId] = useState('')
    const [nickname, setNickname] = useState(() => getStoredGuestSession()?.nickname || '')
    const [isBusy, setIsBusy] = useState(false)
    const [connectionState, setConnectionState] = useState(() => (socket.connected ? 'connected' : 'disconnected'))
    const notifiedRoomRef = useRef('')
    const restoredRoomRef = useRef('')
    const clientUserId = getClientUserId(user)
    const matchResult = location.state?.matchResult || null
    const roomIdFromMatch = location.state?.roomId || ''
    const modeKey = location.state?.modeKey || currentRoom?.modeKey || mode || '1v1'
    const modeConfig = getModeSelectionConfig(modeKey)
    const [roomSettings, setRoomSettings] = useState(() => normalizeMatchSettings(location.state?.roomSettings || defaultMatchSettings))

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
        if (!user) {
            return
        }

        ensureSocketSession({ user }).catch((error) => {
            notify(error.message || 'Не удалось подключиться к арене', 'error')
        })
    }, [user])

    useEffect(() => {
        if (!matchResult) {
            return
        }

        notify(
            matchResult === 'win'
                ? 'Раунд завершён. Вы победили и вернулись в лобби'
                : 'Раунд завершён. Вы проиграли и вернулись в лобби',
            matchResult === 'win' ? 'success' : 'warning'
        )

        navigate(location.pathname, {
            replace: true,
            state: {},
        })
    }, [location.pathname, matchResult, navigate])

    useEffect(() => {
        const handleConnect = () => {
            setConnectionState('connected')
            notify('Подключение к игровой арене установлено', 'info')
        }

        const handleDisconnect = () => {
            setConnectionState('disconnected')
            notify('Соединение с игровой ареной потеряно', 'warning')
        }

        const handleConnectError = (error) => {
            setConnectionState('error')
            notify(error.message || 'Не удалось подключиться к сокет-серверу', 'error')
        }

        socket.on('connect', handleConnect)
        socket.on('disconnect', handleDisconnect)
        socket.on('connect_error', handleConnectError)

        return () => {
            socket.off('connect', handleConnect)
            socket.off('disconnect', handleDisconnect)
            socket.off('connect_error', handleConnectError)
        }
    }, [])

    useEffect(() => {
        const handleRoomState = (room) => {
            setCurrentRoom(room)
            setRoomId(room?.id || '')
            setJoinRoomId(room?.id || '')
            if (room?.settings) {
                setRoomSettings(normalizeMatchSettings(room.settings))
            }
        }

        const handlePlayerJoined = ({ username, userId }) => {
            if (userId !== clientUserId) {
                notify(`${username} подключился к комнате`, 'info')
            }
        }

        const handlePlayerLeft = ({ username, userId, roomId: leftRoomId }) => {
            if (currentRoom?.id === leftRoomId && userId !== clientUserId) {
                notify(`${username} вышел из комнаты`, 'warning')
            }
        }

        const handleRoomLeft = ({ roomId: leftRoomId }) => {
            if (leftRoomId === roomId) {
                setCurrentRoom(null)
                setRoomId('')
                setJoinRoomId('')
            }
        }

        const handleMatchStart = ({ roomId: startedRoomId }) => {
            if (notifiedRoomRef.current !== startedRoomId) {
                notifiedRoomRef.current = startedRoomId
                notify(
                    modeKey === '2v2' ? 'Все игроки готовы. Матч начинается' : 'Оба игрока готовы. Матч начинается',
                    'success'
                )
            }

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
    }, [clientUserId, currentRoom?.id, currentRoom?.modeKey, currentRoom?.settings, modeKey, navigate, roomId, roomSettings])

    const ensurePlayableIdentity = useCallback(async () => {
        if (user) {
            return await ensureSocketSession({ user })
        }

        if (!isValidGuestNickname(nickname)) {
            throw new Error('Введите корректный никнейм: 2-24 символа, буквы, цифры, пробел, ., -, _')
        }

        return await ensureSocketSession({ nickname })
    }, [nickname, user])

    useEffect(() => {
        if (!roomIdFromMatch || restoredRoomRef.current === roomIdFromMatch) {
            return
        }

        restoredRoomRef.current = roomIdFromMatch

        const restoreRoom = async () => {
            try {
                await ensurePlayableIdentity()

                const response = await emitWithAck('room:join', { roomId: roomIdFromMatch })

                if (!response.success) {
                    notify(response.message || 'Не удалось восстановить комнату после матча', 'error')
                    return
                }

                setCurrentRoom(response.room)
                setRoomId(response.room.id)
                setJoinRoomId(response.room.id)
                if (response.room?.settings) {
                    setRoomSettings(normalizeMatchSettings(response.room.settings))
                }
            } catch (error) {
                notify(error.message || 'Не удалось восстановить комнату после матча', 'error')
            }
        }

        restoreRoom()
    }, [ensurePlayableIdentity, roomIdFromMatch])

    const handleCreateRoom = async () => {
        setIsBusy(true)

        try {
            await ensurePlayableIdentity()
            const response = await emitWithAck('room:create', {
                modeKey,
                settings: roomSettings,
            })

            if (!response.success) {
                notify(response.message || 'Не удалось создать комнату', 'error')
                return
            }

            setCurrentRoom(response.room)
            setRoomId(response.room.id)
            if (response.room?.settings) {
                setRoomSettings(normalizeMatchSettings(response.room.settings))
            }
            notify(response.message || 'Комната создана', 'success')
        } catch (error) {
            notify(error.message || 'Не удалось создать комнату', 'error')
        } finally {
            setIsBusy(false)
        }
    }

    const handleJoinRoom = async () => {
        setIsBusy(true)

        try {
            await ensurePlayableIdentity()
            const response = await emitWithAck('room:join', { roomId: joinRoomId.trim() })

            if (!response.success) {
                notify(response.message || 'Не удалось подключиться к комнате', 'error')
                return
            }

            setCurrentRoom(response.room)
            setRoomId(response.room.id)
            if (response.room?.settings) {
                setRoomSettings(normalizeMatchSettings(response.room.settings))
            }
            notify(response.message || 'Вы вошли в комнату', 'success')
        } catch (error) {
            notify(error.message || 'Не удалось подключиться к комнате', 'error')
        } finally {
            setIsBusy(false)
        }
    }

    const handleReadyToggle = async () => {
        if (!roomId) {
            return
        }

        const response = await emitWithAck('player:ready', { roomId })

        if (!response.success) {
            notify(response.message || 'Не удалось обновить готовность', 'error')
            return
        }

        notify(response.message || 'Статус готовности обновлён', response.isReady ? 'success' : 'info')
    }

    const handleLeaveRoom = async () => {
        if (!roomId) {
            return
        }

        const response = await emitWithAck('room:leave', { roomId })

        if (!response.success) {
            notify(response.message || 'Не удалось выйти из лобби', 'error')
            return
        }

        setCurrentRoom(null)
        setRoomId('')
        setJoinRoomId('')
        notify(response.message || 'Вы вышли из лобби', 'info')
    }

    const handleSetTeam = async (player, teamId) => {
        if (!roomId || !player?.userId) {
            return
        }

        const response = await emitWithAck('room:set-team', {
            roomId,
            userId: player.userId,
            teamId,
        })

        if (!response.success) {
            notify(response.message || 'Не удалось поменять команду', 'error')
            return
        }

        if (response.room) {
            setCurrentRoom(response.room)
        }
        notify(response.message || 'Команда обновлена', 'success')
    }

    const handleCopyRoomId = async () => {
        if (!roomId || !navigator?.clipboard) {
            notify('Скопировать ID комнаты не удалось', 'error')
            return
        }

        try {
            await navigator.clipboard.writeText(roomId)
            notify('ID комнаты скопирован', 'info')
        } catch {
            notify('Скопировать ID комнаты не удалось', 'error')
        }
    }

    const activePlayerName = getPlayerDisplayName(user, nickname)
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
                            {connectionState === 'connected' && 'Arena online'}
                            {connectionState === 'disconnected' && 'Arena offline'}
                            {connectionState === 'error' && 'Arena error'}
                        </span>
                        <h1 className="lobby-title">{modeConfig.title}</h1>
                        <p className="lobby-lead">
                            Авторизованный игрок заходит по своему аккаунту, гость играет по никнейму.
                            Права не подделываются. Лобби универсальное, а настройки режима сохраняются в самой комнате.
                        </p>
                    </div>
                    <div className="lobby-hero-panel">
                        <div className="lobby-panel-label">Ваш профиль</div>
                        <div className="lobby-player-name">{activePlayerName}</div>
                        <div className="lobby-player-meta">
                            <span>{isGuest ? 'Guest session' : 'Authenticated session'}</span>
                            <span>Role: {user?.role || 'guest'}</span>
                            <span>{roomSettings.abilitiesEnabled ? 'Эффекты: ON' : 'Эффекты: OFF'}</span>
                            <span>{roomSettings.specialBlocksEnabled ? 'Нестандартные блоки: ON' : 'Нестандартные блоки: OFF'}</span>
                        </div>
                    </div>
                </header>

                <div className="lobby-grid">
                    <section className="lobby-card lobby-card--identity">
                        <div className="lobby-card-header">
                            <h2>Кто играет</h2>
                            <p>Выберите, под каким именем входить в комнату.</p>
                        </div>

                        {isGuest ? (
                            <label className="lobby-field">
                                <span>Никнейм гостя</span>
                                <input
                                    type="text"
                                    value={nickname}
                                    maxLength={24}
                                    placeholder="Например, NeonStack"
                                    onChange={(event) => setNickname(event.target.value)}
                                />
                            </label>
                        ) : (
                            <div className="lobby-identity-lock">
                                <span className="lobby-identity-badge">Account locked</span>
                                <strong>{activePlayerName}</strong>
                                <p>Имя для комнаты берётся с сервера, а не с клиента.</p>
                            </div>
                        )}
                    </section>

                    <section className="lobby-card flex">
                        <div className="lobby-card-header">
                            <h2>Создать комнату</h2>
                            <p>Откройте комнату и отправьте ID друзьям.</p>
                        </div>

                        <button
                            type="button"
                            className="button lobby-primary-button"
                            onClick={handleCreateRoom}
                            disabled={isBusy}
                        >
                            Создать комнату
                        </button>
                    </section>

                    <section className="lobby-card">
                        <div className="lobby-card-header">
                            <h2>Присоединиться</h2>
                            <p>Введите ID комнаты, чтобы подключиться к уже созданному матчу.</p>
                        </div>

                        <label className="lobby-field">
                            <span>ID комнаты</span>
                            <input
                                type="text"
                                value={joinRoomId}
                                placeholder="Вставьте room id"
                                onChange={(event) => setJoinRoomId(event.target.value)}
                            />
                        </label>

                        <button
                            type="button"
                            className="button lobby-secondary-button"
                            onClick={handleJoinRoom}
                            disabled={isBusy || !joinRoomId.trim()}
                        >
                            Подключиться к комнате
                        </button>
                    </section>
                </div>

                <section className="lobby-room-card">
                    <div className="lobby-room-header">
                        <div>
                            <div className="lobby-panel-label">Текущая комната</div>
                            <h2>{roomId || 'Комната пока не выбрана'}</h2>
                        </div>
                        <div className="lobby-room-actions">
                            <button
                                type="button"
                                className="button lobby-ghost-button danger"
                                onClick={handleLeaveRoom}
                                disabled={!roomId}
                            >
                                Выйти из лобби
                            </button>
                            <button
                                type="button"
                                className="button lobby-ghost-button"
                                onClick={handleCopyRoomId}
                                disabled={!roomId}
                            >
                                Скопировать ID
                            </button>
                            <button
                                type="button"
                                className={`button lobby-primary-button ${activePlayer?.isReady ? 'danger' : ''}`}
                                onClick={handleReadyToggle}
                                disabled={!currentRoom}
                            >
                                {activePlayer?.isReady ? 'Снять готовность' : 'Я готов'}
                            </button>
                        </div>
                    </div>

                    <div className="lobby-settings-panel">
                        <div className="lobby-settings-panel__header">
                            <span className="lobby-panel-label">Конфигурация матча</span>
                            <strong>{modeConfig.title}</strong>
                            <span>{roomPlayers.length}/{maxPlayers} игроков</span>
                        </div>

                        <div className="lobby-settings-pills">
                            <span className={`lobby-settings-pill ${roomSettings.abilitiesEnabled ? 'is-active' : ''}`}>
                                <i className="fas fa-bolt"></i>
                                {roomSettings.abilitiesEnabled ? 'Способности включены' : 'Без способностей'}
                            </span>
                            <span className={`lobby-settings-pill ${roomSettings.specialBlocksEnabled ? 'is-active' : ''}`}>
                                <i className="fas fa-shapes"></i>
                                {roomSettings.specialBlocksEnabled ? 'Нестандартные блоки включены' : 'Только стандартные блоки'}
                            </span>
                        </div>
                    </div>

                    <div className="lobby-roster lobby-roster--teams">
                        {teamRoster.map((team) => (
                            <section key={team.id} className="lobby-team-column">
                                <div className="lobby-team-column__header">
                                    <strong>{getTeamLabel(team.id)}</strong>
                                    <span>{Number(team.score) || 0} pts</span>
                                </div>

                                {(team.players || []).map((player) => (
                                    <article key={`${team.id}-${player.userId}`} className="lobby-player-card">
                                        <div className="lobby-player-card__identity">
                                            <PlayerAvatar player={player} />
                                            <div>
                                                <h3>{player.username}</h3>
                                                <p>{player.userId === clientUserId ? 'Это вы' : getTeamLabel(team.id)}</p>
                                            </div>
                                        </div>

                                        <div className="lobby-player-card__actions">
                                            {isRoomOwner && modeKey === '2v2' ? (
                                                <div className="lobby-team-switcher" aria-label="Выбор команды">
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
                                                {player.isReady ? 'Ready' : 'Waiting'}
                                            </span>
                                        </div>
                                    </article>
                                ))}

                                {(team.players || []).length === 0 && currentRoom ? (
                                    <div className="lobby-empty-state">
                                        Место свободно.
                                    </div>
                                ) : null}
                            </section>
                        ))}

                        {!currentRoom && (
                            <div className="lobby-empty-state">
                                Создайте комнату или подключитесь к существующей, чтобы увидеть состав игроков.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </section>
    )
}

export default LobbyPage
