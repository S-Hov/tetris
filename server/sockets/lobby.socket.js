import crypto from 'crypto'
import { getRoomPlayerByUserId, isSocketRoomParticipant, roomStore } from './roomStore.js'

const createRoomPlayer = (socket) => {
    const user = socket.data.user

    return {
        socketId: socket.id,
        userId: user.id,
        username: user.username || user.email || 'Guest',
        isReady: false,
    }
}

const leavePreviousRoomIfNeeded = (io, socket, nextRoomId = null) => {
    const existingRoom = roomStore.findRoomBySocketId(socket.id)

    if (!existingRoom || existingRoom.id === nextRoomId) {
        return
    }

    const result = roomStore.removePlayerBySocketId(socket.id)

    socket.leave(existingRoom.id)

    if (!result) {
        return
    }

    if (result.room) {
        io.to(result.roomId).emit('room:state', result.room)
    }

    if (result.removedPlayer) {
        io.to(result.roomId).emit('room:player-left', {
            roomId: result.roomId,
            userId: result.removedPlayer.userId,
            username: result.removedPlayer.username,
        })
    }
}

export const registerLobbyHandlers = (io, socket) => {
    socket.on('room:create', (_, callback) => {
        leavePreviousRoomIfNeeded(io, socket)

        const player = createRoomPlayer(socket)
        const roomId = crypto.randomUUID()

        const room = {
            id: roomId,
            status: 'waiting',
            players: [player],
        }

        roomStore.createRoom(room)
        socket.join(roomId)

        callback?.({
            success: true,
            message: 'Комната создана',
            room,
        })

        io.to(roomId).emit('room:state', room)
    })

    socket.on('room:join', ({ roomId } = {}, callback) => {
        if (!roomId) {
            callback?.({
                success: false,
                message: 'Room ID is required',
            })
            return
        }

        leavePreviousRoomIfNeeded(io, socket, roomId)

        const user = socket.data.user
        const room = roomStore.getRoom(roomId)

        if (!room) {
            callback?.({
                success: false,
                message: 'Room not found',
            })
            return
        }

        if (isSocketRoomParticipant(room, socket)) {
            callback?.({
                success: true,
                room,
            })
            return
        }

        const existingPlayer = getRoomPlayerByUserId(room, user.id)

        if (existingPlayer) {
            const rejoinedRoom = {
                ...room,
                players: room.players.map((player) => (
                    player.userId === user.id
                        ? {
                            ...player,
                            socketId: socket.id,
                            username: user.username || user.email || player.username,
                        }
                        : player
                )),
            }

            roomStore.createRoom(rejoinedRoom)
            socket.join(roomId)

            callback?.({
                success: true,
                message: 'Вы переподключились к комнате',
                room: rejoinedRoom,
            })

            io.to(roomId).emit('room:state', rejoinedRoom)
            return
        }

        if (room.players.length >= 2) {
            callback?.({
                success: false,
                message: 'Room is full',
            })
            return
        }

        const player = createRoomPlayer(socket)
        const updatedRoom = {
            ...room,
            players: [
                ...room.players,
                player,
            ],
        }

        roomStore.createRoom(updatedRoom)
        socket.join(roomId)

        callback?.({
            success: true,
            message: 'Вы подключились к комнате',
            room: updatedRoom,
        })

        io.to(roomId).emit('room:state', updatedRoom)
        io.to(roomId).emit('room:player-joined', {
            roomId,
            userId: player.userId,
            username: player.username,
        })
    })

    socket.on('player:ready', ({ roomId }, callback) => {
        const room = roomStore.getRoom(roomId)

        if (!room) {
            callback?.({ success: false, message: 'Room not found' })
            return
        }

        if (!isSocketRoomParticipant(room, socket)) {
            callback?.({ success: false, message: 'Player is not in this room' })
            return
        }

        const updatedRoom = {
            ...room,
            players: room.players.map((player) => {
                if (player.socketId === socket.id) {
                    return {
                        ...player,
                        isReady: !player.isReady,
                    }
                }
                return player
            }),
        }

        roomStore.createRoom(updatedRoom)

        const currentPlayer = updatedRoom.players.find((player) => player.socketId === socket.id)

        const allReady =
            updatedRoom.players.length === 2 &&
            updatedRoom.players.every((p) => p.isReady)

        if (allReady) {
            updatedRoom.status = 'playing'
            roomStore.createRoom(updatedRoom)

            io.to(roomId).emit('room:state', updatedRoom)
            io.to(roomId).emit('match:start', {
                roomId,
            })

            return
        }

        io.to(roomId).emit('room:state', updatedRoom)

        callback?.({
            success: true,
            message: currentPlayer?.isReady ? 'Вы готовы к матчу' : 'Готовность снята',
            isReady: currentPlayer?.isReady ?? false,
        })
    })
}
