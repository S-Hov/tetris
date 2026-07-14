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

export const normalizeMatchPlayerStats = (player, fallbackPayload = null) => {
    const snapshot = fallbackPayload || player?.gameState || {}

    return {
        score: normalizeScore(snapshot.score),
        linesCleared: normalizeLines(snapshot.linesCleared),
        levelReached: normalizeLevel(snapshot.level),
    }
}

export const aggregateMatchTeamStats = (players = []) => {
    return players.reduce((stats, player) => {
        const playerStats = normalizeMatchPlayerStats(player)

        return {
            score: stats.score + playerStats.score,
            linesCleared: stats.linesCleared + playerStats.linesCleared,
            levelReached: Math.max(stats.levelReached, playerStats.levelReached),
        }
    }, {
        score: 0,
        linesCleared: 0,
        levelReached: 1,
    })
}

export const createRoomMatchService = async ({
    roomId,
    player,
    teamNumber = 1,
    matchMode = '1v1',
    matchType = 'private',
    countsForRating = false,
}) => {
    const result = teamNumber === 1
        ? await createMatchForRoomRepo({
            roomId,
            player,
            matchMode,
            matchType,
            countsForRating,
        })
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

export const finishRoomMatchService = async ({
    roomId,
    winnerPlayer,
    loserPlayer,
    loserPayload = null,
    winnerTeamPlayers = null,
    loserTeamPlayers = null,
}) => {
    if (winnerTeamPlayers?.length && loserTeamPlayers?.length) {
        const winnerStats = aggregateMatchTeamStats(winnerTeamPlayers)
        const loserStats = aggregateMatchTeamStats(loserTeamPlayers)
        const winnerTeamId = winnerTeamPlayers[0]?.teamId || null
        const loserTeamId = loserTeamPlayers[0]?.teamId || null

        return await markRoomMatchFinishedRepo({
            roomId,
            status: 'finished',
            winnerTeamId,
            teams: [
                {
                    teamId: winnerTeamId,
                    teamScore: winnerStats.score,
                    result: 'win',
                },
                {
                    teamId: loserTeamId,
                    teamScore: loserStats.score,
                    result: 'lose',
                },
            ].filter((team) => team.teamId),
            players: [
                ...winnerTeamPlayers.map((player) => ({
                    matchPlayerId: player.matchPlayerId,
                    ...normalizeMatchPlayerStats(player),
                    result: 'win',
                })),
                ...loserTeamPlayers.map((player) => ({
                    matchPlayerId: player.matchPlayerId,
                    ...normalizeMatchPlayerStats(player, player.socketId === loserPlayer?.socketId ? loserPayload : null),
                    result: 'lose',
                })),
            ].filter((player) => player.matchPlayerId),
        })
    }

    if (!winnerPlayer || !loserPlayer) {
        return null
    }

    const winnerStats = normalizeMatchPlayerStats(winnerPlayer)
    const loserStats = normalizeMatchPlayerStats(loserPlayer, loserPayload)

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
    const winnerStats = winnerPlayer ? normalizeMatchPlayerStats(winnerPlayer) : null
    const loserStats = loserPlayer ? normalizeMatchPlayerStats(loserPlayer) : null

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

export const abandonRoomTeamMatchService = async ({
    roomId,
    winnerTeamPlayers = [],
    loserTeamPlayers = [],
    loserPlayer = null,
}) => {
    if (!winnerTeamPlayers.length || !loserTeamPlayers.length) {
        return await abandonRoomMatchService({
            roomId,
            winnerPlayer: winnerTeamPlayers[0] || null,
            loserPlayer: loserPlayer || loserTeamPlayers[0] || null,
        })
    }

    const now = new Date()
    const winnerStats = aggregateMatchTeamStats(winnerTeamPlayers)
    const loserStats = aggregateMatchTeamStats(loserTeamPlayers)
    const winnerTeamId = winnerTeamPlayers[0]?.teamId || null
    const loserTeamId = loserTeamPlayers[0]?.teamId || null

    return await markRoomMatchFinishedRepo({
        roomId,
        status: 'abandoned',
        winnerTeamId,
        teams: [
            {
                teamId: winnerTeamId,
                teamScore: winnerStats.score,
                result: 'win',
            },
            {
                teamId: loserTeamId,
                teamScore: loserStats.score,
                result: 'lose',
            },
        ].filter((team) => team.teamId),
        players: [
            ...winnerTeamPlayers.map((player) => ({
                matchPlayerId: player.matchPlayerId,
                ...normalizeMatchPlayerStats(player),
                result: 'win',
            })),
            ...loserTeamPlayers.map((player) => ({
                matchPlayerId: player.matchPlayerId,
                ...normalizeMatchPlayerStats(player),
                result: 'lose',
                leftAt: player.socketId === loserPlayer?.socketId ? now : null,
            })),
        ].filter((player) => player.matchPlayerId),
    })
}

export const cancelRoomMatchService = async ({ roomId }) => {
    return await cancelRoomMatchRepo({ roomId })
}

export const markRoomPlayerLeftService = async ({ roomId, player }) => {
    return await markMatchPlayerLeftRepo({ roomId, player })
}
