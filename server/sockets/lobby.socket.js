import crypto from 'crypto'
import { roomStore } from './roomStore.js'

export const registerLobbyHandlers = (io, socket) => {
    socket.on('room:create', ({ username }, callback) => {
        const roomId = crypto.randomUUID()

        const room = {
            id: roomId,
            status: 'waiting',
            players: [
                {
                    socketId: socket.id,
                    username,
                    isReady: false,
                },
            ],
        }

        roomStore.createRoom(room)
        socket.join(roomId)

        callback?.({
            success: true,
            room,
        })

        io.to(roomId).emit('room:state', room)
    })

    socket.on('room:join', ({ roomId, username }, callback) => {
        const room = roomStore.getRoom(roomId)

        if (!room) {
            callback?.({
                success: false,
                message: 'Room not found',
            })
            return
        }

        if (room.players.length >= 2) {
            callback?.({
                success: false,
                message: 'Room is full',
            })
            return
        }

        const updatedRoom = {
            ...room,
            players: [
                ...room.players,
                {
                    socketId: socket.id,
                    username,
                    isReady: false,
                },
            ],
        }

        roomStore.createRoom(updatedRoom)
        socket.join(roomId)

        callback?.({
            success: true,
            room: updatedRoom,
        })

        io.to(roomId).emit('room:state', updatedRoom)
    })

    socket.on('player:ready', ({ roomId }, callback) => {
        const room = roomStore.getRoom(roomId)

        if (!room) {
            callback?.({ success: false, message: 'Room not found' })
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

        callback?.({ success: true })
    })
}