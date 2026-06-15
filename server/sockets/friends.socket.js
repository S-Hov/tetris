import {
    getAcceptedFriendIdsService,
    getFriendsStateService,
} from '../services/friendsService.js'
import {
    emitFriendsStateToUser,
    emitPresenceToUsers,
} from '../services/friendsRealtimeService.js'
import { getRoomPlayers, roomStore } from './roomStore.js'

const getUserRoom = (userId) => `user:${userId}`
const activeUserSockets = new Map()
const roomInviteRequests = new Map()

const getAuthenticatedUserId = (socket) => {
    const userId = socket.data.user?.id

    return Number.isInteger(userId) ? userId : null
}

const getUserDisplayName = (user = {}) => user.username || user.email || 'Player'

const isAcceptedFriend = async (userId, friendId) => {
    const friendIds = await getAcceptedFriendIdsService(userId)

    return friendIds.some((id) => Number(id) === Number(friendId))
}

const findActivePlayingRoomByUserId = async (userId) => {
    const rooms = await roomStore.getAllRooms()

    return rooms.find((room) => (
        room?.status === 'playing' &&
        getRoomPlayers(room).some((player) => Number(player.userId) === Number(userId))
    )) || null
}

const buildRoomInvite = ({ socket, friendId, room }) => {
    const inviteId = `${room.id}:${socket.data.user.id}:${friendId}:${Date.now()}`

    return {
        id: inviteId,
        roomId: room.id,
        modeKey: room.modeKey || '1v1',
        inviter: {
            id: socket.data.user.id,
            username: getUserDisplayName(socket.data.user),
            avatarUrl: socket.data.user.avatarUrl || null,
        },
        createdAt: new Date().toISOString(),
    }
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

    socket.on('friends:room-invite:send', async ({ friendId, roomId } = {}, callback) => {
        try {
            const normalizedFriendId = Number(friendId)

            if (!Number.isInteger(normalizedFriendId) || !roomId) {
                callback?.({ success: false, message: 'Invalid invite payload' })
                return
            }

            if (!(await isAcceptedFriend(userId, normalizedFriendId))) {
                callback?.({ success: false, message: 'Only accepted friends can be invited' })
                return
            }

            if (!activeUserSockets.has(normalizedFriendId)) {
                callback?.({ success: false, message: 'Friend is offline' })
                return
            }

            const room = await roomStore.getRoom(roomId)

            if (!room) {
                callback?.({ success: false, message: 'Room not found' })
                return
            }

            if (room.status === 'playing' || room.status === 'closed') {
                callback?.({ success: false, message: 'This room is not accepting invites' })
                return
            }

            const senderInRoom = getRoomPlayers(room).some((player) => (
                Number(player.userId) === userId || player.socketId === socket.id
            ))

            if (!senderInRoom) {
                callback?.({ success: false, message: 'You need to be in the room to invite friends' })
                return
            }

            const friendPlayingRoom = await findActivePlayingRoomByUserId(normalizedFriendId)

            if (friendPlayingRoom) {
                callback?.({ success: false, message: 'Friend is already in game' })
                return
            }

            const invite = buildRoomInvite({
                socket,
                friendId: normalizedFriendId,
                room,
            })

            roomInviteRequests.set(invite.id, {
                ...invite,
                senderId: userId,
                receiverId: normalizedFriendId,
            })
            setTimeout(() => {
                roomInviteRequests.delete(invite.id)
            }, 60_000).unref?.()

            io.to(getUserRoom(normalizedFriendId)).emit('friends:room-invite', invite)
            callback?.({ success: true, invite })
        } catch (error) {
            console.error('friends:room-invite:send error', error)
            callback?.({ success: false, message: error.message || 'Could not send room invite' })
        }
    })

    socket.on('friends:room-invite:respond', async ({ inviteId, accepted } = {}, callback) => {
        const invite = roomInviteRequests.get(inviteId)

        if (!invite || invite.receiverId !== userId) {
            callback?.({ success: false, message: 'Invite not found' })
            return
        }

        roomInviteRequests.delete(inviteId)

        io.to(getUserRoom(invite.senderId)).emit('friends:room-invite:response', {
            inviteId,
            roomId: invite.roomId,
            accepted: Boolean(accepted),
            user: {
                id: socket.data.user.id,
                username: getUserDisplayName(socket.data.user),
            },
        })

        callback?.({ success: true })
    })
}
