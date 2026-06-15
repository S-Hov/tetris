import crypto from 'crypto'

const MAX_RECENT_EVENTS = 24
const recentEvents = []
let activityFeedIo = null

const EVENT_TITLES = {
    connected: 'Игрок появился на арене',
    disconnected: 'Игрок покинул арену',
    registered: 'Новый аккаунт',
    room_created: 'Создана комната',
    room_joined: 'Игрок вошел в комнату',
    room_left: 'Игрок вышел из комнаты',
    matchmaking_started: 'Запущен поиск',
    matchmaking_cancelled: 'Поиск отменен',
    match_started: 'Матч начался',
    match_finished: 'Матч завершен',
    ability_used: 'Эффект применен',
    party_created: 'Собрана команда',
    party_joined: 'Союзник подключился',
    party_search_started: 'Команда ищет матч',
}

const EVENT_ACCENTS = {
    connected: 'cyan',
    disconnected: 'muted',
    registered: 'gold',
    room_created: 'violet',
    room_joined: 'cyan',
    room_left: 'muted',
    matchmaking_started: 'blue',
    matchmaking_cancelled: 'muted',
    match_started: 'green',
    match_finished: 'pink',
    ability_used: 'pink',
    party_created: 'violet',
    party_joined: 'cyan',
    party_search_started: 'blue',
}

const sanitizeText = (value, fallback = '') => {
    const text = String(value || fallback).trim().replace(/\s+/g, ' ')

    return text.length > 80 ? `${text.slice(0, 77)}...` : text
}

const createEventId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const buildActivityEvent = ({
    type,
    actor,
    target,
    mode,
    matchType,
    roomId,
    detail,
    metadata = {},
}) => ({
    id: createEventId(),
    type,
    title: EVENT_TITLES[type] || 'Событие арены',
    actor: sanitizeText(actor, 'Игрок'),
    target: target ? sanitizeText(target) : null,
    mode: mode ? sanitizeText(mode) : null,
    matchType: matchType ? sanitizeText(matchType) : null,
    roomId: roomId ? sanitizeText(roomId) : null,
    detail: detail ? sanitizeText(detail) : null,
    accent: EVENT_ACCENTS[type] || 'cyan',
    createdAt: new Date().toISOString(),
    metadata,
})

export const setActivityFeedIo = (io) => {
    activityFeedIo = io
}

export const getRecentActivityEvents = () => recentEvents

export const publishActivityEvent = (payload) => {
    if (!payload?.type) {
        return null
    }

    const event = buildActivityEvent(payload)

    recentEvents.unshift(event)

    if (recentEvents.length > MAX_RECENT_EVENTS) {
        recentEvents.length = MAX_RECENT_EVENTS
    }

    activityFeedIo?.emit('activity:feed', event)

    return event
}

export const publishPlayerActivityEvent = (type, { socket, player = null, room = null, detail = null, metadata = {} } = {}) => {
    const user = socket?.data?.user || {}

    return publishActivityEvent({
        type,
        actor: player?.username || user.username || user.email || 'Игрок',
        mode: room?.modeKey || metadata.mode || null,
        matchType: room?.settings?.matchType || metadata.matchType || null,
        roomId: room?.id || metadata.roomId || null,
        detail,
        metadata,
    })
}
