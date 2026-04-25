import {
    attachPlayerToRoomMatchRepo,
    cancelRoomMatchRepo,
    createMatchEventRepo,
    createMatchForRoomRepo,
    markMatchPlayerLeftRepo,
    markRoomMatchFinishedRepo,
    markRoomMatchStartedRepo,
} from '../repositories/matchRepository.js'

const normalizeScore = (value) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0)
const normalizeLines = (value) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0)
const normalizeLevel = (value) => (Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1)

const getPlayerStats = (player, fallbackPayload = null) => {
    const snapshot = fallbackPayload || player?.gameState || {}

    return {
        score: normalizeScore(snapshot.score),
        linesCleared: normalizeLines(snapshot.linesCleared),
        levelReached: normalizeLevel(snapshot.level),
    }
}

export const createRoomMatchService = async ({ roomId, player, teamNumber = 1 }) => {
    const result = teamNumber === 1
        ? await createMatchForRoomRepo({ roomId, player })
        : await attachPlayerToRoomMatchRepo({ roomId, player, teamNumber })

    return {
        matchId: result.matchId,
        teamId: result.teamId,
        teamNumber: result.teamNumber,
        matchPlayerId: result.matchPlayerId,
    }
}

export const attachPlayerToRoomMatchService = async ({ roomId, player, teamNumber }) => {
    return await createRoomMatchService({ roomId, player, teamNumber })
}

export const startRoomMatchService = async ({ roomId }) => {
    return await markRoomMatchStartedRepo({ roomId })
}

export const recordMatchEventService = async ({ roomId, eventType, sourcePlayer, targetPlayer, payload }) => {
    return await createMatchEventRepo({
        roomId,
        eventType,
        sourcePlayer,
        targetPlayer,
        payload,
    })
}

export const finishRoomMatchService = async ({ roomId, winnerPlayer, loserPlayer, loserPayload = null }) => {
    if (!winnerPlayer || !loserPlayer) {
        return null
    }

    const winnerStats = getPlayerStats(winnerPlayer)
    const loserStats = getPlayerStats(loserPlayer, loserPayload)

    return await markRoomMatchFinishedRepo({
        roomId,
        status: 'finished',
        winnerTeamId: winnerPlayer.teamId || null,
        teams: [
            {
                teamId: winnerPlayer.teamId,
                teamScore: winnerStats.score,
                result: 'win',
            },
            {
                teamId: loserPlayer.teamId,
                teamScore: loserStats.score,
                result: 'lose',
            },
        ].filter((team) => team.teamId),
        players: [
            {
                matchPlayerId: winnerPlayer.matchPlayerId,
                ...winnerStats,
                result: 'win',
            },
            {
                matchPlayerId: loserPlayer.matchPlayerId,
                ...loserStats,
                result: 'lose',
            },
        ].filter((player) => player.matchPlayerId),
    })
}

export const abandonRoomMatchService = async ({ roomId, winnerPlayer = null, loserPlayer = null }) => {
    const now = new Date()
    const winnerStats = winnerPlayer ? getPlayerStats(winnerPlayer) : null
    const loserStats = loserPlayer ? getPlayerStats(loserPlayer) : null

    return await markRoomMatchFinishedRepo({
        roomId,
        status: 'abandoned',
        winnerTeamId: winnerPlayer?.teamId || null,
        teams: [
            winnerPlayer?.teamId
                ? {
                    teamId: winnerPlayer.teamId,
                    teamScore: winnerStats.score,
                    result: 'win',
                }
                : null,
            loserPlayer?.teamId
                ? {
                    teamId: loserPlayer.teamId,
                    teamScore: loserStats.score,
                    result: 'lose',
                }
                : null,
        ].filter(Boolean),
        players: [
            winnerPlayer?.matchPlayerId
                ? {
                    matchPlayerId: winnerPlayer.matchPlayerId,
                    ...winnerStats,
                    result: 'win',
                }
                : null,
            loserPlayer?.matchPlayerId
                ? {
                    matchPlayerId: loserPlayer.matchPlayerId,
                    ...loserStats,
                    result: 'lose',
                    leftAt: now,
                }
                : null,
        ].filter(Boolean),
    })
}

export const cancelRoomMatchService = async ({ roomId }) => {
    return await cancelRoomMatchRepo({ roomId })
}

export const markRoomPlayerLeftService = async ({ roomId, player }) => {
    return await markMatchPlayerLeftRepo({ roomId, player })
}
