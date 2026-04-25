import { pool } from '../db/index.js'

const MATCH_MODE = '1v1'
const MATCH_TYPE = 'private'

const getMatchByRoomIdQuery = `
    SELECT id, room_id, mode, match_type, status, is_online, counts_for_rating, winner_team_id,
           started_at, ended_at, created_at, updated_at
    FROM matches
    WHERE room_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT 1
`

const mapPlayerIdentity = (player) => ({
    userId: Number.isInteger(player.userId) ? player.userId : null,
    isRegistered: player.isRegistered ?? Number.isInteger(player.userId),
    nickname: player.username || player.nickname || 'Guest',
})

const getPlayerLookupClause = ({ userId, nickname, isRegistered }) => {
    if (userId) {
        return {
            clause: 'user_id = $2',
            values: [userId],
        }
    }

    return {
        clause: 'user_id IS NULL AND is_registered = $2 AND nickname = $3',
        values: [Boolean(isRegistered), nickname],
    }
}

const getLatestMatchByRoomId = async (client, roomId, { forUpdate = false } = {}) => {
    const result = await client.query(
        `${getMatchByRoomIdQuery}${forUpdate ? ' FOR UPDATE' : ''}`,
        [roomId]
    )

    return result.rows[0] || null
}

const ensureTeamForMatch = async (client, matchId, teamNumber) => {
    const existingTeam = await client.query(
        `
        SELECT id, match_id, team_number, team_score, result
        FROM match_teams
        WHERE match_id = $1 AND team_number = $2
        LIMIT 1
        `,
        [matchId, teamNumber]
    )

    if (existingTeam.rows[0]) {
        return existingTeam.rows[0]
    }

    const createdTeam = await client.query(
        `
        INSERT INTO match_teams (match_id, team_number)
        VALUES ($1, $2)
        RETURNING id, match_id, team_number, team_score, result
        `,
        [matchId, teamNumber]
    )

    return createdTeam.rows[0]
}

const upsertMatchPlayer = async (client, { matchId, teamId, player }) => {
    const identity = mapPlayerIdentity(player)
    const lookup = getPlayerLookupClause(identity)

    const existingPlayer = await client.query(
        `
        SELECT id, match_id, team_id, user_id, is_registered, nickname
        FROM match_players
        WHERE match_id = $1 AND ${lookup.clause}
        ORDER BY id DESC
        LIMIT 1
        `,
        [matchId, ...lookup.values]
    )

    if (existingPlayer.rows[0]) {
        const reconnectedPlayer = await client.query(
            `
            UPDATE match_players
            SET team_id = $2, nickname = $3, is_registered = $4, left_at = NULL
            WHERE id = $1
            RETURNING id, match_id, team_id, user_id, is_registered, nickname
            `,
            [
                existingPlayer.rows[0].id,
                teamId,
                identity.nickname,
                identity.isRegistered,
            ]
        )

        return reconnectedPlayer.rows[0]
    }

    const insertedPlayer = await client.query(
        `
        INSERT INTO match_players (match_id, team_id, user_id, is_registered, nickname)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, match_id, team_id, user_id, is_registered, nickname
        `,
        [
            matchId,
            teamId,
            identity.userId,
            identity.isRegistered,
            identity.nickname,
        ]
    )

    return insertedPlayer.rows[0]
}

const findMatchPlayerByIdentity = async (client, { matchId, player }) => {
    const identity = mapPlayerIdentity(player)
    const lookup = getPlayerLookupClause(identity)

    const result = await client.query(
        `
        SELECT id, match_id, team_id, user_id, is_registered, nickname, score, lines_cleared, level_reached, result
        FROM match_players
        WHERE match_id = $1 AND ${lookup.clause}
        ORDER BY id DESC
        LIMIT 1
        `,
        [matchId, ...lookup.values]
    )

    return result.rows[0] || null
}

export const createMatchForRoomRepo = async ({ roomId, player }) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const existingMatch = await getLatestMatchByRoomId(client, roomId, { forUpdate: true })

        if (existingMatch) {
            const team = await ensureTeamForMatch(client, existingMatch.id, 1)
            const matchPlayer = await upsertMatchPlayer(client, {
                matchId: existingMatch.id,
                teamId: team.id,
                player,
            })

            await client.query('COMMIT')

            return {
                matchId: existingMatch.id,
                teamId: team.id,
                teamNumber: 1,
                matchPlayerId: matchPlayer.id,
                status: existingMatch.status,
            }
        }

        const matchResult = await client.query(
            `
            INSERT INTO matches (room_id, mode, match_type, status, is_online, counts_for_rating)
            VALUES ($1, $2, $3, 'created', TRUE, FALSE)
            RETURNING id, status
            `,
            [roomId, MATCH_MODE, MATCH_TYPE]
        )

        const match = matchResult.rows[0]
        const team = await ensureTeamForMatch(client, match.id, 1)
        const matchPlayer = await upsertMatchPlayer(client, {
            matchId: match.id,
            teamId: team.id,
            player,
        })

        await client.query('COMMIT')

        return {
            matchId: match.id,
            teamId: team.id,
            teamNumber: 1,
            matchPlayerId: matchPlayer.id,
            status: match.status,
        }
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const attachPlayerToRoomMatchRepo = async ({ roomId, player, teamNumber }) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const match = await getLatestMatchByRoomId(client, roomId, { forUpdate: true })

        if (!match) {
            throw new Error('Match not found for room')
        }

        const team = await ensureTeamForMatch(client, match.id, teamNumber)
        const matchPlayer = await upsertMatchPlayer(client, {
            matchId: match.id,
            teamId: team.id,
            player,
        })

        await client.query('COMMIT')

        return {
            matchId: match.id,
            teamId: team.id,
            teamNumber,
            matchPlayerId: matchPlayer.id,
            status: match.status,
        }
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const markRoomMatchStartedRepo = async ({ roomId }) => {
    const result = await pool.query(
        `
        UPDATE matches
        SET status = 'playing',
            started_at = COALESCE(started_at, NOW()),
            updated_at = NOW()
        WHERE id = (
            SELECT id
            FROM matches
            WHERE room_id = $1
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        )
        RETURNING id, room_id, status, started_at
        `,
        [roomId]
    )

    return result.rows[0] || null
}

export const updateMatchPlayerPerformanceRepo = async ({ matchPlayerId, stats = {}, result }) => {
    const normalizedScore = Number.isFinite(stats.score) ? Math.max(0, Math.floor(stats.score)) : 0
    const normalizedLinesCleared = Number.isFinite(stats.linesCleared) ? Math.max(0, Math.floor(stats.linesCleared)) : 0
    const normalizedLevelReached = Number.isFinite(stats.level) ? Math.max(1, Math.floor(stats.level)) : 1

    const updateResult = await pool.query(
        `
        UPDATE match_players
        SET score = $2,
            lines_cleared = $3,
            level_reached = $4,
            result = COALESCE($5, result)
        WHERE id = $1
        RETURNING id, match_id, team_id, user_id, score, lines_cleared, level_reached, result
        `,
        [matchPlayerId, normalizedScore, normalizedLinesCleared, normalizedLevelReached, result ?? null]
    )

    return updateResult.rows[0] || null
}

export const markRoomMatchFinishedRepo = async ({
    roomId,
    status,
    winnerTeamId = null,
    teams = [],
    players = [],
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const match = await getLatestMatchByRoomId(client, roomId, { forUpdate: true })

        if (!match) {
            throw new Error('Match not found for room')
        }

        for (const team of teams) {
            await client.query(
                `
                UPDATE match_teams
                SET team_score = $2,
                    result = $3
                WHERE id = $1
                `,
                [
                    team.teamId,
                    Number.isFinite(team.teamScore) ? Math.max(0, Math.floor(team.teamScore)) : 0,
                    team.result ?? 'none',
                ]
            )
        }

        for (const player of players) {
            await client.query(
                `
                UPDATE match_players
                SET score = $2,
                    lines_cleared = $3,
                    level_reached = $4,
                    result = $5,
                    left_at = COALESCE($6, left_at)
                WHERE id = $1
                `,
                [
                    player.matchPlayerId,
                    Number.isFinite(player.score) ? Math.max(0, Math.floor(player.score)) : 0,
                    Number.isFinite(player.linesCleared) ? Math.max(0, Math.floor(player.linesCleared)) : 0,
                    Number.isFinite(player.levelReached) ? Math.max(1, Math.floor(player.levelReached)) : 1,
                    player.result ?? 'none',
                    player.leftAt ?? null,
                ]
            )
        }

        const result = await client.query(
            `
            UPDATE matches
            SET status = $2,
                winner_team_id = $3,
                started_at = COALESCE(started_at, NOW()),
                ended_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, room_id, status, winner_team_id, started_at, ended_at
            `,
            [match.id, status, winnerTeamId]
        )

        await client.query('COMMIT')

        return result.rows[0] || null
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const cancelRoomMatchRepo = async ({ roomId }) => {
    const result = await pool.query(
        `
        UPDATE matches
        SET status = 'cancelled',
            ended_at = COALESCE(ended_at, NOW()),
            updated_at = NOW()
        WHERE id = (
            SELECT id
            FROM matches
            WHERE room_id = $1
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        ) AND status IN ('created', 'playing')
        RETURNING id, room_id, status, ended_at
        `,
        [roomId]
    )

    return result.rows[0] || null
}

export const markMatchPlayerLeftRepo = async ({ roomId, player }) => {
    const client = await pool.connect()

    try {
        const match = await getLatestMatchByRoomId(client, roomId)

        if (!match) {
            return null
        }

        const matchPlayer = await findMatchPlayerByIdentity(client, {
            matchId: match.id,
            player,
        })

        if (!matchPlayer) {
            return null
        }

        const result = await client.query(
            `
            UPDATE match_players
            SET left_at = NOW()
            WHERE id = $1
            RETURNING id, match_id, team_id, user_id, nickname, left_at
            `,
            [matchPlayer.id]
        )

        return result.rows[0] || null
    } finally {
        client.release()
    }
}

export const createMatchEventRepo = async ({
    roomId,
    eventType,
    sourcePlayer,
    targetPlayer,
    payload = null,
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const match = await getLatestMatchByRoomId(client, roomId)

        if (!match) {
            throw new Error('Match not found for room')
        }

        const sourceMatchPlayer = sourcePlayer
            ? await findMatchPlayerByIdentity(client, { matchId: match.id, player: sourcePlayer })
            : null

        const targetMatchPlayer = targetPlayer
            ? await findMatchPlayerByIdentity(client, { matchId: match.id, player: targetPlayer })
            : null

        const result = await client.query(
            `
            INSERT INTO match_events (match_id, source_player_id, target_player_id, event_type, payload)
            VALUES ($1, $2, $3, $4, $5::jsonb)
            RETURNING id, match_id, source_player_id, target_player_id, event_type, payload, created_at
            `,
            [
                match.id,
                sourceMatchPlayer?.id || null,
                targetMatchPlayer?.id || null,
                eventType,
                payload ? JSON.stringify(payload) : null,
            ]
        )

        await client.query('COMMIT')

        return result.rows[0]
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}
