import { pool } from '../db/index.js'

const ACTIVE_SESSION_WINDOW_MINUTES = 15

const hasTableCache = new Map()
const TABLE_CHECK_RETRY_DELAY_MS = 30_000
let tableCheckPausedUntil = 0

export const getActiveSessionWindowMinutes = () => ACTIVE_SESSION_WINDOW_MINUTES

export const trackPageViewRepo = async ({
    userId = null,
    sessionKey,
    path,
    referrer = null,
    source = null,
    deviceType = null,
    ipAddress = null,
    userAgent = null,
    metadata = {},
}) => {
    if (!sessionKey || !path || !(await tableExists('site_visit_events'))) {
        return null
    }

    const normalizedSource = normalizeTrafficSource({ source, referrer, path })
    const normalizedDeviceType = normalizeDeviceType(deviceType, userAgent)

    await upsertUserSessionRepo({
        userId,
        sessionKey,
        ipAddress,
        userAgent,
        status: 'active',
        metadata: {
            source: normalizedSource,
            path,
            referrer,
        },
    })

    const { rows } = await pool.query(
        `
        INSERT INTO site_visit_events (
            user_id,
            session_key,
            ip_address,
            user_agent,
            path,
            referrer,
            source,
            device_type,
            metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        RETURNING id, occurred_at
        `,
        [
            getIntegerUserId(userId),
            sessionKey,
            ipAddress,
            userAgent,
            path,
            referrer,
            normalizedSource,
            normalizedDeviceType,
            JSON.stringify(metadata || {}),
        ]
    )

    return {
        id: rows[0]?.id || null,
        sessionKey,
        source: normalizedSource,
        deviceType: normalizedDeviceType,
        occurredAt: rows[0]?.occurred_at || null,
    }
}

export const upsertUserSessionRepo = async ({
    userId = null,
    sessionKey,
    socketId = null,
    ipAddress = null,
    userAgent = null,
    status = 'active',
    metadata = {},
}) => {
    if (!sessionKey || !(await tableExists('user_sessions'))) {
        return null
    }

    const { rows } = await pool.query(
        `
        INSERT INTO user_sessions (
            user_id,
            session_key,
            socket_id,
            ip_address,
            user_agent,
            status,
            metadata,
            last_seen_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
        ON CONFLICT (session_key) DO UPDATE
        SET user_id = COALESCE(EXCLUDED.user_id, user_sessions.user_id),
            socket_id = COALESCE(EXCLUDED.socket_id, user_sessions.socket_id),
            ip_address = COALESCE(EXCLUDED.ip_address, user_sessions.ip_address),
            user_agent = COALESCE(EXCLUDED.user_agent, user_sessions.user_agent),
            status = EXCLUDED.status,
            metadata = user_sessions.metadata || EXCLUDED.metadata,
            last_seen_at = NOW(),
            ended_at = NULL
        RETURNING id, session_key, status, last_seen_at
        `,
        [
            getIntegerUserId(userId),
            sessionKey,
            socketId,
            ipAddress,
            userAgent,
            status,
            JSON.stringify(metadata || {}),
        ]
    )

    return rows[0] || null
}

export const endUserSessionRepo = async (sessionKey) => {
    if (!sessionKey || !(await tableExists('user_sessions'))) {
        return null
    }

    const { rows } = await pool.query(
        `
        UPDATE user_sessions
        SET status = 'ended',
            ended_at = NOW(),
            last_seen_at = NOW()
        WHERE session_key = $1
        RETURNING id, session_key, status, ended_at
        `,
        [sessionKey]
    )

    return rows[0] || null
}

export const recordGameActivityEventRepo = async ({
    matchId = null,
    roomId = null,
    userId = null,
    sessionKey = null,
    mode = null,
    matchType = null,
    eventType,
    metadata = {},
}) => {
    if (!eventType || !(await tableExists('game_activity_events'))) {
        return null
    }

    const { rows } = await pool.query(
        `
        INSERT INTO game_activity_events (
            match_id,
            room_id,
            user_id,
            session_key,
            mode,
            match_type,
            event_type,
            metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        RETURNING id
        `,
        [
            matchId,
            roomId,
            getIntegerUserId(userId),
            sessionKey,
            mode,
            matchType,
            eventType,
            JSON.stringify(metadata || {}),
        ]
    )

    return rows[0] || null
}

async function tableExists(tableName) {
    if (Date.now() < tableCheckPausedUntil) {
        return false
    }

    if (hasTableCache.has(tableName)) {
        return hasTableCache.get(tableName)
    }

    let rows

    try {
        const result = await pool.query('SELECT to_regclass($1) AS table_name', [tableName])
        rows = result.rows
    } catch (error) {
        if (isAnalyticsTransientDbError(error)) {
            tableCheckPausedUntil = Date.now() + TABLE_CHECK_RETRY_DELAY_MS
            return false
        }

        throw error
    }

    const exists = Boolean(rows[0]?.table_name)

    hasTableCache.set(tableName, exists)
    return exists
}

export function isConnectionCapacityError(error) {
    return error?.code === '53300' ||
        (error?.code === 'XX000' && String(error?.message || '').includes('max clients'))
}

export function isAnalyticsTransientDbError(error) {
    const message = String(error?.message || '')

    return isConnectionCapacityError(error) ||
        message.includes('Connection terminated unexpectedly') ||
        message.includes('Connection terminated') ||
        message.includes('Connection ended unexpectedly')
}

function getIntegerUserId(userId) {
    return Number.isInteger(userId) ? userId : null
}

function normalizeDeviceType(deviceType, userAgent = '') {
    if (['desktop', 'mobile', 'tablet', 'bot', 'unknown'].includes(deviceType)) {
        return deviceType
    }

    const agent = String(userAgent || '').toLowerCase()

    if (!agent) {
        return 'unknown'
    }

    if (/bot|crawler|spider|slurp|yandex|googlebot|bingpreview/.test(agent)) {
        return 'bot'
    }

    if (/ipad|tablet/.test(agent)) {
        return 'tablet'
    }

    if (/mobile|iphone|android/.test(agent)) {
        return 'mobile'
    }

    return 'desktop'
}

function normalizeTrafficSource({ source, referrer, path }) {
    const explicitSource = String(source || '').trim()

    if (explicitSource) {
        return explicitSource.slice(0, 80)
    }

    const utmSource = getUtmSource(path)

    if (utmSource) {
        return utmSource.slice(0, 80)
    }

    const referrerHost = getReferrerHost(referrer)

    if (!referrerHost) {
        return 'direct'
    }

    if (/google\./i.test(referrerHost)) {
        return 'organic: google'
    }

    if (/yandex\./i.test(referrerHost)) {
        return 'organic: yandex'
    }

    if (/bing\./i.test(referrerHost)) {
        return 'organic: bing'
    }

    return referrerHost.slice(0, 80)
}

function getUtmSource(path) {
    try {
        const url = new URL(String(path || '/'), 'https://pvp-tetris.online')
        return url.searchParams.get('utm_source')
    } catch {
        return null
    }
}

function getReferrerHost(referrer) {
    try {
        const host = new URL(referrer).hostname
        return host.replace(/^www\./, '')
    } catch {
        return null
    }
}
