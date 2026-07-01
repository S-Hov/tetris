import { getBaseUrl } from '../apiClient.js'
import { hasCookieConsent } from '@/shared/lib/cookieConsent.js'

const ANALYTICS_SESSION_KEY = 'tetris.analytics-session'
const SESSION_TTL_MS = 30 * 60 * 1000

export function getAnalyticsSessionKey() {
    if (typeof window === 'undefined') {
        return null
    }

    if (!hasCookieConsent()) {
        return null
    }

    const now = Date.now()
    const currentSession = readStoredSession()

    if (currentSession && now - currentSession.lastSeenAt < SESSION_TTL_MS) {
        const refreshedSession = {
            ...currentSession,
            lastSeenAt: now,
        }

        window.localStorage.setItem(ANALYTICS_SESSION_KEY, JSON.stringify(refreshedSession))
        return refreshedSession.key
    }

    const nextSession = {
        key: createSessionKey(),
        lastSeenAt: now,
    }

    window.localStorage.setItem(ANALYTICS_SESSION_KEY, JSON.stringify(nextSession))
    return nextSession.key
}

export function trackPageView({ path, title } = {}) {
    if (typeof window === 'undefined') {
        return
    }

    if (!hasCookieConsent()) {
        return
    }

    const sessionKey = getAnalyticsSessionKey()

    if (!sessionKey) {
        return
    }

    const payload = JSON.stringify({
        sessionKey,
        path: path || `${window.location.pathname}${window.location.search}`,
        referrer: document.referrer || null,
        title: title || document.title,
        screen: {
            width: window.screen?.width || null,
            height: window.screen?.height || null,
        },
    })

    const url = `${getBaseUrl()}/api/analytics/page-view`

    fetch(url, {
        method: 'POST',
        body: payload,
        credentials: 'include',
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
        },
    }).catch(() => {})
}

function readStoredSession() {
    try {
        const rawValue = window.localStorage.getItem(ANALYTICS_SESSION_KEY)

        if (!rawValue) {
            return null
        }

        const session = JSON.parse(rawValue)

        if (!session?.key || !Number.isFinite(session.lastSeenAt)) {
            return null
        }

        return session
    } catch {
        return null
    }
}

function createSessionKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
