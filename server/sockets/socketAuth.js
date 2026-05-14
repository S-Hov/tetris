import jwt from 'jsonwebtoken'
import { getSocketUserRepo } from '../repositories/authRepository.js'

const GUEST_NICKNAME_MIN_LENGTH = 2
const GUEST_NICKNAME_MAX_LENGTH = 24

const parseCookies = (cookieHeader) => {
    return cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf('=')

            if (separatorIndex === -1) {
                return cookies
            }

            const key = decodeURIComponent(part.slice(0, separatorIndex).trim())
            const value = decodeURIComponent(part.slice(separatorIndex + 1).trim())

            cookies[key] = value
            return cookies
        }, {})
}

const getTokenFromHandshake = (socket) => {
    const cookieHeader = socket.handshake.headers?.cookie

    if (!cookieHeader) {
        return null
    }

    const cookies = parseCookies(cookieHeader)

    return cookies.token || null
}

const normalizeNickname = (value) => {
    return String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
}

const isValidGuestId = (value) => {
    return typeof value === 'string' && value.trim().length >= 8 && value.trim().length <= 128
}

const isValidNickname = (value) => {
    const nickname = normalizeNickname(value)

    if (nickname.length < GUEST_NICKNAME_MIN_LENGTH || nickname.length > GUEST_NICKNAME_MAX_LENGTH) {
        return false
    }

    return /^[\p{L}\p{N}_ .-]+$/u.test(nickname)
}

const getGuestUserFromHandshake = (socket) => {
    const guestId = socket.handshake.auth?.guestId
    const nickname = normalizeNickname(socket.handshake.auth?.nickname)

    if (!isValidGuestId(guestId) || !isValidNickname(nickname)) {
        return null
    }

    return {
        id: `guest:${guestId.trim()}`,
        email: null,
        role: 'guest',
        username: nickname,
    }
}

export const socketAuthMiddleware = async (socket, next) => {
    const token = getTokenFromHandshake(socket)

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const user = await getSocketUserRepo(decoded.userId || decoded.id)

            if (!user) {
                next(new Error('User not found'))
                return
            }

            socket.data.user = {
                id: user.id,
                email: user.email,
                role: user.role,
                username: user.username || undefined,
                avatarUrl: user.avatar_url || null,
                rankStats: {
                    rankPoints: Number(user.rank_points) || 0,
                    mmr: Number(user.mmr) || 1000,
                    wins: Number(user.wins) || 0,
                    losses: Number(user.losses) || 0,
                    draws: Number(user.draws) || 0,
                    totalMatches: Number(user.total_matches) || 0,
                },
            }

            next()
            return
        } catch {
            // Invalid auth cookie does not grant privileges.
            // We allow falling back to a guest session if guest handshake data is valid.
        }
    }

    const guestUser = getGuestUserFromHandshake(socket)

    if (!guestUser) {
        next(new Error('Authentication required'))
        return
    }

    socket.data.user = guestUser
    next()
}
