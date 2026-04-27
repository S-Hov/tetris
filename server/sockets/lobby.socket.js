import crypto from 'crypto'
import { getRoomPlayerByUserId, isSocketRoomParticipant, roomStore } from './roomStore.js'
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

const syncRemovedPlayerWithPersistence = async (io, result) => {
    if (!result?.removedPlayer) {
        return
    }

    await markRoomPlayerLeftService({
        roomId: result.roomId,
        player: result.removedPlayer,
    })

    if (result.previousRoom?.status === 'playing' && result.room) {
        const winner = result.room.players[0] || null

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
        })

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
                matchType: roomSettings.matchType,
                countsForRating: roomSettings.matchType === 'ranked',
            })

            const room = {
                id: roomId,
                status: 'waiting',
                matchId: matchBinding.matchId,
                modeKey: payload.modeKey || '1v1',
                settings: roomSettings,
                players: [
                    {
                        ...player,
                        teamId: matchBinding.teamId,
                        teamNumber: matchBinding.teamNumber,
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
                    players: room.players.map((player) => (
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

            if (room.players.length >= 2) {
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

            const teamNumber = room.players.length + 1
            const matchBinding = await attachPlayerToRoomMatchService({
                roomId,
                player,
                teamNumber,
            })
            const boundPlayer = {
                ...player,
                teamId: matchBinding.teamId,
                teamNumber: matchBinding.teamNumber,
                matchPlayerId: matchBinding.matchPlayerId,
            }
            const updatedRoom = {
                ...room,
                players: [
                    ...room.players,
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
                players: room.players.map((player) => {
                    if (player.socketId === socket.id) {
                        return {
                            ...player,
                            isReady: !player.isReady,
                        }
                    }
                    return player
                }),
            }

            roomStore.createRoom(updatedRoom)

            const currentPlayer = updatedRoom.players.find((player) => player.socketId === socket.id)

            const allReady =
                updatedRoom.players.length === 2 &&
                updatedRoom.players.every((p) => p.isReady)

            if (allReady) {
                const playingRoom = {
                    ...updatedRoom,
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

            io.to(roomId).emit('room:state', updatedRoom)

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
}
