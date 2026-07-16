const activeSocketIdentities = new Map()

const getSocketIdentity = (socket) => {
    const userId = socket?.data?.user?.id

    if (userId) {
        return `user:${userId}`
    }

    const browserId = socket?.data?.browserId

    if (browserId) {
        return `browser:${browserId}`
    }

    const guestId = socket?.data?.guest?.id || socket?.handshake?.auth?.guestId

    if (guestId) {
        return `guest:${guestId}`
    }

    return socket?.id ? `socket:${socket.id}` : null
}

export const trackActiveSocket = (socket) => {
    const identity = getSocketIdentity(socket)

    if (socket?.id && identity) {
        activeSocketIdentities.set(socket.id, identity)
    }
}

export const untrackActiveSocket = (socketId) => {
    activeSocketIdentities.delete(socketId)
}

export const getActiveUsersCount = () => (
    new Set(activeSocketIdentities.values()).size
)

export const resetActiveSockets = () => {
    activeSocketIdentities.clear()
}
