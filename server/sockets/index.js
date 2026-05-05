import { registerLobbyHandlers } from './lobby.socket.js'
import { registerGameHandlers } from './game.handlers.js'
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
    io.use(socketAuthMiddleware)

    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id, socket.data.user?.id)

        registerLobbyHandlers(io, socket)
        registerGameHandlers(io, socket)
        registerMatchmakingHandlers(io, socket)

        socket.on('disconnect', async () => {
            console.log('Socket disconnected:', socket.id)
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
