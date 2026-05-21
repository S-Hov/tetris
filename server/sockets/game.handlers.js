import {
    calculateTeamScore,
    getRoomPlayers,
    isSocketRoomParticipant,
    roomStore,
} from './roomStore.js'
import {
    finishRoomMatchService,
    recordMatchEventService,
} from '../services/matchService.js'
import { getActiveGameEffectByKeyRepo } from '../repositories/gameEffectsRepository.js'

export const registerGameHandlers = (io, socket) => {
    socket.on('game:update', async ({ roomId, payload }) => {
        const room = await roomStore.getRoom(roomId)

        if (!isSocketRoomParticipant(room, socket)) {
            return
        }

        await roomStore.updatePlayer(roomId, socket.id, (player) => ({
            ...player,
            gameState: payload,
        }))

        socket.to(roomId).emit('opponent:update', {
            socketId: socket.id,
            payload,
        })
    })

    socket.on('game:over', async ({ roomId, payload }) => {
        const room = await roomStore.getRoom(roomId)

        if (!isSocketRoomParticipant(room, socket)) {
            return
        }

        if (room.status !== 'playing') {
            return
        }

        const updatedRoom = await roomStore.updateRoom(roomId, (currentRoom) => {
            if (!currentRoom) {
                return currentRoom
            }

            const players = getRoomPlayers(currentRoom).map((player) => (
                player.socketId === socket.id
                    ? {
                        ...player,
                        gameState: {
                            ...(player.gameState || {}),
                            ...payload,
                            isGameOver: true,
                        },
                    }
                    : player
            ))
            const teams = (currentRoom.teams || []).map((team) => {
                const teamPlayers = players.filter((player) => player.teamSlot === team.id)

                return {
                    ...team,
                    score: calculateTeamScore(teamPlayers),
                    players: teamPlayers,
                }
            })
            const loser = players.find((player) => player.socketId === socket.id) || null
            const loserTeam = teams.find((team) => team.players.some((player) => player.socketId === socket.id)) || null
            const isTeamDefeated = Boolean(loserTeam) &&
                loserTeam.players.length > 0 &&
                loserTeam.players.every((player) => player.gameState?.isGameOver)

            return {
                ...currentRoom,
                status: isTeamDefeated ? 'waiting' : currentRoom.status,
                players: isTeamDefeated
                    ? players.map((player) => ({
                        ...player,
                        isReady: false,
                    }))
                    : players,
                teams,
                lastLoserSocketId: loser?.socketId || null,
            }
        })

        const players = getRoomPlayers(updatedRoom || room)
        const loser = players.find((player) => player.socketId === socket.id) || null
        const loserTeam = updatedRoom?.teams?.find((team) => (
            (team.players || []).some((player) => player.socketId === socket.id)
        )) || null
        const winnerTeam = updatedRoom?.teams?.find((team) => team.id !== loserTeam?.id) || null
        const isTeamDefeated = Boolean(loserTeam) &&
            (loserTeam.players || []).length > 0 &&
            loserTeam.players.every((player) => player.gameState?.isGameOver)
        const winner = winnerTeam?.players?.[0] || players.find((player) => player.socketId !== socket.id) || null

        if (isTeamDefeated && winner && loser) {
            try {
                await finishRoomMatchService({
                    roomId,
                    winnerPlayer: winner,
                    loserPlayer: loser,
                    loserPayload: payload,
                    winnerTeamPlayers: winnerTeam?.players || null,
                    loserTeamPlayers: loserTeam?.players || null,
                })
            } catch (error) {
                console.error('game:over persistence error', error)
            }
        }

        socket.to(roomId).emit('opponent:update', {
            socketId: socket.id,
            payload: {
                ...payload,
                isGameOver: true,
            },
        })

        if (updatedRoom) {
            io.to(roomId).emit('room:state', updatedRoom)
        }

        if (!isTeamDefeated) {
            return
        }

        io.to(roomId).emit('match:end', {
            roomId,
            loserSocketId: socket.id,
            winnerSocketId: winner?.socketId || null,
            loserSocketIds: (loserTeam?.players || []).map((player) => player.socketId),
            winnerSocketIds: (winnerTeam?.players || []).map((player) => player.socketId),
            loserTeamId: loserTeam?.id || null,
            winnerTeamId: winnerTeam?.id || null,
            matchType: room.settings?.matchType || 'private',
        })

        if (room.settings?.matchType && room.settings.matchType !== 'private') {
            await roomStore.deleteRoom(roomId)
        }
    })

    socket.on('ability:use', async ({ roomId, abilityId, targetSocketId }, callback) => {
        const room = await roomStore.getRoom(roomId)

        if (!room) {
            callback?.({ success: false, message: 'Room not found' })
            return
        }

        if (room.status !== 'playing') {
            callback?.({ success: false, message: 'Match is not playing' })
            return
        }

        const sourcePlayer = getRoomPlayers(room).find((player) => player.socketId === socket.id)

        if (!sourcePlayer) {
            callback?.({ success: false, message: 'You are not in this room' })
            return
        }

        const opponentPlayers = getRoomPlayers(room).filter((player) => (
            player.socketId !== socket.id && player.teamNumber !== sourcePlayer.teamNumber
        ))
        const targetPlayer = targetSocketId
            ? opponentPlayers.find((player) => player.socketId === targetSocketId)
            : opponentPlayers[0] || null

        if (!targetPlayer) {
            callback?.({ success: false, message: 'Opponent not found' })
            return
        }

        if (opponentPlayers.length > 1 && !targetSocketId) {
            callback?.({ success: false, message: 'Target opponent is required' })
            return
        }

        const ability = await getActiveGameEffectByKeyRepo(abilityId)

        if (!ability) {
            callback?.({ success: false, message: 'Unknown ability' })
            return
        }

        const effect = {
            type: ability.effect_key,
            durationMs: Number(ability.duration_ms) || 0,
        }

        io.to(targetPlayer.socketId).emit('effect:apply', {
            effect: {
                ...effect,
                sourceSocketId: socket.id,
            },
        })

        try {
            await recordMatchEventService({
                roomId,
                eventType: 'ability_used',
                sourcePlayer,
                targetPlayer,
                payload: {
                    abilityId,
                    effectType: effect.type,
                    durationMs: effect.durationMs,
                },
            })
        } catch (error) {
            console.error('ability:use persistence error', error)
        }

        callback?.({ success: true, effectType: effect.type })
    })
}
