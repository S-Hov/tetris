export const registerGameHandlers = (io, socket) => {
    socket.on('game:update', ({ roomId, payload }) => {
        socket.to(roomId).emit('opponent:update', {
            socketId: socket.id,
            payload,
        })
    })

    socket.on('game:over', ({ roomId, payload }) => {
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