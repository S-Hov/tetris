const rooms = new Map()

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
}