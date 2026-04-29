const rooms = new Map()

export const TEAM_IDS = ['team_1', 'team_2']

export const getMaxPlayersForMode = (modeKey = '1v1') => (modeKey === '2v2' ? 4 : 2)

export const getTeamSizeForMode = (modeKey = '1v1') => (modeKey === '2v2' ? 2 : 1)

export const getTeamNumberById = (teamId) => {
    const index = TEAM_IDS.indexOf(teamId)

    return index === -1 ? 1 : index + 1
}

export const getTeamIdByNumber = (teamNumber = 1) => TEAM_IDS[teamNumber - 1] || TEAM_IDS[0]

export const getRoomPlayers = (room) => {
    if (!room) {
        return []
    }

    if (Array.isArray(room.players)) {
        return room.players
    }

    return (room.teams || []).flatMap((team) => team.players || [])
}

export const calculateTeamScore = (players = []) => {
    return players.reduce((sum, player) => (
        sum + (Number(player?.gameState?.score) || 0)
    ), 0)
}

export const buildRoomTeams = (players = [], existingTeams = []) => {
    return TEAM_IDS.map((teamId, index) => {
        const previousTeam = existingTeams.find((team) => team.id === teamId) || {}
        const teamPlayers = players.filter((player) => (
            player.teamNumber === index + 1 || player.teamSlot === teamId
        ))

        return {
            ...previousTeam,
            id: teamId,
            players: teamPlayers.map((player) => ({
                ...player,
                teamSlot: teamId,
                teamNumber: index + 1,
            })),
            score: calculateTeamScore(teamPlayers),
        }
    })
}

export const normalizeRoom = (room) => {
    if (!room) {
        return room
    }

    const players = getRoomPlayers(room).map((player, index) => {
        const fallbackTeamNumber = index % 2 === 0 ? 1 : 2
        const teamSlotNumber = TEAM_IDS.includes(player.teamSlot) ? getTeamNumberById(player.teamSlot) : null
        const teamNumber = player.teamNumber || teamSlotNumber || fallbackTeamNumber
        const teamSlot = getTeamIdByNumber(teamNumber)

        return {
            ...player,
            teamNumber,
            teamSlot,
        }
    })

    return {
        ...room,
        players,
        teams: buildRoomTeams(players, room.teams),
    }
}

export const isSocketRoomParticipant = (room, socketOrSocketId) => {
    if (!room || !socketOrSocketId) {
        return false
    }

    const socketId = typeof socketOrSocketId === 'string'
        ? socketOrSocketId
        : socketOrSocketId.id

    return getRoomPlayers(room).some((player) => player.socketId === socketId)
}

export const getRoomPlayerByUserId = (room, userId) => {
    if (!room || !userId) {
        return null
    }

    return getRoomPlayers(room).find((player) => player.userId === userId) || null
}

export const getRoomPlayerBySocketId = (room, socketId) => {
    if (!room || !socketId) {
        return null
    }

    return getRoomPlayers(room).find((player) => player.socketId === socketId) || null
}

export const roomStore = {
    createRoom(room) {
        const normalizedRoom = normalizeRoom(room)
        rooms.set(room.id, normalizedRoom)
        return normalizedRoom
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
            getRoomPlayers(room).some((player) => player.socketId === socketId)
        )) || null
    },

    removePlayerBySocketId(socketId) {
        const room = this.findRoomBySocketId(socketId)

        if (!room) {
            return null
        }

        const removedPlayer = getRoomPlayers(room).find((player) => player.socketId === socketId) || null
        const players = getRoomPlayers(room).filter((player) => player.socketId !== socketId)

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
            status: players.length === getMaxPlayersForMode(room.modeKey) ? room.status : 'waiting',
            players,
        }

        const normalizedRoom = normalizeRoom(updatedRoom)
        rooms.set(room.id, normalizedRoom)

        return {
            roomId: room.id,
            room: normalizedRoom,
            previousRoom: room,
            removedPlayer,
        }
    },

    updatePlayer(roomId, socketId, updater) {
        const room = rooms.get(roomId)
        if (!room) return null

        const updatedRoom = {
            ...room,
            players: getRoomPlayers(room).map((player) => (
                player.socketId === socketId ? updater(player) : player
            )),
        }

        const normalizedRoom = normalizeRoom(updatedRoom)
        rooms.set(roomId, normalizedRoom)
        return normalizedRoom
    },
}
