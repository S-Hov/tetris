import { pool } from '../db/index.js'

const SORT_EXPRESSIONS = {
    rating: 'rank_stats.rank_points DESC, rank_stats.wins DESC, rank_stats.total_matches DESC, rank_stats.mmr DESC',
    wins: 'rank_stats.wins DESC, rank_stats.rank_points DESC, win_rate DESC, rank_stats.total_matches DESC',
    winRate: 'win_rate DESC, rank_stats.total_matches DESC, rank_stats.rank_points DESC',
    games: 'rank_stats.total_matches DESC, rank_stats.rank_points DESC, rank_stats.wins DESC',
    mmr: 'rank_stats.mmr DESC, rank_stats.rank_points DESC, rank_stats.wins DESC',
    bestSolo: 'rank_stats.best_solo_score DESC, rank_stats.rank_points DESC, rank_stats.wins DESC',
}

export const getLeaderboardRepo = async ({
    sort = 'rating',
    limit = 50,
}) => {
    const orderBy = SORT_EXPRESSIONS[sort] ?? SORT_EXPRESSIONS.rating
    const normalizedLimit = Number.isInteger(limit) && limit > 0
        ? Math.min(limit, 100)
        : 50

    const result = await pool.query(
        `
        WITH ranked_players AS (
            SELECT
                users.id,
                users.username,
                users.email,
                users.avatar_url,
                users.created_at,
                COALESCE(rank_stats.rank_points, 0) AS rank_points,
                COALESCE(rank_stats.mmr, 1000) AS mmr,
                COALESCE(rank_stats.wins, 0) AS wins,
                COALESCE(rank_stats.losses, 0) AS losses,
                COALESCE(rank_stats.draws, 0) AS draws,
                COALESCE(rank_stats.best_solo_score, 0) AS best_solo_score,
                COALESCE(rank_stats.total_matches, 0) AS total_matches,
                COALESCE(rank_stats.updated_at, users.created_at) AS updated_at,
                CASE
                    WHEN COALESCE(rank_stats.total_matches, 0) > 0
                        THEN ROUND((rank_stats.wins::numeric / rank_stats.total_matches::numeric) * 100, 1)
                    ELSE 0
                END AS win_rate
            FROM users
            LEFT JOIN user_rank_stats AS rank_stats
                ON rank_stats.user_id = users.id
            WHERE users.status = 'active'
        )
        SELECT
            ROW_NUMBER() OVER (ORDER BY ${orderBy}, id ASC)::int AS rank,
            id,
            username,
            email,
            avatar_url,
            created_at,
            rank_points,
            mmr,
            wins,
            losses,
            draws,
            best_solo_score,
            total_matches,
            win_rate,
            updated_at AS last_played_at
        FROM ranked_players AS rank_stats
        ORDER BY ${orderBy}, id ASC
        LIMIT $1
        `,
        [normalizedLimit]
    )

    return result.rows
}
