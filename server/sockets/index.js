import { registerLobbyHandlers } from './lobby.socket.js'
import { registerGameHandlers } from './game.handlers.js'

export const registerSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id)

        registerLobbyHandlers(io, socket)
        registerGameHandlers(io, socket)

        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id)
        })
    })
}
