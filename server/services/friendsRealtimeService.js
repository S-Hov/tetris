import { getFriendsStateService } from './friendsService.js'

let friendsRealtimeIo = null

const getUserRoom = (userId) => `user:${userId}`

export const setFriendsRealtimeIo = (io) => {
    friendsRealtimeIo = io
}

export const emitFriendsStateToUser = async (userId) => {
    if (!friendsRealtimeIo || !Number.isInteger(userId)) {
        return null
    }

    const state = await getFriendsStateService(userId)

    friendsRealtimeIo.to(getUserRoom(userId)).emit('friends:state', state)

    return state
}

export const emitFriendsStateToUsers = async (userIds = []) => {
    const uniqueUserIds = [...new Set(userIds.filter(Number.isInteger))]

    await Promise.all(uniqueUserIds.map((userId) => emitFriendsStateToUser(userId)))
}

export const emitPresenceToUsers = (userIds = [], payload) => {
    if (!friendsRealtimeIo || !payload) {
        return
    }

    const uniqueUserIds = [...new Set(userIds.filter(Number.isInteger))]

    uniqueUserIds.forEach((userId) => {
        friendsRealtimeIo.to(getUserRoom(userId)).emit('presence:update', payload)
    })
}
