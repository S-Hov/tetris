import { registerLobbyHandlers } from './lobby.socket.js'
import { registerGameHandlers } from './game.handlers.js'
import { roomStore } from './roomStore.js'
import { socketAuthMiddleware } from './socketAuth.js'

export const registerSocketHandlers = (io) => {
    io.use(socketAuthMiddleware)

    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id, socket.data.user?.id)

        registerLobbyHandlers(io, socket)
        registerGameHandlers(io, socket)

        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id)

            const result = roomStore.removePlayerBySocketId(socket.id)

            if (!result || !result.removedPlayer) {
                return
            }

            if (result.room) {
                io.to(result.roomId).emit('room:state', result.room)
            }

            io.to(result.roomId).emit('room:player-left', {
                roomId: result.roomId,
                userId: result.removedPlayer.userId,
                username: result.removedPlayer.username,
            })
        })
    })
}
