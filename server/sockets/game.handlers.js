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

        socket.to(roomId).emit('opponent:update', {
            socketId: socket.id,
            payload: {
                ...payload,
                isGameOver: true,
            },
        })

        io.to(roomId).emit('match:end', {
            loserSocketId: socket.id,
        })
    })
}
