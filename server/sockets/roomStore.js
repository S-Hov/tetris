import {
    createGameRoomRepo,
    deleteGameRoomRepo,
    findGameRoomIdBySocketIdRepo,
    getGameRoomIdsRepo,
    getGameRoomRepo,
    updateGameRoomRepo,
} from '../repositories/roomRepository.js'

export const TEAM_IDS = ['team_1', 'team_2']
const roomCache = new Map()

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

const rememberRoom = (room) => {
    if (!room?.id) {
        return room
    }

    const normalizedRoom = normalizeRoom(room)
    roomCache.set(normalizedRoom.id, normalizedRoom)

    return normalizedRoom
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
    async createRoom(room) {
        return rememberRoom(await createGameRoomRepo(normalizeRoom(room)))
    },

    async getRoom(roomId) {
        if (roomCache.has(roomId)) {
            return roomCache.get(roomId)
        }

        return rememberRoom(await getGameRoomRepo(roomId))
    },

    getCachedRoom(roomId) {
        return roomCache.get(roomId) || null
    },

    async updateRoom(roomId, updater) {
        return rememberRoom(await updateGameRoomRepo(roomId, (room) => {
            const updatedRoom = updater(normalizeRoom(room))

            return updatedRoom ? normalizeRoom(updatedRoom) : null
        }))
    },

    async deleteRoom(roomId) {
        roomCache.delete(roomId)
        await deleteGameRoomRepo(roomId)
    },

    async getAllRooms() {
        const roomIds = await getGameRoomIdsRepo()
        const rooms = []

        for (const roomId of roomIds) {
            const room = await this.getRoom(roomId)

            if (room) {
                rooms.push(room)
            }
        }

        return rooms
    },

    updateCachedRoom(roomId, updater) {
        const room = roomCache.get(roomId)

        if (!room) {
            return null
        }

        const updatedRoom = updater(room)

        if (!updatedRoom) {
            return null
        }

        return rememberRoom(updatedRoom)
    },

    async findRoomBySocketId(socketId) {
        const cachedRoom = [...roomCache.values()].find((room) => isSocketRoomParticipant(room, socketId))

        if (cachedRoom) {
            return cachedRoom
        }

        const roomId = await findGameRoomIdBySocketIdRepo(socketId)

        return roomId ? await this.getRoom(roomId) : null
    },

    async removePlayerBySocketId(socketId) {
        const room = await this.findRoomBySocketId(socketId)

        if (!room) {
            return null
        }

        const removedPlayer = getRoomPlayers(room).find((player) => player.socketId === socketId) || null
        const players = getRoomPlayers(room).filter((player) => player.socketId !== socketId)

        if (players.length === 0) {
            await this.deleteRoom(room.id)

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
        const normalizedRoom = await this.createRoom(updatedRoom)

        return {
            roomId: room.id,
            room: normalizedRoom,
            previousRoom: room,
            removedPlayer,
        }
    },

    async updatePlayer(roomId, socketId, updater) {
        return await this.updateRoom(roomId, (room) => ({
            ...room,
            players: getRoomPlayers(room).map((player) => (
                player.socketId === socketId ? updater(player) : player
            )),
        }))
    },

    updateCachedPlayer(roomId, socketId, updater) {
        return this.updateCachedRoom(roomId, (room) => ({
            ...room,
            players: getRoomPlayers(room).map((player) => (
                player.socketId === socketId ? updater(player) : player
            )),
        }))
    },
}
