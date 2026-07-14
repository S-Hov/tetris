import { Server } from 'socket.io'

import { registerLegacySocketModules } from './registerModules.js'

export const createSocketServer = ({
    httpServer,
    allowedOrigins,
}) => {
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    })

    registerLegacySocketModules(io)

    return io
}
