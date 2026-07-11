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
import { getActiveGameEffectsRepo } from '../repositories/gameEffectsRepository.js'
import { publishActivityEvent, publishPlayerActivityEvent } from '../services/activityFeedService.js'

const PLAYER_SNAPSHOT_PERSIST_DELAY_MS = 1500
const PERSISTENCE_TIMEOUT_MS = 4000
const EFFECT_CACHE_TTL_MS = 60_000
const PERSIST_PLAYER_SNAPSHOTS = String(process.env.MATCH_PERSIST_PLAYER_SNAPSHOTS).toLowerCase() === 'true'
const pendingPlayerSnapshotPersists = new Map()
let activeEffectCache = new Map()
let activeEffectCacheLoadedAt = 0
let activeEffectCachePromise = null

const notifyPersistenceError = (io, roomId, scope, message = 'Не удалось сохранить данные матча') => {
    io.to(roomId).emit('persistence:error', {
        roomId,
        scope,
        message,
    })
}

const notifyPersistenceSuccess = (io, roomId, scope, message) => {
    io.to(roomId).emit('persistence:success', {
        roomId,
        scope,
        message,
    })
}

const withPersistenceTimeout = async (task) => {
    let timeoutId

    try {
        return await Promise.race([
            task(),
            new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('Persistence timeout')), PERSISTENCE_TIMEOUT_MS)
            }),
        ])
    } finally {
        clearTimeout(timeoutId)
    }
}

const runPersistenceTask = (io, roomId, task, {
    errorLog,
    errorMessage = 'Не удалось сохранить данные матча',
    notifyOnError = true,
    scope,
    successMessage = null,
}) => {
    void withPersistenceTimeout(task)
        .then(() => {
            if (successMessage) {
                notifyPersistenceSuccess(io, roomId, scope, successMessage)
            }
        })
        .catch((error) => {
            console.error(errorLog, error)

            if (notifyOnError) {
                notifyPersistenceError(io, roomId, scope, errorMessage)
            }
        })
}

const refreshActiveEffectCache = async () => {
    if (activeEffectCachePromise) {
        return await activeEffectCachePromise
    }

    activeEffectCachePromise = getActiveGameEffectsRepo()
        .then((effects) => {
            activeEffectCache = new Map(effects.map((effect) => [effect.effect_key, effect]))
            activeEffectCacheLoadedAt = Date.now()
            return activeEffectCache
        })
        .finally(() => {
            activeEffectCachePromise = null
        })

    return await activeEffectCachePromise
}

const getCachedActiveEffect = async (effectKey) => {
    const cachedEffect = activeEffectCache.get(effectKey)
    const isFresh = Date.now() - activeEffectCacheLoadedAt < EFFECT_CACHE_TTL_MS

    if (cachedEffect && isFresh) {
        return cachedEffect
    }

    if (cachedEffect) {
        void refreshActiveEffectCache().catch((error) => {
            console.error('ability catalog refresh error', error)
        })
        return cachedEffect
    }

    const effects = await refreshActiveEffectCache()
    return effects.get(effectKey) || null
}

void refreshActiveEffectCache().catch((error) => {
    console.error('ability catalog warmup error', error)
})

const schedulePlayerSnapshotPersist = (io, roomId, socketId, payload) => {
    const key = `${roomId}:${socketId}`
    const existingTask = pendingPlayerSnapshotPersists.get(key)

    if (existingTask) {
        existingTask.payload = payload
        return
    }

    const task = {
        payload,
        timer: null,
    }

    task.timer = setTimeout(() => {
        pendingPlayerSnapshotPersists.delete(key)

        runPersistenceTask(
            io,
            roomId,
            () => roomStore.updatePlayer(roomId, socketId, (player) => ({
                ...player,
                gameState: task.payload,
            })),
            {
                errorLog: 'game:update persistence error',
                notifyOnError: false,
                scope: 'player_snapshot',
            }
        )
    }, PLAYER_SNAPSHOT_PERSIST_DELAY_MS)

    pendingPlayerSnapshotPersists.set(key, task)
}

const clearRoomSnapshotPersists = (roomId) => {
    const prefix = `${roomId}:`

    for (const [key, task] of pendingPlayerSnapshotPersists.entries()) {
        if (!key.startsWith(prefix)) {
            continue
        }

        clearTimeout(task.timer)
        pendingPlayerSnapshotPersists.delete(key)
    }
}

export const registerGameHandlers = (io, socket) => {
    socket.on('game:update', async ({ roomId, payload }) => {
        const room = await roomStore.getRoom(roomId)

        if (!isSocketRoomParticipant(room, socket)) {
            return
        }

        roomStore.updateCachedPlayer(roomId, socket.id, (player) => ({
            ...player,
            gameState: payload,
        }))

        socket.to(roomId).emit('opponent:update', {
            socketId: socket.id,
            payload,
        })

        if (PERSIST_PLAYER_SNAPSHOTS) {
            schedulePlayerSnapshotPersist(io, roomId, socket.id, payload)
        }
    })

    socket.on('game:over', async ({ roomId, payload }) => {
        const room = await roomStore.getRoom(roomId)

        if (!isSocketRoomParticipant(room, socket)) {
            return
        }

        if (room.status !== 'playing') {
            return
        }

        const updatedRoom = roomStore.updateCachedRoom(roomId, (currentRoom) => {
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
            runPersistenceTask(
                io,
                roomId,
                () => updatedRoom ? roomStore.createRoom(updatedRoom) : Promise.resolve(null),
                {
                    errorLog: 'game:over room persistence error',
                    notifyOnError: false,
                    scope: 'match_state',
                }
            )
            return
        }

        clearRoomSnapshotPersists(roomId)

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
        publishActivityEvent({
            type: 'match_finished',
            actor: winner?.username || 'Игрок',
            target: loser?.username || null,
            mode: room.modeKey,
            matchType: room.settings?.matchType || 'private',
            roomId,
            detail: winner ? 'победа' : 'матч завершен',
        })

        runPersistenceTask(
            io,
            roomId,
            async () => {
                if (updatedRoom) {
                    await roomStore.createRoom(updatedRoom)
                }

                if (isTeamDefeated && winner && loser) {
                    await finishRoomMatchService({
                        roomId,
                        winnerPlayer: winner,
                        loserPlayer: loser,
                        loserPayload: payload,
                        winnerTeamPlayers: winnerTeam?.players || null,
                        loserTeamPlayers: loserTeam?.players || null,
                    })
                }

                if (room.settings?.matchType && room.settings.matchType !== 'private') {
                    await roomStore.deleteRoom(roomId)
                }
            },
            {
                errorLog: 'game:over persistence error',
                scope: 'match_result',
                successMessage: 'Данные матча успешно сохранены',
            }
        )
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

        let ability

        try {
            ability = await getCachedActiveEffect(abilityId)
        } catch (error) {
            console.error('ability catalog lookup error', error)
            callback?.({
                success: false,
                message: 'Effect catalog is temporarily unavailable',
            })
            return
        }

        if (!ability) {
            callback?.({ success: false, message: 'Unknown ability' })
            return
        }

        const effect = {
            effectKey: ability.effect_key,
            type: ability.effect_key,
            durationMs: Number(ability.duration_ms) || 0,
            parameters: ability.metadata && typeof ability.metadata === 'object'
                ? ability.metadata
                : {},
        }

        io.to(targetPlayer.socketId).emit('effect:apply', {
            effect: {
                ...effect,
                sourceSocketId: socket.id,
            },
        })
        publishPlayerActivityEvent('ability_used', {
            socket,
            player: sourcePlayer,
            room,
            detail: `${ability.name || abilityId} -> ${targetPlayer.username}`,
            metadata: {
                abilityId,
                effectType: effect.type,
                targetSocketId: targetPlayer.socketId,
            },
        })

        callback?.({ success: true, effectType: effect.type })

        runPersistenceTask(
            io,
            roomId,
            () => recordMatchEventService({
                roomId,
                eventType: 'ability_used',
                sourcePlayer,
                targetPlayer,
                payload: {
                    abilityId,
                    effectType: effect.type,
                    durationMs: effect.durationMs,
                },
            }),
            {
                errorLog: 'ability:use persistence error',
                errorMessage: 'Не удалось сохранить событие матча',
                scope: 'match_event',
            }
        )
    })
}
