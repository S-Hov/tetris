import { pool } from '../db/index.js'

export const getPublicStatsRepo = async ({ periodDays }) => {
    const result = await pool.query(
        `
        SELECT
            COUNT(*) FILTER (
                WHERE matches.status = 'finished'
                    AND COALESCE(matches.ended_at, matches.created_at) >= NOW() - ($1::int * INTERVAL '1 day')
            )::int AS recent_matches,
            COUNT(*) FILTER (WHERE matches.status = 'finished')::int AS total_matches,
            COALESCE((
                SELECT COUNT(*)::int
                FROM users
                WHERE users.status = 'active'
            ), 0) AS rating_players,
            COALESCE((
                SELECT MAX(match_players.score)::int
                FROM match_players
                JOIN matches AS player_matches ON player_matches.id = match_players.match_id
                WHERE player_matches.status = 'finished'
            ), 0) AS arena_record
        FROM matches
        `,
        [periodDays]
    )

    return result.rows[0] || null
}
