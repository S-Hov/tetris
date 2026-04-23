import { isSocketRoomParticipant, roomStore } from './roomStore.js'

const ABILITY_EFFECTS = {
    speed_x2_for_4s: {
        type: 'speed_x2_for_4s',
        durationMs: 4000,
    },
}

export const registerGameHandlers = (io, socket) => {
    socket.on('game:update', ({ roomId, payload }) => {
        const room = roomStore.getRoom(roomId)

        if (!isSocketRoomParticipant(room, socket)) {
            return
        }

        socket.to(roomId).emit('opponent:update', {
            socketId: socket.id,
            payload,
        })
    })

    socket.on('game:over', ({ roomId, payload }) => {
        const room = roomStore.getRoom(roomId)

        if (!isSocketRoomParticipant(room, socket)) {
            return
        }

        const updatedRoom = roomStore.updateRoom(roomId, (currentRoom) => {
            if (!currentRoom) {
                return currentRoom
            }

            return {
                ...currentRoom,
                status: 'waiting',
                players: currentRoom.players.map((player) => ({
                    ...player,
                    isReady: false,
                })),
            }
        })

        const winner = room.players.find((player) => player.socketId !== socket.id) || null

        socket.to(roomId).emit('opponent:update', {
            socketId: socket.id,
            payload: {
                ...payload,
                isGameOver: true,
            },
        })

        if (updatedRoom) {
            io.to(roomId).emit('room:state', updatedRoom)
        }

        io.to(roomId).emit('match:end', {
            roomId,
            loserSocketId: socket.id,
            winnerSocketId: winner?.socketId || null,
        })
    })

    socket.on('ability:use', ({ roomId, abilityId }, callback) => {
        const room = roomStore.getRoom(roomId)

        if (!room) {
            callback?.({ success: false, message: 'Room not found' })
            return
        }

        if (room.status !== 'playing') {
            callback?.({ success: false, message: 'Match is not playing' })
            return
        }

        const sourcePlayer = room.players.find((player) => player.socketId === socket.id)

        if (!sourcePlayer) {
            callback?.({ success: false, message: 'You are not in this room' })
            return
        }

        const targetPlayer = room.players.find((player) => player.socketId !== socket.id)

        if (!targetPlayer) {
            callback?.({ success: false, message: 'Opponent not found' })
            return
        }

        const effect = ABILITY_EFFECTS[abilityId]

        if (!effect) {
            callback?.({ success: false, message: 'Unknown ability' })
            return
        }

        io.to(targetPlayer.socketId).emit('effect:apply', {
            effect: {
                ...effect,
                sourceSocketId: socket.id,
            },
        })

        callback?.({ success: true, effectType: effect.type })
    })
}
