import { io } from 'socket.io-client'
import { getAnalyticsSessionKey } from '@/shared/api/analytics'

const GUEST_SESSION_STORAGE_KEY = 'tetris.guest-session'
const GUEST_NICKNAME_MIN_LENGTH = 2
const GUEST_NICKNAME_MAX_LENGTH = 24

const getSocketBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL
    }

    if (typeof window !== 'undefined' && window.location.hostname) {
        return `http://${window.location.hostname}:8880`
    }

    return 'http://127.0.0.1:8880'
}

const createGuestId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const normalizeGuestNickname = (value) => {
    return String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
}

export const isValidGuestNickname = (value) => {
    const nickname = normalizeGuestNickname(value)

    if (nickname.length < GUEST_NICKNAME_MIN_LENGTH || nickname.length > GUEST_NICKNAME_MAX_LENGTH) {
        return false
    }

    return /^[\p{L}\p{N}_ .-]+$/u.test(nickname)
}

export const getStoredGuestSession = () => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const rawValue = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY)

        if (!rawValue) {
            return null
        }

        const parsedValue = JSON.parse(rawValue)

        if (!parsedValue?.id || !isValidGuestNickname(parsedValue.nickname)) {
            return null
        }

        return {
            id: parsedValue.id,
            nickname: normalizeGuestNickname(parsedValue.nickname),
        }
    } catch {
        return null
    }
}

export const saveGuestSession = (nickname) => {
    const normalizedNickname = normalizeGuestNickname(nickname)

    if (!isValidGuestNickname(normalizedNickname) || typeof window === 'undefined') {
        return null
    }

    const previousSession = getStoredGuestSession()
    const guestSession = {
        id: previousSession?.id || createGuestId(),
        nickname: normalizedNickname,
    }

    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(guestSession))

    return guestSession
}

const getSocketAuthPayload = ({ user, nickname } = {}) => {
    const analyticsSessionKey = getAnalyticsSessionKey()

    if (user?.id) {
        return { mode: 'authenticated', analyticsSessionKey }
    }

    const guestSession = nickname
        ? saveGuestSession(nickname)
        : getStoredGuestSession()

    if (!guestSession) {
        throw new Error('Введите никнейм для гостевой игры')
    }

    return {
        mode: 'guest',
        guestId: guestSession.id,
        nickname: guestSession.nickname,
        analyticsSessionKey,
    }
}

const areAuthPayloadsEqual = (left, right) => {
    return JSON.stringify(left || {}) === JSON.stringify(right || {})
}

export const socket = io(getSocketBaseUrl(), {
    withCredentials: true,
    autoConnect: false,
})

export const ensureSocketSession = async ({ user, nickname } = {}) => {
    const nextAuth = getSocketAuthPayload({ user, nickname })

    if (socket.connected && areAuthPayloadsEqual(socket.auth, nextAuth)) {
        return socket
    }

    if (!areAuthPayloadsEqual(socket.auth, nextAuth)) {
        socket.auth = nextAuth
    }

    if (socket.connected) {
        socket.disconnect()
    }

    return await new Promise((resolve, reject) => {
        const handleConnect = () => {
            cleanup()
            resolve(socket)
        }

        const handleConnectError = (error) => {
            cleanup()
            reject(error)
        }

        const cleanup = () => {
            socket.off('connect', handleConnect)
            socket.off('connect_error', handleConnectError)
        }

        socket.on('connect', handleConnect)
        socket.on('connect_error', handleConnectError)
        socket.connect()
    })
}
