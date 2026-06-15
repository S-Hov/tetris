import { useEffect, useMemo, useState } from 'react'
import { ensureSocketSession, socket } from '@/shared/api/socket'
import { useAuth } from '@/shared/hooks/useAuth'
import './ActivityFeed.css'

const MAX_EVENTS = 18
const AMBIENT_EVENT_INTERVAL_MS = 8500

const AMBIENT_ACTORS = [
    'NOVA-17',
    'ChainRunner',
    'BitStack',
    'Artemis',
    'ZeroDrop',
    'BlockPilot',
    'MetaTetra',
    'PulseMage',
]

const AMBIENT_EVENTS = [
    { type: 'matchmaking_started', title: 'Запущен поиск', detail: '1v1 casual', accent: 'blue' },
    { type: 'ability_used', title: 'Эффект применен', detail: 'darkness -> соперник', accent: 'pink' },
    { type: 'match_started', title: 'Матч начался', detail: 'ranked арена', accent: 'green' },
    { type: 'room_created', title: 'Создана комната', detail: '2v2 private', accent: 'violet' },
    { type: 'registered', title: 'Новый аккаунт', detail: 'присоединился к арене', accent: 'gold' },
]

const getAmbientEvent = () => {
    const event = AMBIENT_EVENTS[Math.floor(Math.random() * AMBIENT_EVENTS.length)]
    const actor = AMBIENT_ACTORS[Math.floor(Math.random() * AMBIENT_ACTORS.length)]

    return {
        ...event,
        id: `ambient-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        actor,
        createdAt: new Date().toISOString(),
        isAmbient: true,
    }
}

const normalizeEvent = (event) => ({
    id: event.id || `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: event.type || 'activity',
    title: event.title || 'Событие арены',
    actor: event.actor || 'Игрок',
    target: event.target || null,
    detail: event.detail || null,
    mode: event.mode || null,
    matchType: event.matchType || null,
    roomId: event.roomId || null,
    accent: event.accent || 'cyan',
    createdAt: event.createdAt || new Date().toISOString(),
    isAmbient: Boolean(event.isAmbient),
})

const formatEventTime = (value) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'сейчас'
    }

    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

const ActivityFeed = () => {
    const { user, isLoading } = useAuth()
    const [events, setEvents] = useState(() => (
        Array.from({ length: 6 }, getAmbientEvent)
    ))
    const [isOnline, setIsOnline] = useState(socket.connected)

    const latestEvents = useMemo(() => events.slice(0, MAX_EVENTS), [events])

    useEffect(() => {
        if (isLoading) {
            return undefined
        }

        let isMounted = true

        const addEvent = (event) => {
            setEvents((currentEvents) => {
                const nextEvent = normalizeEvent(event)
                const withoutDuplicate = currentEvents.filter((item) => item.id !== nextEvent.id)

                return [nextEvent, ...withoutDuplicate].slice(0, MAX_EVENTS)
            })
        }

        const handleInit = (payload = []) => {
            const normalizedEvents = payload.map(normalizeEvent)

            if (!normalizedEvents.length) {
                return
            }

            setEvents((currentEvents) => {
                const ambientEvents = currentEvents.filter((event) => event.isAmbient)

                return [...normalizedEvents, ...ambientEvents].slice(0, MAX_EVENTS)
            })
        }

        const handleConnect = () => {
            if (isMounted) {
                setIsOnline(true)
            }
        }

        const handleDisconnect = () => {
            if (isMounted) {
                setIsOnline(false)
            }
        }

        socket.on('activity:feed:init', handleInit)
        socket.on('activity:feed', addEvent)
        socket.on('connect', handleConnect)
        socket.on('disconnect', handleDisconnect)

        ensureSocketSession({
            user,
            nickname: user ? undefined : 'Spectator',
        }).catch(() => {
            if (isMounted) {
                setIsOnline(false)
            }
        })

        return () => {
            isMounted = false
            socket.off('activity:feed:init', handleInit)
            socket.off('activity:feed', addEvent)
            socket.off('connect', handleConnect)
            socket.off('disconnect', handleDisconnect)
        }
    }, [isLoading, user])

    useEffect(() => {
        const timer = window.setInterval(() => {
            setEvents((currentEvents) => {
                const serverEventsCount = currentEvents.filter((event) => !event.isAmbient).length

                if (serverEventsCount >= 8) {
                    return currentEvents
                }

                return [getAmbientEvent(), ...currentEvents].slice(0, MAX_EVENTS)
            })
        }, AMBIENT_EVENT_INTERVAL_MS)

        return () => window.clearInterval(timer)
    }, [])

    return (
        <aside className="activity-feed" aria-label="Лента событий арены" tabIndex={0}>
            <div className="activity-feed__header">
                <span className="activity-feed__signal" aria-hidden="true" />
                <div className="activity-feed__heading">
                    <span className="activity-feed__eyebrow">Live arena</span>
                    <strong>События</strong>
                </div>
                <span className={isOnline ? 'activity-feed__status activity-feed__status--online' : 'activity-feed__status'}>
                    {isOnline ? 'online' : 'sim'}
                </span>
            </div>

            <div className="activity-feed__list">
                {latestEvents.map((event) => (
                    <article className={`activity-feed__item activity-feed__item--${event.accent}`} key={event.id}>
                        <span className="activity-feed__marker" aria-hidden="true" />
                        <div className="activity-feed__body">
                            <div className="activity-feed__line">
                                <span className="activity-feed__actor">{event.actor}</span>
                                <span className="activity-feed__time">{formatEventTime(event.createdAt)}</span>
                            </div>
                            <div className="activity-feed__title">{event.title}</div>
                            {event.detail ? (
                                <div className="activity-feed__detail">{event.detail}</div>
                            ) : null}
                        </div>
                    </article>
                ))}
            </div>
        </aside>
    )
}

export default ActivityFeed
