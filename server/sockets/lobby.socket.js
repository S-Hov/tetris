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
    abandonRoomTeamMatchService,
    attachPlayerToRoomMatchService,
    cancelRoomMatchService,
    createRoomMatchService,
    markRoomPlayerLeftService,
    startRoomMatchService,
} from '../services/matchService.js'
import { recordGameActivityEventRepo } from '../repositories/analyticsRepository.js'
import { publishPlayerActivityEvent } from '../services/activityFeedService.js'

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

const trackRoomEvent = (eventType, { room, socket, player = null, metadata = {} }) => {
    void recordGameActivityEventRepo({
        matchId: room?.matchId || null,
        roomId: room?.id || null,
        userId: player?.userId ?? socket?.data.user?.id,
        sessionKey: socket?.data.analyticsSessionKey || null,
        mode: room?.modeKey || null,
        matchType: room?.settings?.matchType || null,
        eventType,
        metadata,
    }).catch((error) => {
        console.error(`game activity tracking error: ${eventType}`, error)
    })
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

const isRoomOwnerSocket = (room, socket) => (
    room?.ownerSocketId === socket.id ||
    String(room?.ownerUserId) === String(socket.data.user?.id)
)

const refreshOwnerSocketIfNeeded = (room, socket) => {
    if (!room || String(room.ownerUserId) !== String(socket.data.user?.id) || room.ownerSocketId === socket.id) {
        return room
    }

    return {
        ...room,
        ownerSocketId: socket.id,
    }
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

const getTeamOutcomeAfterPlayerLeft = (previousRoom, updatedRoom, removedPlayer) => {
    const previousPlayers = getRoomPlayers(previousRoom)
    const updatedPlayers = getRoomPlayers(updatedRoom)
    const loserTeamNumber = removedPlayer?.teamNumber
    const winnerTeamPlayers = updatedPlayers.filter((player) => player.teamNumber !== loserTeamNumber)
    const loserTeamPlayers = previousPlayers.filter((player) => player.teamNumber === loserTeamNumber)

    return {
        winnerTeamPlayers,
        loserTeamPlayers: loserTeamPlayers.length ? loserTeamPlayers : [removedPlayer].filter(Boolean),
    }
}

const bindRoomPlayersToFreshMatch = async (room) => {
    const players = getRoomPlayers(room)
    const firstTeamOnePlayer = players.find((player) => player.teamNumber === 1) || players[0]

    if (!firstTeamOnePlayer) {
        return room
    }

    const roomSettings = room.settings || {}
    const countsForRating = roomSettings.matchType === 'ranked'
    const firstBinding = await createRoomMatchService({
        roomId: room.id,
        player: firstTeamOnePlayer,
        matchMode: room.modeKey || '1v1',
        matchType: roomSettings.matchType || 'private',
        countsForRating,
    })
    const bindings = new Map([
        [firstTeamOnePlayer.socketId, firstBinding],
    ])

    for (const player of players) {
        if (player.socketId === firstTeamOnePlayer.socketId) {
            continue
        }

        const binding = await attachPlayerToRoomMatchService({
            roomId: room.id,
            player,
            teamNumber: player.teamNumber || 1,
        })

        bindings.set(player.socketId, binding)
    }

    const reboundPlayers = players.map((player) => {
        const binding = bindings.get(player.socketId)

        return binding
            ? {
                ...player,
                teamId: binding.teamId,
                teamNumber: binding.teamNumber,
                teamSlot: getTeamIdByNumber(binding.teamNumber),
                matchPlayerId: binding.matchPlayerId,
            }
            : player
    })

    return await roomStore.createRoom({
        ...room,
        matchId: firstBinding.matchId,
        players: reboundPlayers,
        teams: buildRoomTeams(reboundPlayers, room.teams),
    })
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
        const teamOutcome = getTeamOutcomeAfterPlayerLeft(result.previousRoom, result.room, result.removedPlayer)

        await abandonRoomTeamMatchService({
            roomId: result.roomId,
            winnerTeamPlayers: teamOutcome.winnerTeamPlayers,
            loserTeamPlayers: teamOutcome.loserTeamPlayers,
            loserPlayer: result.removedPlayer,
        })

        io.to(result.roomId).emit('match:end', {
            roomId: result.roomId,
            loserSocketId: result.removedPlayer.socketId,
            winnerSocketId: winner?.socketId || null,
            loserSocketIds: teamOutcome.loserTeamPlayers.map((player) => player.socketId),
            winnerSocketIds: teamOutcome.winnerTeamPlayers.map((player) => player.socketId),
            loserTeamId: teamOutcome.loserTeamPlayers[0]?.teamSlot || null,
            winnerTeamId: teamOutcome.winnerTeamPlayers[0]?.teamSlot || null,
            reason: 'room_switch',
            matchType: result.previousRoom?.settings?.matchType || 'private',
        })

        if (result.previousRoom?.settings?.matchType && result.previousRoom.settings.matchType !== 'private') {
            await roomStore.deleteRoom(result.roomId)
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
    const existingRoom = await roomStore.findRoomBySocketId(socket.id)

    if (!existingRoom || existingRoom.id === nextRoomId) {
        return
    }

    const result = await roomStore.removePlayerBySocketId(socket.id)

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

            const normalizedRoom = await roomStore.createRoom(room)
            socket.join(roomId)
            trackRoomEvent('room_created', {
                room: normalizedRoom,
                socket,
                player,
            })
            publishPlayerActivityEvent('room_created', {
                socket,
                player,
                room: normalizedRoom,
                detail: `${normalizedRoom.modeKey} ${normalizedRoom.settings?.matchType || 'private'}`,
            })

            callback?.({
                success: true,
                message: 'Комната создана',
                room: normalizedRoom,
            })

            io.to(roomId).emit('room:state', normalizedRoom)
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
            const room = await roomStore.getRoom(roomId)

            if (!room) {
                callback?.({
                    success: false,
                    message: 'Room not found',
                })
                return
            }

            if (room.status === 'closed') {
                callback?.({
                    success: false,
                    message: 'Room is closed',
                })
                return
            }

            if (isSocketRoomParticipant(room, socket)) {
                const normalizedRoom = await roomStore.createRoom(refreshOwnerSocketIfNeeded(room, socket))

                callback?.({
                    success: true,
                    room: normalizedRoom,
                })

                io.to(roomId).emit('room:state', normalizedRoom)
                return
            }

            const existingPlayer = getRoomPlayerByUserId(room, user.id)

            if (existingPlayer) {
                const rejoinedRoom = {
                    ...refreshOwnerSocketIfNeeded(room, socket),
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

                const normalizedRoom = await roomStore.createRoom(rejoinedRoom)
                socket.join(roomId)
                trackRoomEvent('room_joined', {
                    room: normalizedRoom,
                    socket,
                    player: existingPlayer,
                    metadata: { rejoined: true },
                })
                publishPlayerActivityEvent('room_joined', {
                    socket,
                    player: existingPlayer,
                    room: normalizedRoom,
                    detail: 'вернулся в комнату',
                    metadata: { rejoined: true },
                })

                callback?.({
                    success: true,
                    message: 'Вы переподключились к комнате',
                    room: normalizedRoom,
                })

                io.to(roomId).emit('room:state', normalizedRoom)
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

            const normalizedRoom = await roomStore.createRoom(updatedRoom)
            socket.join(roomId)
            trackRoomEvent('room_joined', {
                room: normalizedRoom,
                socket,
                player: boundPlayer,
            })
            publishPlayerActivityEvent('room_joined', {
                socket,
                player: boundPlayer,
                room: normalizedRoom,
            })

            callback?.({
                success: true,
                message: 'Вы подключились к комнате',
                room: normalizedRoom,
            })

            io.to(roomId).emit('room:state', normalizedRoom)
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
            const room = await roomStore.getRoom(roomId)

            if (!room) {
                callback?.({ success: false, message: 'Room not found' })
                return
            }

            if (!isSocketRoomParticipant(room, socket)) {
                callback?.({ success: false, message: 'Player is not in this room' })
                return
            }

            const result = await roomStore.removePlayerBySocketId(socket.id)
            socket.leave(roomId)

            if (!result) {
                callback?.({ success: false, message: 'Не удалось выйти из комнаты' })
                return
            }

            await syncRemovedPlayerWithPersistence(io, result)
            trackRoomEvent('room_left', {
                room: result.previousRoom,
                socket,
                player: result.removedPlayer,
            })
            publishPlayerActivityEvent('room_left', {
                socket,
                player: result.removedPlayer,
                room: result.previousRoom,
            })

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
            const room = await roomStore.getRoom(roomId)

            if (!room) {
                callback?.({ success: false, message: 'Room not found' })
                return
            }

            if (room.status === 'closed') {
                callback?.({ success: false, message: 'Room is closed' })
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

            const normalizedRoom = await roomStore.createRoom(updatedRoom)

            const currentPlayer = getRoomPlayers(normalizedRoom).find((player) => player.socketId === socket.id)
            const allReady = canStartRoom(normalizedRoom)

            if (allReady) {
                const reboundRoom = await bindRoomPlayersToFreshMatch(normalizedRoom)
                const playingRoom = {
                    ...reboundRoom,
                    status: 'playing',
                }

                await roomStore.createRoom(playingRoom)
                await startRoomMatchService({ roomId })
                trackRoomEvent('match_started', {
                    room: playingRoom,
                    socket,
                    metadata: { source: 'ready' },
                })
                publishPlayerActivityEvent('match_started', {
                    socket,
                    room: playingRoom,
                    detail: 'все готовы',
                    metadata: { source: 'ready' },
                })

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

    socket.on('room:update-mode', async ({ roomId, modeKey, settings } = {}, callback) => {
        try {
            const room = await roomStore.getRoom(roomId)

            if (!room) {
                callback?.({ success: false, message: 'Room not found' })
                return
            }

            if (room.status === 'closed') {
                callback?.({ success: false, message: 'Room is closed' })
                return
            }

            if (room.status === 'playing') {
                callback?.({ success: false, message: 'Match has already started' })
                return
            }

            if (!isRoomOwnerSocket(room, socket)) {
                callback?.({ success: false, message: 'Only room owner can change room mode' })
                return
            }

            if (!isSocketRoomParticipant(room, socket)) {
                callback?.({ success: false, message: 'Player is not in this room' })
                return
            }

            const nextModeKey = modeKey || room.modeKey || '1v1'
            const players = getRoomPlayers(room)

            if (players.length > getMaxPlayersForMode(nextModeKey)) {
                callback?.({
                    success: false,
                    message: 'Too many players for this mode',
                })
                return
            }

            const nextSettings = settings ? normalizeRoomSettings(settings) : (room.settings || {})
            const updatedPlayers = players.map((player) => ({
                ...player,
                isReady: false,
            }))
            const updatedRoom = await roomStore.createRoom({
                ...room,
                status: 'waiting',
                modeKey: nextModeKey,
                settings: nextSettings,
                players: updatedPlayers,
                teams: buildRoomTeams(updatedPlayers, room.teams),
            })

            trackRoomEvent('room_mode_updated', {
                room: updatedRoom,
                socket,
                metadata: { modeKey: nextModeKey },
            })

            io.to(roomId).emit('room:state', updatedRoom)
            callback?.({ success: true, message: 'Room mode updated', room: updatedRoom })
        } catch (error) {
            console.error('room:update-mode error', error)
            callback?.({ success: false, message: 'Could not update room mode' })
        }
    })

    socket.on('room:update-settings', async ({ roomId, settings } = {}, callback) => {
        try {
            const room = await roomStore.getRoom(roomId)

            if (!room) {
                callback?.({ success: false, message: 'Room not found' })
                return
            }

            if (room.status === 'closed') {
                callback?.({ success: false, message: 'Room is closed' })
                return
            }

            if (room.status === 'playing') {
                callback?.({ success: false, message: 'Match has already started' })
                return
            }

            if (!isRoomOwnerSocket(room, socket)) {
                callback?.({ success: false, message: 'Only room owner can change room settings' })
                return
            }

            if (!isSocketRoomParticipant(room, socket)) {
                callback?.({ success: false, message: 'Player is not in this room' })
                return
            }

            const nextSettings = normalizeRoomSettings({
                ...(room.settings || {}),
                ...(settings || {}),
            })
            const updatedPlayers = getRoomPlayers(room).map((player) => ({
                ...player,
                isReady: false,
            }))
            const updatedRoom = await roomStore.createRoom({
                ...room,
                status: 'waiting',
                settings: nextSettings,
                players: updatedPlayers,
                teams: buildRoomTeams(updatedPlayers, room.teams),
            })

            trackRoomEvent('room_settings_updated', {
                room: updatedRoom,
                socket,
                metadata: nextSettings,
            })

            io.to(roomId).emit('room:state', updatedRoom)
            callback?.({ success: true, message: 'Room settings updated', room: updatedRoom })
        } catch (error) {
            console.error('room:update-settings error', error)
            callback?.({ success: false, message: 'Could not update room settings' })
        }
    })

    socket.on('room:set-team', async ({ roomId, userId, teamId }, callback) => {
        try {
            const room = await roomStore.getRoom(roomId)

            if (!room) {
                callback?.({ success: false, message: 'Room not found' })
                return
            }

            if (room.status === 'closed') {
                callback?.({ success: false, message: 'Room is closed' })
                return
            }

            if (!isRoomOwnerSocket(room, socket)) {
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
            const updatedRoom = await roomStore.createRoom({
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
