import crypto from 'crypto'
import {
    buildRoomTeams,
    getMaxPlayersForMode,
    getRoomPlayerByUserId,
    getRoomPlayers,
    getTeamIdByNumber,
    getTeamNumberById,
    getTeamSizeForMode,
    isSocketRoomParticipant,
    roomStore,
} from './roomStore.js'
import {
    abandonRoomMatchService,
    attachPlayerToRoomMatchService,
    cancelRoomMatchService,
    createRoomMatchService,
    markRoomPlayerLeftService,
    startRoomMatchService,
} from '../services/matchService.js'

const createRoomPlayer = (socket) => {
    const user = socket.data.user

    return {
        socketId: socket.id,
        userId: user.id,
        isRegistered: user.role !== 'guest',
        username: user.username || user.email || 'Guest',
        avatarUrl: user.avatarUrl || null,
        rankStats: user.rankStats || null,
        isReady: false,
        gameState: null,
        teamId: null,
        teamNumber: null,
        matchPlayerId: null,
    }
}

const normalizeRoomSettings = (settings = {}) => ({
    abilitiesEnabled: settings.abilitiesEnabled ?? true,
    specialBlocksEnabled: settings.specialBlocksEnabled ?? false,
    matchType: normalizeMatchType(settings.matchType),
})

const normalizeMatchType = (value) => {
    if (value === 'ranked' || value === 'casual' || value === 'private') {
        return value
    }

    return 'private'
}

const getPlayerCountByTeam = (room, teamNumber) => {
    return getRoomPlayers(room).filter((player) => player.teamNumber === teamNumber).length
}

const getAvailableTeamNumber = (room, preferredTeamNumber = null) => {
    const teamSize = getTeamSizeForMode(room.modeKey)
    const candidates = preferredTeamNumber ? [preferredTeamNumber, 1, 2] : [1, 2]

    return candidates.find((teamNumber) => getPlayerCountByTeam(room, teamNumber) < teamSize) || null
}

const canStartRoom = (room) => {
    const players = getRoomPlayers(room)
    const maxPlayers = getMaxPlayersForMode(room.modeKey)
    const teamSize = getTeamSizeForMode(room.modeKey)

    return players.length === maxPlayers &&
        room.teams.every((team) => (team.players || []).length === teamSize) &&
        players.every((player) => player.isReady)
}

const getWinnerAfterPlayerLeft = (room, removedPlayer) => {
    const players = getRoomPlayers(room)

    return players.find((player) => player.teamNumber !== removedPlayer?.teamNumber) ||
        players[0] ||
        null
}

const syncRemovedPlayerWithPersistence = async (io, result) => {
    if (!result?.removedPlayer) {
        return
    }

    await markRoomPlayerLeftService({
        roomId: result.roomId,
        player: result.removedPlayer,
    })

    if (result.previousRoom?.status === 'playing' && result.room) {
        const winner = getWinnerAfterPlayerLeft(result.room, result.removedPlayer)

        await abandonRoomMatchService({
            roomId: result.roomId,
            winnerPlayer: winner,
            loserPlayer: result.removedPlayer,
        })

        io.to(result.roomId).emit('match:end', {
            roomId: result.roomId,
            loserSocketId: result.removedPlayer.socketId,
            winnerSocketId: winner?.socketId || null,
            reason: 'room_switch',
            matchType: result.previousRoom?.settings?.matchType || 'private',
        })

        if (result.previousRoom?.settings?.matchType && result.previousRoom.settings.matchType !== 'private') {
            roomStore.deleteRoom(result.roomId)
        }

        return
    }

    if (!result.room) {
        await cancelRoomMatchService({
            roomId: result.roomId,
        })
    }
}

const leavePreviousRoomIfNeeded = async (io, socket, nextRoomId = null) => {
    const existingRoom = roomStore.findRoomBySocketId(socket.id)

    if (!existingRoom || existingRoom.id === nextRoomId) {
        return
    }

    const result = roomStore.removePlayerBySocketId(socket.id)

    socket.leave(existingRoom.id)

    if (!result) {
        return
    }

    await syncRemovedPlayerWithPersistence(io, result)

    if (result.room) {
        io.to(result.roomId).emit('room:state', result.room)
    }

    if (result.removedPlayer) {
        io.to(result.roomId).emit('room:player-left', {
            roomId: result.roomId,
            userId: result.removedPlayer.userId,
            username: result.removedPlayer.username,
        })
    }
}

export const registerLobbyHandlers = (io, socket) => {
    socket.on('room:create', async (payload = {}, callback) => {
        try {
            await leavePreviousRoomIfNeeded(io, socket)

            const player = createRoomPlayer(socket)
            const roomSettings = normalizeRoomSettings(payload.settings)

            if (roomSettings.matchType === 'ranked' && !player.isRegistered) {
                callback?.({
                    success: false,
                    message: 'Рейтинговый матч доступен только авторизованным игрокам',
                })
                return
            }

            const roomId = crypto.randomUUID()
            const matchBinding = await createRoomMatchService({
                roomId,
                player,
                matchMode: payload.modeKey || '1v1',
                matchType: roomSettings.matchType,
                countsForRating: roomSettings.matchType === 'ranked',
            })

            const room = {
                id: roomId,
                status: 'waiting',
                matchId: matchBinding.matchId,
                modeKey: payload.modeKey || '1v1',
                ownerSocketId: socket.id,
                ownerUserId: player.userId,
                settings: roomSettings,
                players: [
                    {
                        ...player,
                        teamId: matchBinding.teamId,
                        teamNumber: matchBinding.teamNumber,
                        teamSlot: getTeamIdByNumber(matchBinding.teamNumber),
                        matchPlayerId: matchBinding.matchPlayerId,
                    },
                ],
            }

            roomStore.createRoom(room)
            socket.join(roomId)

            callback?.({
                success: true,
                message: 'Комната создана',
                room,
            })

            io.to(roomId).emit('room:state', room)
        } catch (error) {
            console.error('room:create error', error)
            callback?.({
                success: false,
                message: 'Не удалось создать комнату',
            })
        }
    })

    socket.on('room:join', async ({ roomId } = {}, callback) => {
        try {
            if (!roomId) {
                callback?.({
                    success: false,
                    message: 'Room ID is required',
                })
                return
            }

            await leavePreviousRoomIfNeeded(io, socket, roomId)

            const user = socket.data.user
            const room = roomStore.getRoom(roomId)

            if (!room) {
                callback?.({
                    success: false,
                    message: 'Room not found',
                })
                return
            }

            if (isSocketRoomParticipant(room, socket)) {
                callback?.({
                    success: true,
                    room,
                })
                return
            }

            const existingPlayer = getRoomPlayerByUserId(room, user.id)

            if (existingPlayer) {
                const rejoinedRoom = {
                    ...room,
                    players: getRoomPlayers(room).map((player) => (
                        player.userId === user.id
                            ? {
                                ...player,
                                socketId: socket.id,
                                username: user.username || user.email || player.username,
                                isRegistered: user.role !== 'guest',
                            }
                            : player
                    )),
                }

                roomStore.createRoom(rejoinedRoom)
                socket.join(roomId)

                callback?.({
                    success: true,
                    message: 'Вы переподключились к комнате',
                    room: rejoinedRoom,
                })

                io.to(roomId).emit('room:state', rejoinedRoom)
                return
            }

            if (getRoomPlayers(room).length >= getMaxPlayersForMode(room.modeKey)) {
                callback?.({
                    success: false,
                    message: 'Room is full',
                })
                return
            }

            const player = createRoomPlayer(socket)

            if (room.settings?.matchType === 'ranked' && !player.isRegistered) {
                callback?.({
                    success: false,
                    message: 'Рейтинговый матч доступен только авторизованным игрокам',
                })
                return
            }

            const preferredTeamNumber = getAvailableTeamNumber(room)

            if (!preferredTeamNumber) {
                callback?.({
                    success: false,
                    message: 'Room is full',
                })
                return
            }

            const matchBinding = await attachPlayerToRoomMatchService({
                roomId,
                player,
                teamNumber: preferredTeamNumber,
            })
            const boundPlayer = {
                ...player,
                teamId: matchBinding.teamId,
                teamNumber: matchBinding.teamNumber,
                teamSlot: getTeamIdByNumber(matchBinding.teamNumber),
                matchPlayerId: matchBinding.matchPlayerId,
            }
            const updatedRoom = {
                ...room,
                players: [
                    ...getRoomPlayers(room),
                    boundPlayer,
                ],
            }

            roomStore.createRoom(updatedRoom)
            socket.join(roomId)

            callback?.({
                success: true,
                message: 'Вы подключились к комнате',
                room: updatedRoom,
            })

            io.to(roomId).emit('room:state', updatedRoom)
            io.to(roomId).emit('room:player-joined', {
                roomId,
                userId: boundPlayer.userId,
                username: boundPlayer.username,
            })
        } catch (error) {
            console.error('room:join error', error)
            callback?.({
                success: false,
                message: 'Не удалось подключиться к комнате',
            })
        }
    })

    socket.on('room:leave', async ({ roomId } = {}, callback) => {
        try {
            const room = roomStore.getRoom(roomId)

            if (!room) {
                callback?.({ success: false, message: 'Room not found' })
                return
            }

            if (!isSocketRoomParticipant(room, socket)) {
                callback?.({ success: false, message: 'Player is not in this room' })
                return
            }

            const result = roomStore.removePlayerBySocketId(socket.id)
            socket.leave(roomId)

            if (!result) {
                callback?.({ success: false, message: 'Не удалось выйти из комнаты' })
                return
            }

            await syncRemovedPlayerWithPersistence(io, result)

            callback?.({
                success: true,
                message: 'Вы вышли из лобби',
            })

            socket.emit('room:left', {
                roomId,
            })

            if (result.room) {
                io.to(roomId).emit('room:state', result.room)
            }

            if (result.removedPlayer) {
                io.to(roomId).emit('room:player-left', {
                    roomId,
                    userId: result.removedPlayer.userId,
                    username: result.removedPlayer.username,
                })
            }
        } catch (error) {
            console.error('room:leave error', error)
            callback?.({ success: false, message: 'Не удалось выйти из лобби' })
        }
    })

    socket.on('player:ready', async ({ roomId }, callback) => {
        try {
            const room = roomStore.getRoom(roomId)

            if (!room) {
                callback?.({ success: false, message: 'Room not found' })
                return
            }

            if (!isSocketRoomParticipant(room, socket)) {
                callback?.({ success: false, message: 'Player is not in this room' })
                return
            }

            const updatedRoom = {
                ...room,
                players: getRoomPlayers(room).map((player) => {
                    if (player.socketId === socket.id) {
                        return {
                            ...player,
                            isReady: !player.isReady,
                        }
                    }
                    return player
                }),
            }

            const normalizedRoom = roomStore.createRoom(updatedRoom)

            const currentPlayer = getRoomPlayers(normalizedRoom).find((player) => player.socketId === socket.id)
            const allReady = canStartRoom(normalizedRoom)

            if (allReady) {
                const playingRoom = {
                    ...normalizedRoom,
                    status: 'playing',
                }

                roomStore.createRoom(playingRoom)
                await startRoomMatchService({ roomId })

                io.to(roomId).emit('room:state', playingRoom)
                io.to(roomId).emit('match:start', {
                    roomId,
                })

                return
            }

            io.to(roomId).emit('room:state', normalizedRoom)

            callback?.({
                success: true,
                message: currentPlayer?.isReady ? 'Вы готовы к матчу' : 'Готовность снята',
                isReady: currentPlayer?.isReady ?? false,
            })
        } catch (error) {
            console.error('player:ready error', error)
            callback?.({
                success: false,
                message: 'Не удалось обновить готовность',
            })
        }
    })

    socket.on('room:set-team', async ({ roomId, userId, teamId }, callback) => {
        try {
            const room = roomStore.getRoom(roomId)

            if (!room) {
                callback?.({ success: false, message: 'Room not found' })
                return
            }

            if (room.ownerSocketId !== socket.id && room.ownerUserId !== socket.data.user?.id) {
                callback?.({ success: false, message: 'Только создатель комнаты может менять команды' })
                return
            }

            if (room.status === 'playing') {
                callback?.({ success: false, message: 'Матч уже начался' })
                return
            }

            const teamNumber = getTeamNumberById(teamId)
            const teamSize = getTeamSizeForMode(room.modeKey)
            const players = getRoomPlayers(room)
            const targetPlayer = players.find((player) => String(player.userId) === String(userId))

            if (!targetPlayer) {
                callback?.({ success: false, message: 'Игрок не найден' })
                return
            }

            const targetTeamCount = players.filter((player) => (
                player.teamNumber === teamNumber && String(player.userId) !== String(userId)
            )).length

            if (targetTeamCount >= teamSize) {
                callback?.({ success: false, message: 'В этой команде нет свободного места' })
                return
            }

            const matchBinding = await attachPlayerToRoomMatchService({
                roomId,
                player: targetPlayer,
                teamNumber,
            })
            const updatedPlayers = players.map((player) => {
                if (String(player.userId) !== String(userId)) {
                    return {
                        ...player,
                        isReady: false,
                    }
                }

                return {
                    ...player,
                    teamId: matchBinding.teamId,
                    teamNumber: matchBinding.teamNumber,
                    teamSlot: getTeamIdByNumber(matchBinding.teamNumber),
                    matchPlayerId: matchBinding.matchPlayerId,
                    isReady: false,
                }
            })
            const updatedRoom = roomStore.createRoom({
                ...room,
                status: 'waiting',
                players: updatedPlayers,
                teams: buildRoomTeams(updatedPlayers, room.teams),
            })

            io.to(roomId).emit('room:state', updatedRoom)
            callback?.({ success: true, message: 'Команда обновлена', room: updatedRoom })
        } catch (error) {
            console.error('room:set-team error', error)
            callback?.({ success: false, message: 'Не удалось поменять команду' })
        }
    })
}
