import { registerLobbyHandlers } from './lobby.socket.js'
import { registerGameHandlers } from './game.handlers.js'
import { registerSupportHandlers } from './support.socket.js'
import {
    registerMatchmakingHandlers,
    removeSocketFromParties,
    removeSocketFromMatchmakingQueue,
} from './matchmaking.socket.js'
import { getRoomPlayers, roomStore } from './roomStore.js'
import { socketAuthMiddleware } from './socketAuth.js'
import {
    abandonRoomTeamMatchService,
    cancelRoomMatchService,
    markRoomPlayerLeftService,
} from '../services/matchService.js'
import { upsertUserSessionRepo } from '../repositories/analyticsRepository.js'
import { setSupportRealtimeIo } from '../services/supportRealtimeService.js'
import {
    getRecentActivityEvents,
    publishPlayerActivityEvent,
    setActivityFeedIo,
} from '../services/activityFeedService.js'

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

export const registerSocketHandlers = (io) => {
    setSupportRealtimeIo(io)
    setActivityFeedIo(io)
    io.use(socketAuthMiddleware)

    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id, socket.data.user?.id)
        socket.data.analyticsSessionKey = socket.handshake.auth?.analyticsSessionKey || `socket:${socket.id}`

        void upsertUserSessionRepo({
            userId: socket.data.user?.id,
            sessionKey: socket.data.analyticsSessionKey,
            socketId: socket.id,
            ipAddress: socket.handshake.address,
            userAgent: socket.handshake.headers?.['user-agent'],
            metadata: {
                transport: 'socket',
                role: socket.data.user?.role || null,
            },
        }).catch((error) => {
            console.error('socket session tracking error', error)
        })

        socket.on('ping:measure', (_payload = {}, callback) => {
            callback?.({
                serverTime: Date.now(),
            })
        })

        socket.emit('activity:feed:init', getRecentActivityEvents())
        publishPlayerActivityEvent('connected', { socket })

        registerLobbyHandlers(io, socket)
        registerGameHandlers(io, socket)
        registerMatchmakingHandlers(io, socket)
        registerSupportHandlers(io, socket)

        socket.on('disconnect', async () => {
            console.log('Socket disconnected:', socket.id)
            publishPlayerActivityEvent('disconnected', { socket })
            removeSocketFromMatchmakingQueue(socket.id)
            removeSocketFromParties(io, socket.id)

            let result = null

            try {
                result = await roomStore.removePlayerBySocketId(socket.id)
            } catch (error) {
                console.error('disconnect room cleanup error', error)
                return
            }

            if (!result || !result.removedPlayer) {
                return
            }

            void (async () => {
                try {
                    await markRoomPlayerLeftService({
                        roomId: result.roomId,
                        player: result.removedPlayer,
                    })

                    if (!result.room) {
                        await cancelRoomMatchService({
                            roomId: result.roomId,
                        })
                        return
                    }

                    if (result.previousRoom?.status === 'playing') {
                        const winner = getWinnerAfterPlayerLeft(result.room, result.removedPlayer)
                        const teamOutcome = getTeamOutcomeAfterPlayerLeft(
                            result.previousRoom,
                            result.room,
                            result.removedPlayer
                        )

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
                            reason: 'disconnect',
                            matchType: result.previousRoom?.settings?.matchType || 'private',
                        })

                        if (result.previousRoom?.settings?.matchType && result.previousRoom.settings.matchType !== 'private') {
                            await roomStore.deleteRoom(result.roomId)
                        }
                    }
                } catch (error) {
                    console.error('disconnect persistence error', error)
                }
            })()

            if (result.room) {
                io.to(result.roomId).emit('room:state', result.room)
            }

            io.to(result.roomId).emit('room:player-left', {
                roomId: result.roomId,
                userId: result.removedPlayer.userId,
                username: result.removedPlayer.username,
            })
        })
    })
}
