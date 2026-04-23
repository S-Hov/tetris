import { isSocketRoomParticipant, roomStore } from './roomStore.js'

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
}
