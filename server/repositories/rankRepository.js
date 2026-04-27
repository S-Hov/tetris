import {
    calculateMmrDelta,
    calculateRankDelta,
} from '../services/rankRules.js'

export const ensureUserRankStatsRepo = async (client, userId) => {
    await client.query(
        `
        INSERT INTO user_rank_stats (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
        `,
        [userId]
    )
}

export const applyRankedMatchResultRepo = async (client, matchId) => {
    const matchResult = await client.query(
        `
        SELECT id, mode, status, counts_for_rating
        FROM matches
        WHERE id = $1
        FOR UPDATE
        `,
        [matchId]
    )

    const match = matchResult.rows[0]

    if (!match?.counts_for_rating || match.status !== 'finished') {
        return []
    }

    const historyResult = await client.query(
        `
        SELECT id
        FROM rating_history
        WHERE match_id = $1
        LIMIT 1
        `,
        [matchId]
    )

    if (historyResult.rows[0]) {
        return []
    }

    const playersResult = await client.query(
        `
        SELECT
            match_players.id,
            match_players.user_id,
            match_players.team_id,
            match_players.score,
            match_players.lines_cleared,
            match_players.result,
            match_teams.team_score
        FROM match_players
        LEFT JOIN match_teams
            ON match_teams.id = match_players.team_id
        WHERE match_players.match_id = $1
            AND match_players.user_id IS NOT NULL
            AND match_players.result IN ('win', 'lose', 'loss', 'draw')
        ORDER BY match_players.id ASC
        `,
        [matchId]
    )

    const players = playersResult.rows

    if (players.length === 0) {
        return []
    }

    const updates = []

    for (const player of players) {
        await ensureUserRankStatsRepo(client, player.user_id)

        const statsResult = await client.query(
            `
            SELECT user_id, rank_points, mmr, wins, losses, draws, best_solo_score, total_matches
            FROM user_rank_stats
            WHERE user_id = $1
            FOR UPDATE
            `,
            [player.user_id]
        )
        const currentStats = statsResult.rows[0]
        const opponentBestScore = getOpponentBestScore(players, player)
        const result = player.result === 'loss' ? 'lose' : player.result
        const rankDelta = calculateRankDelta({
            result,
            score: Number(player.score) || 0,
            linesCleared: Number(player.lines_cleared) || 0,
            scoreDiff: (Number(player.team_score) || 0) - opponentBestScore,
        })
        const mmrDelta = calculateMmrDelta(result)
        const oldRankPoints = Number(currentStats.rank_points) || 0
        const oldMmr = Number(currentStats.mmr) || 1000
        const newRankPoints = Math.max(0, oldRankPoints + rankDelta)
        const newMmr = Math.max(0, oldMmr + mmrDelta)
        const bestSoloScore = match.mode === 'solo'
            ? Math.max(Number(currentStats.best_solo_score) || 0, Number(player.score) || 0)
            : Number(currentStats.best_solo_score) || 0

        await client.query(
            `
            UPDATE user_rank_stats
            SET rank_points = $2,
                mmr = $3,
                wins = wins + $4,
                losses = losses + $5,
                draws = draws + $6,
                best_solo_score = $7,
                total_matches = total_matches + 1,
                updated_at = NOW()
            WHERE user_id = $1
            `,
            [
                player.user_id,
                newRankPoints,
                newMmr,
                result === 'win' ? 1 : 0,
                result === 'lose' ? 1 : 0,
                result === 'draw' ? 1 : 0,
                bestSoloScore,
            ]
        )

        await client.query(
            `
            INSERT INTO rating_history (
                user_id,
                match_id,
                old_rank_points,
                new_rank_points,
                rank_delta,
                old_mmr,
                new_mmr,
                mmr_delta,
                reason
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'match_result')
            `,
            [
                player.user_id,
                matchId,
                oldRankPoints,
                newRankPoints,
                newRankPoints - oldRankPoints,
                oldMmr,
                newMmr,
                newMmr - oldMmr,
            ]
        )

        updates.push({
            userId: player.user_id,
            oldRankPoints,
            newRankPoints,
            rankDelta: newRankPoints - oldRankPoints,
            oldMmr,
            newMmr,
            mmrDelta: newMmr - oldMmr,
        })
    }

    return updates
}

const getOpponentBestScore = (players, currentPlayer) => {
    return players
        .filter((player) => player.team_id !== currentPlayer.team_id)
        .reduce((bestScore, player) => Math.max(bestScore, Number(player.team_score) || Number(player.score) || 0), 0)
}
