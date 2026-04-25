const rooms = new Map()

export const isSocketRoomParticipant = (room, socketOrSocketId) => {
    if (!room || !socketOrSocketId) {
        return false
    }

    const socketId = typeof socketOrSocketId === 'string'
        ? socketOrSocketId
        : socketOrSocketId.id

    return room.players.some((player) => player.socketId === socketId)
}

export const getRoomPlayerByUserId = (room, userId) => {
    if (!room || !userId) {
        return null
    }

    return room.players.find((player) => player.userId === userId) || null
}

export const getRoomPlayerBySocketId = (room, socketId) => {
    if (!room || !socketId) {
        return null
    }

    return room.players.find((player) => player.socketId === socketId) || null
}

export const roomStore = {
    createRoom(room) {
        rooms.set(room.id, room)
        return room
    },

    getRoom(roomId) {
        return rooms.get(roomId) || null
    },

    updateRoom(roomId, updater) {
        const room = rooms.get(roomId)
        if (!room) return null

        const updatedRoom = updater(room)
        rooms.set(roomId, updatedRoom)
        return updatedRoom
    },

    deleteRoom(roomId) {
        rooms.delete(roomId)
    },

    getAllRooms() {
        return Array.from(rooms.values())
    },

    findRoomBySocketId(socketId) {
        return this.getAllRooms().find((room) => (
            room.players.some((player) => player.socketId === socketId)
        )) || null
    },

    removePlayerBySocketId(socketId) {
        const room = this.findRoomBySocketId(socketId)

        if (!room) {
            return null
        }

        const removedPlayer = room.players.find((player) => player.socketId === socketId) || null
        const players = room.players.filter((player) => player.socketId !== socketId)

        if (players.length === 0) {
            rooms.delete(room.id)

            return {
                roomId: room.id,
                room: null,
                previousRoom: room,
                removedPlayer,
            }
        }

        const updatedRoom = {
            ...room,
            status: players.length === 2 ? room.status : 'waiting',
            players,
        }

        rooms.set(room.id, updatedRoom)

        return {
            roomId: room.id,
            room: updatedRoom,
            previousRoom: room,
            removedPlayer,
        }
    },

    updatePlayer(roomId, socketId, updater) {
        const room = rooms.get(roomId)
        if (!room) return null

        const updatedRoom = {
            ...room,
            players: room.players.map((player) => (
                player.socketId === socketId ? updater(player) : player
            )),
        }

        rooms.set(roomId, updatedRoom)
        return updatedRoom
    },
}
