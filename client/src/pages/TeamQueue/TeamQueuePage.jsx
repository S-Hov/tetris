import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/shared/hooks/useAuth.js'
import {
    ensureSocketSession,
    socket,
} from '@/shared/api/socket'
import notify from '@/utils/Notifications'
import { defaultMatchSettings, normalizeMatchSettings } from '@/features/tetris/model/matchSettings.js'
import { getModeSelectionConfig } from '@/shared/config/gameModes.js'

import '@/pages/Lobby/LobbyPage.css'
import '@/pages/ModeSelect/ModeSelectPage.css'
import './TeamQueuePage.css'

const emitWithAck = (eventName, payload) => {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (response) => {
            resolve(response || { success: false, message: 'Нет ответа от сервера' })
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
    const { user } = useAuth()
    const modeKey = location.state?.modeKey || mode || '2v2'
    const modeConfig = useMemo(() => getModeSelectionConfig(modeKey), [modeKey])
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

    const ensurePlayerSession = useCallback(async () => {
        if (!user) {
            throw new Error('Войдите в аккаунт, чтобы искать 2v2 матч')
        }

        return await ensureSocketSession({ user })
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
            notify('Команды найдены. Матч начинается', 'success')

            navigate(`/match/${payload.roomId}`, {
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
    }, [modeKey, navigate, party?.players?.length, settings])

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
            const response = await emitWithAck('matchmaking:join', {
                modeKey,
                matchType,
                settings,
            })

            if (!response.success) {
                notify(response.message || 'Не удалось начать поиск', 'error')
                return
            }

            if (response.searching) {
                notify(response.message || 'Ищем союзника и команду соперников', 'info')
            }
        } catch (error) {
            notify(error.message || 'Не удалось начать поиск', 'error')
        } finally {
            setIsBusy(false)
        }
    }

    const handleCreateParty = async () => {
        setIsBusy(true)

        try {
            await ensurePlayerSession()
            const response = await emitWithAck('party:create', {
                modeKey,
                settings,
            })

            if (!response.success) {
                notify(response.message || 'Не удалось создать лобби союзника', 'error')
                return
            }

            setParty(response.party)
            setPartyIdInput(response.party.id)
            notify(response.message || 'Лобби союзника создано', 'success')
        } catch (error) {
            notify(error.message || 'Не удалось создать лобби союзника', 'error')
        } finally {
            setIsBusy(false)
        }
    }

    const handleJoinParty = async () => {
        setIsBusy(true)

        try {
            await ensurePlayerSession()
            const response = await emitWithAck('party:join', {
                partyId: partyIdInput.trim(),
            })

            if (!response.success) {
                notify(response.message || 'Не удалось присоединиться', 'error')
                return
            }

            setParty(response.party)
            notify(response.message || 'Вы в команде', 'success')
        } catch (error) {
            notify(error.message || 'Не удалось присоединиться', 'error')
        } finally {
            setIsBusy(false)
        }
    }

    const handlePartySearch = async () => {
        if (!party?.id) {
            return
        }

            const response = await emitWithAck('party:start-search', {
                partyId: party.id,
            matchType,
        })

        if (!response.success) {
            notify(response.message || 'Не удалось начать командный поиск', 'error')
            return
        }

        if (response.searching) {
            notify(response.message || 'Ищем команду соперников', 'info')
        }
    }

    const handleCancelSearch = async () => {
        const response = party?.id
            ? await emitWithAck('party:cancel-search', { partyId: party.id })
            : await emitWithAck('matchmaking:leave', {})

        if (!response.success) {
            notify(response.message || 'Не удалось отменить поиск', 'error')
            return
        }

        notify('Поиск отменён', 'info')
    }

    const handleLeaveParty = async () => {
        if (!party?.id) {
            return
        }

        if (searchState.isSearching) {
            await emitWithAck('party:cancel-search', { partyId: party.id })
        }

        const response = await emitWithAck('party:leave', {})

        if (!response.success) {
            notify(response.message || 'Не удалось выйти из лобби', 'error')
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
        notify('Вы вышли из лобби', 'info')
    }

    const handleCopyPartyId = async () => {
        if (!party?.id || !navigator?.clipboard) {
            notify('Скопировать ID не удалось', 'error')
            return
        }

        try {
            await navigator.clipboard.writeText(party.id)
            notify('ID лобби скопирован', 'info')
        } catch {
            notify('Скопировать ID не удалось', 'error')
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
                            {isRanked ? 'Рейтинговая игра' : 'Обычная игра'}
                        </span>
                        <h1 className="lobby-title">{modeConfig.title}</h1>
                        <p className="lobby-lead">
                            {isRanked
                                ? 'Соберите команду или начните поиск соло: матч повлияет на рейтинг и MMR всех игроков.'
                                : 'Начните поиск соло, чтобы система нашла союзника, или соберите пару и ищите соперников готовой командой.'}
                        </p>
                    </div>

                    <div className="lobby-hero-panel">
                        <div className="lobby-panel-label">Конфигурация</div>
                        <div className="lobby-player-name">{isRanked ? 'ranked team queue' : '2 / 2 team queue'}</div>
                        <div className="lobby-player-meta">
                            <span>{isRanked ? 'Рейтинг: ON' : 'Рейтинг: OFF'}</span>
                            <span>{settings.abilitiesEnabled ? 'Эффекты: ON' : 'Эффекты: OFF'}</span>
                            <span>{settings.specialBlocksEnabled ? 'Нестандартные блоки: ON' : 'Нестандартные блоки: OFF'}</span>
                            <span>{partyPlayers.length || 1}/2 союзников</span>
                        </div>
                    </div>
                </header>

                <div className="lobby-grid team-queue-grid">
                    <section className="lobby-card flex">
                        <div className="lobby-card-header">
                            <h2>Играть одному</h2>
                            <p>
                                {isRanked
                                    ? 'Сервер найдёт рейтингового союзника, сформирует вашу команду и подберёт команду соперников.'
                                    : 'Сервер найдёт второго одиночного игрока, сформирует вашу команду и затем подберёт соперников.'}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="button lobby-primary-button"
                            onClick={handleSoloSearch}
                            disabled={isBusy || searchState.isSearching}
                        >
                            Начать поиск соло
                        </button>
                    </section>

                    <section className="lobby-card">
                        <div className="lobby-card-header">
                            <h2>Играть с другом</h2>
                            <p>
                                {isRanked
                                    ? 'Создайте рейтинговое лобби союзника, отправьте ID другу и запускайте поиск готовой командой.'
                                    : 'Создайте лобби союзника, отправьте ID другу и запускайте поиск как готовая команда.'}
                            </p>
                        </div>

                        <div className="team-queue-actions">
                            <button
                                type="button"
                                className="button lobby-secondary-button team-queue-button-reset"
                                onClick={handleCreateParty}
                                disabled={isBusy || Boolean(party)}
                            >
                                Создать лобби
                            </button>

                            <label className="lobby-field">
                                <span>ID лобби</span>
                                <input
                                    type="text"
                                    value={partyIdInput}
                                    placeholder="Вставьте party id"
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
                                Войти к союзнику
                            </button>
                        </div>
                    </section>
                </div>
                {party?.id && (
                    <section className="lobby-room-card">
                        <div className="lobby-room-header">
                            <div>
                                <div className="lobby-panel-label">Ваша команда</div>
                                <h2>{party?.id || 'Лобби союзника ещё не создано'}</h2>
                            </div>

                            <div className="lobby-room-actions">
                            <button
                                type="button"
                                className="button lobby-ghost-button"
                                onClick={handleCopyPartyId}
                                disabled={!party?.id}
                            >
                                Скопировать ID
                            </button>
                            <button
                                type="button"
                                className="button lobby-ghost-button"
                                onClick={handleLeaveParty}
                                disabled={!party?.id}
                            >
                                Выйти из лобби
                            </button>
                            <button
                                type="button"
                                className="button lobby-primary-button"
                                    onClick={handlePartySearch}
                                    disabled={!canStartPartySearch}
                                >
                                    Искать командой
                                </button>
                            </div>
                        </div>

                        <div className="lobby-settings-panel">
                            <div className="lobby-settings-panel__header">
                            <span className="lobby-panel-label">Статус команды</span>
                            <strong>{party?.status === 'searching' ? 'Поиск запущен' : 'Ожидает запуска'}</strong>
                            <span>{partyPlayers.length}/2 игроков</span>
                            </div>

                        <div className="lobby-settings-pills">
                            <span className={`lobby-settings-pill ${isRanked ? 'is-active' : ''}`}>
                                <i className="fas fa-trophy"></i>
                                {isRanked ? 'Матч влияет на рейтинг' : 'Без рейтинга'}
                            </span>
                            <span className={`lobby-settings-pill ${settings.abilitiesEnabled ? 'is-active' : ''}`}>
                                <i className="fas fa-bolt"></i>
                                    {settings.abilitiesEnabled ? 'Способности включены' : 'Без способностей'}
                                </span>
                                <span className={`lobby-settings-pill ${settings.specialBlocksEnabled ? 'is-active' : ''}`}>
                                    <i className="fas fa-shapes"></i>
                                    {settings.specialBlocksEnabled ? 'Нестандартные блоки включены' : 'Только стандартные блоки'}
                                </span>
                            </div>
                        </div>

                        <div className="lobby-roster team-queue-slots">
                            {[0, 1].map((slotIndex) => {
                                const player = partyPlayers[slotIndex]

                            return (
                                <article key={slotIndex} className="lobby-player-card team-queue-slot">
                                    <div className="lobby-player-card__identity">
                                        <PlayerAvatar player={player} />
                                        <div>
                                            <h3>{player?.username || 'Ожидает игрока'}</h3>
                                            <p>{player?.isOwner ? 'Лидер команды' : player ? 'Союзник' : 'Свободно'}</p>
                                        </div>
                                    </div>
                                    <span className={`lobby-ready-badge ${player ? 'is-ready' : ''}`}>
                                        Слот {slotIndex + 1}
                                        </span>
                                    </article>
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
                                <span>{isRanked ? 'Ranked queue' : 'Casual queue'}</span>
                                <h2>{searchState.teamSize >= 2 ? 'Ищем команду соперников' : 'Ищем союзника'}</h2>
                                <p>
                                    {isRanked
                                        ? 'Когда команда будет 2/2, система подберёт рейтинговых соперников с такими же настройками.'
                                        : 'Когда команда будет 2/2, система подберёт вторую команду с такими же настройками.'}
                                </p>
                            </div>

                            <div className="mode-matchmaking-meta">
                                <div>
                                    <span>Ожидание</span>
                                    <strong>{formatWaitTime(waitSeconds)}</strong>
                                </div>
                                <div>
                                    <span>Команда</span>
                                    <strong>{Math.min(searchState.teamSize, 2)}/2</strong>
                                </div>
                            </div>

                            <button type="button" className="mode-matchmaking-cancel" onClick={handleCancelSearch}>
                                <i className="fas fa-times"></i>
                                Отменить поиск
                            </button>
                        </div>
                    </section>
                ) : null}
            </div>
        </section>
    )
}

export default TeamQueuePage
