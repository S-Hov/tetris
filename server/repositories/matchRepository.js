import { pool } from '../db/index.js'
import { forbidden, notFound } from '../helpers/error.helper.js'
import { applyRankedMatchResultRepo } from './rankRepository.js'

const MATCH_MODE = '1v1'
const MATCH_TYPE = 'private'
const MATCH_TYPES = new Set(['ranked', 'casual', 'private'])
const SOLO_MATCH_MODE = 'solo'
const SOLO_MATCH_TYPE = MATCH_TYPE

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

export const createMatchForRoomRepo = async ({
    roomId,
    player,
    matchMode = MATCH_MODE,
    matchType = MATCH_TYPE,
    countsForRating = false,
}) => {
    const client = await pool.connect()
    const normalizedMatchType = MATCH_TYPES.has(matchType) ? matchType : MATCH_TYPE

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
            VALUES ($1, $2, $3, 'created', TRUE, $4)
            RETURNING id, status
            `,
            [roomId, matchMode || MATCH_MODE, normalizedMatchType, Boolean(countsForRating)]
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

        const ratingUpdates = await applyRankedMatchResultRepo(client, match.id)

        await client.query('COMMIT')

        const finishedMatch = result.rows[0] || null

        return finishedMatch
            ? {
                ...finishedMatch,
                ratingUpdates,
            }
            : null
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

export const getUserSoloRecordRepo = async ({ userId }) => {
    const result = await pool.query(
        `
        SELECT COALESCE(MAX(match_players.score), 0)::int AS record
        FROM match_players
        JOIN matches ON matches.id = match_players.match_id
        WHERE match_players.user_id = $1
          AND matches.mode = $2
          AND matches.status = 'finished'
        `,
        [userId, SOLO_MATCH_MODE]
    )

    return Number(result.rows[0]?.record) || 0
}

export const createSoloRecordMatchRepo = async ({ userId, username, stats }) => {
    const client = await pool.connect()
    const score = Number.isFinite(stats.score) ? Math.max(0, Math.floor(stats.score)) : 0
    const linesCleared = Number.isFinite(stats.linesCleared) ? Math.max(0, Math.floor(stats.linesCleared)) : 0
    const levelReached = Number.isFinite(stats.levelReached) ? Math.max(1, Math.floor(stats.levelReached)) : 1

    try {
        await client.query('BEGIN')

        await client.query(
            `
            INSERT INTO user_rank_stats (user_id)
            VALUES ($1)
            ON CONFLICT (user_id) DO NOTHING
            `,
            [userId]
        )

        await client.query(
            `
            SELECT best_solo_score
            FROM user_rank_stats
            WHERE user_id = $1
            FOR UPDATE
            `,
            [userId]
        )
        const matchesRecordResult = await client.query(
            `
            SELECT COALESCE(MAX(match_players.score), 0)::int AS record
            FROM match_players
            JOIN matches ON matches.id = match_players.match_id
            WHERE match_players.user_id = $1
              AND matches.mode = $2
              AND matches.status = 'finished'
            `,
            [userId, SOLO_MATCH_MODE]
        )
        const previousRecord = Number(matchesRecordResult.rows[0]?.record) || 0

        if (score <= previousRecord) {
            await client.query('COMMIT')

            return {
                saved: false,
                previousRecord,
                record: previousRecord,
                matchId: null,
            }
        }

        const matchResult = await client.query(
            `
            INSERT INTO matches (room_id, mode, match_type, status, is_online, counts_for_rating, started_at, ended_at)
            VALUES ($1, $2, $3, 'finished', FALSE, FALSE, NOW(), NOW())
            RETURNING id
            `,
            [`solo-${userId}-${Date.now()}`, SOLO_MATCH_MODE, SOLO_MATCH_TYPE]
        )
        const match = matchResult.rows[0]
        const team = await ensureTeamForMatch(client, match.id, 1)

        await client.query(
            `
            UPDATE match_teams
            SET team_score = $2,
                result = 'lose'
            WHERE id = $1
            `,
            [team.id, score]
        )

        await client.query(
            `
            INSERT INTO match_players (
                match_id,
                team_id,
                user_id,
                is_registered,
                nickname,
                score,
                lines_cleared,
                level_reached,
                result
            )
            VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7, 'lose')
            `,
            [match.id, team.id, userId, username || 'Player', score, linesCleared, levelReached]
        )

        await client.query(
            `
            UPDATE user_rank_stats
            SET best_solo_score = $2,
                updated_at = NOW()
            WHERE user_id = $1
            `,
            [userId, score]
        )

        await client.query('COMMIT')

        return {
            saved: true,
            previousRecord,
            record: score,
            matchId: match.id,
        }
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const getUserMatchesRepo = async ({
    userId,
    page = 1,
    limit = 10,
    result = 'all',
    mode = 'all',
    search = '',
}) => {
    const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1
    const normalizedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 10
    const offset = (normalizedPage - 1) * normalizedLimit

    const values = [userId]
    const filters = [
        'self_player.user_id = $1',
        `matches.status IN ('finished', 'abandoned')`,
    ]

    if (result === 'win' || result === 'loss') {
        values.push(result === 'win' ? 'win' : 'lose')
        filters.push(`self_player.result = $${values.length}`)
    }

    if (mode && mode !== 'all') {
        values.push(mode)
        filters.push(`matches.mode = $${values.length}`)
    }

    const normalizedSearch = String(search || '').trim()

    if (normalizedSearch) {
        values.push(`%${normalizedSearch.toLowerCase()}%`)
        filters.push(`(
            LOWER(COALESCE(opponent_data.opponent_label, '')) LIKE $${values.length}
            OR LOWER(COALESCE(self_player.nickname, '')) LIKE $${values.length}
            OR LOWER(COALESCE(matches.mode, '')) LIKE $${values.length}
        )`)
    }

    const whereClause = filters.join('\n          AND ')

    const summaryResult = await pool.query(
        `
        SELECT
            COUNT(*)::int AS total_matches,
            COUNT(*) FILTER (WHERE self_player.result = 'win')::int AS wins,
            COUNT(*) FILTER (WHERE self_player.result = 'lose')::int AS losses,
            COALESCE(AVG(self_player.lines_cleared), 0)::float AS avg_lines
        FROM match_players AS self_player
        JOIN matches ON matches.id = self_player.match_id
        LEFT JOIN LATERAL (
            SELECT
                CASE
                    WHEN COUNT(*) FILTER (WHERE opponent_player.team_id IS DISTINCT FROM self_player.team_id) > 1
                        THEN CONCAT('Команда ', COALESCE(MAX(opponent_team.team_number), 2))
                    ELSE COALESCE(
                        MAX(opponent_user.username),
                        MAX(opponent_player.nickname),
                        'Неизвестный соперник'
                    )
                END AS opponent_label
            FROM match_players AS opponent_player
            LEFT JOIN users AS opponent_user
                ON opponent_user.id = opponent_player.user_id
            LEFT JOIN match_teams AS opponent_team
                ON opponent_team.id = opponent_player.team_id
            WHERE opponent_player.match_id = self_player.match_id
                AND opponent_player.id <> self_player.id
                AND opponent_player.team_id IS DISTINCT FROM self_player.team_id
        ) AS opponent_data ON TRUE
        WHERE ${whereClause}
        `,
        values
    )

    const pagedValues = [...values, normalizedLimit, offset]
    const matchesResult = await pool.query(
        `
        SELECT
            matches.id,
            matches.room_id,
            matches.mode,
            matches.match_type,
            matches.status,
            matches.started_at,
            matches.ended_at,
            matches.created_at,
            self_player.result,
            self_player.score,
            self_player.lines_cleared,
            self_player.level_reached,
            self_player.nickname AS self_nickname,
            self_team.team_number AS self_team_number,
            self_team.team_score AS self_team_score,
            opponent_data.opponent_label,
            opponent_data.opponent_team_number,
            opponent_data.opponent_team_score,
            COUNT(*) OVER()::int AS total_count
        FROM match_players AS self_player
        JOIN matches ON matches.id = self_player.match_id
        LEFT JOIN match_teams AS self_team
            ON self_team.id = self_player.team_id
        LEFT JOIN LATERAL (
            SELECT
                CASE
                    WHEN COUNT(*) FILTER (WHERE opponent_player.team_id IS DISTINCT FROM self_player.team_id) > 1
                        THEN CONCAT('Команда ', COALESCE(MAX(opponent_team.team_number), 2))
                    ELSE COALESCE(
                        MAX(opponent_user.username),
                        MAX(opponent_player.nickname),
                        'Неизвестный соперник'
                    )
                END AS opponent_label,
                MAX(opponent_team.team_number) AS opponent_team_number,
                COALESCE(MAX(opponent_team.team_score), 0) AS opponent_team_score
            FROM match_players AS opponent_player
            LEFT JOIN users AS opponent_user
                ON opponent_user.id = opponent_player.user_id
            LEFT JOIN match_teams AS opponent_team
                ON opponent_team.id = opponent_player.team_id
            WHERE opponent_player.match_id = self_player.match_id
                AND opponent_player.id <> self_player.id
                AND opponent_player.team_id IS DISTINCT FROM self_player.team_id
        ) AS opponent_data ON TRUE
        WHERE ${whereClause}
        ORDER BY COALESCE(matches.ended_at, matches.created_at) DESC, matches.id DESC
        LIMIT $${pagedValues.length - 1}
        OFFSET $${pagedValues.length}
        `,
        pagedValues
    )

    return {
        summary: summaryResult.rows[0] || null,
        matches: matchesResult.rows,
        totalCount: matchesResult.rows[0]?.total_count || 0,
        page: normalizedPage,
        limit: normalizedLimit,
    }
}

export const getUserMatchDetailsRepo = async ({ userId, matchId }) => {
    const membershipResult = await pool.query(
        `
        SELECT
            matches.id,
            matches.room_id,
            matches.mode,
            matches.match_type,
            matches.status,
            matches.is_online,
            matches.counts_for_rating,
            matches.winner_team_id,
            matches.started_at,
            matches.ended_at,
            matches.created_at,
            matches.updated_at,
            self_player.id AS self_player_id,
            self_player.result AS self_result,
            self_player.team_id AS self_team_id
        FROM matches
        JOIN match_players AS self_player
            ON self_player.match_id = matches.id
        WHERE matches.id = $1
            AND self_player.user_id = $2
        LIMIT 1
        `,
        [matchId, userId]
    )

    const match = membershipResult.rows[0]

    if (!match) {
        const existsResult = await pool.query(
            'SELECT id FROM matches WHERE id = $1 LIMIT 1',
            [matchId]
        )

        if (!existsResult.rows[0]) {
            throw notFound('Матч не найден')
        }

        throw forbidden('У вас нет доступа к этому матчу')
    }

    const [teamsResult, playersResult, eventsResult] = await Promise.all([
        pool.query(
            `
            SELECT id, match_id, team_number, team_score, result
            FROM match_teams
            WHERE match_id = $1
            ORDER BY team_number ASC, id ASC
            `,
            [matchId]
        ),
        pool.query(
            `
            SELECT
                match_players.id,
                match_players.match_id,
                match_players.team_id,
                match_players.user_id,
                match_players.is_registered,
                match_players.nickname,
                match_players.score,
                match_players.lines_cleared,
                match_players.level_reached,
                match_players.result,
                match_players.left_at,
                users.username
            FROM match_players
            LEFT JOIN users ON users.id = match_players.user_id
            WHERE match_players.match_id = $1
            ORDER BY match_players.team_id ASC, match_players.id ASC
            `,
            [matchId]
        ),
        pool.query(
            `
            SELECT
                match_events.id,
                match_events.event_type,
                match_events.payload,
                match_events.created_at,
                source_player.id AS source_player_id,
                source_player.nickname AS source_nickname,
                source_user.username AS source_username,
                target_player.id AS target_player_id,
                target_player.nickname AS target_nickname,
                target_user.username AS target_username
            FROM match_events
            LEFT JOIN match_players AS source_player
                ON source_player.id = match_events.source_player_id
            LEFT JOIN users AS source_user
                ON source_user.id = source_player.user_id
            LEFT JOIN match_players AS target_player
                ON target_player.id = match_events.target_player_id
            LEFT JOIN users AS target_user
                ON target_user.id = target_player.user_id
            WHERE match_events.match_id = $1
            ORDER BY match_events.created_at ASC, match_events.id ASC
            `,
            [matchId]
        ),
    ])

    return {
        match,
        teams: teamsResult.rows,
        players: playersResult.rows,
        events: eventsResult.rows,
    }
}
