import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../shared/hooks/useAuth'
import {
    ensureSocketSession,
    getStoredGuestSession,
    isValidGuestNickname,
    normalizeGuestNickname,
    socket,
} from '../../shared/api/socket'
import notify from '../../utils/Notifications'

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

const LobbyPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
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

    useEffect(() => {
        if (user?.username || user?.email) {
            setNickname(user.username || user.email)
        }
    }, [user])

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

        const handleMatchStart = ({ roomId: startedRoomId }) => {
            if (notifiedRoomRef.current !== startedRoomId) {
                notifiedRoomRef.current = startedRoomId
                notify('Оба игрока готовы. Матч начинается', 'success')
            }

            navigate(`/match/${startedRoomId}`)
        }

        socket.on('room:state', handleRoomState)
        socket.on('room:player-joined', handlePlayerJoined)
        socket.on('room:player-left', handlePlayerLeft)
        socket.on('match:start', handleMatchStart)

        return () => {
            socket.off('room:state', handleRoomState)
            socket.off('room:player-joined', handlePlayerJoined)
            socket.off('room:player-left', handlePlayerLeft)
            socket.off('match:start', handleMatchStart)
        }
    }, [clientUserId, currentRoom?.id, navigate])

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
            const response = await emitWithAck('room:create', {})

            if (!response.success) {
                notify(response.message || 'Не удалось создать комнату', 'error')
                return
            }

            setCurrentRoom(response.room)
            setRoomId(response.room.id)
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
    const activePlayer = currentRoom?.players.find((player) => player.socketId === socket.id)
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
                        <h1 className="lobby-title">Лобби дуэли 1 на 1</h1>
                        <p className="lobby-lead">
                            Авторизованный игрок заходит по своему аккаунту, гость играет по никнейму.
                            Права не подделываются.
                        </p>
                    </div>
                    <div className="lobby-hero-panel">
                        <div className="lobby-panel-label">Ваш профиль</div>
                        <div className="lobby-player-name">{activePlayerName}</div>
                        <div className="lobby-player-meta">
                            <span>{isGuest ? 'Guest session' : 'Authenticated session'}</span>
                            <span>Role: {user?.role || 'guest'}</span>
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
                            <p>Откройте дуэльную комнату и отправьте ID другу.</p>
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

                    <div className="lobby-roster">
                        {(currentRoom?.players || []).map((player) => (
                            <article key={player.userId} className="lobby-player-card">
                                <div>
                                    <h3>{player.username}</h3>
                                    <p>{player.userId === clientUserId ? 'Это вы' : 'Соперник'}</p>
                                </div>
                                <span className={`lobby-ready-badge ${player.isReady ? 'is-ready' : ''}`}>
                                    {player.isReady ? 'Ready' : 'Waiting'}
                                </span>
                            </article>
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
