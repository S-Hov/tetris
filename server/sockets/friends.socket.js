import {
    getAcceptedFriendIdsService,
    getFriendsStateService,
} from '../services/friendsService.js'
import {
    emitFriendsStateToUser,
    emitPresenceToUsers,
} from '../services/friendsRealtimeService.js'

const getUserRoom = (userId) => `user:${userId}`
const activeUserSockets = new Map()
const getAuthenticatedUserId = (socket) => {
    const userId = socket.data.user?.id

    return Number.isInteger(userId) ? userId : null
}

export const emitPresenceToFriends = async (userId, isOnline) => {
    if (!Number.isInteger(userId)) {
        return
    }

    const friendIds = await getAcceptedFriendIdsService(userId)

    if (!friendIds.length) {
        return
    }

    const payload = { userId, isOnline }

    emitPresenceToUsers(friendIds, payload)
}

export const emitPresenceAfterDisconnect = async (userId, socketId) => {
    if (!Number.isInteger(userId)) {
        return
    }

    const userSockets = activeUserSockets.get(userId)

    if (userSockets) {
        userSockets.delete(socketId)

        if (!userSockets.size) {
            activeUserSockets.delete(userId)
        }
    }

    if (!activeUserSockets.has(userId)) {
        await emitPresenceToFriends(userId, false)
    }
}

export const registerFriendsHandlers = (io, socket) => {
    const userId = getAuthenticatedUserId(socket)

    if (!userId) {
        return
    }

    socket.join(getUserRoom(userId))
    const userSockets = activeUserSockets.get(userId) || new Set()
    userSockets.add(socket.id)
    activeUserSockets.set(userId, userSockets)

    socket.on('friends:state:get', async (_payload = {}, callback) => {
        try {
            const state = await emitFriendsStateToUser(userId) || await getFriendsStateService(userId)

            callback?.({ success: true, state })
        } catch (error) {
            console.error('friends:state:get error', error)
            callback?.({ success: false, message: error.message || 'Could not load friends state' })
        }
    })
}
