import { pool } from '../db/index.js'

export const registerUserRepo = async (username, email, passwordHash, roleId, status = 'pending_verification') => {
    const result = await pool.query(
        `
        INSERT INTO users (role_id, username, email, password_hash, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, status
        `,
        [roleId, username, email, passwordHash, status]
    )

    return result.rows[0]
}

export const checkEmailRepo = async (email) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
    )

    if (result.rows.length > 0) return true
    else return false
}


export const loginUserRepo = async (email) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
    )

    return result.rows[0]
}

export const getUserRepo = async (id) => {
    const result = await pool.query(
        `
        SELECT
            users.id,
            users.username,
            users.email,
            users.avatar_url,
            users.status,
            users.role_id,
            roles.key AS role,
            roles.name AS role_name,
            users.created_at,
            users.last_login_at
        FROM users
        JOIN roles ON roles.id = users.role_id
        WHERE users.id = $1
        `,
        [id]
    )

    return result.rows[0]
}

export const getUserAuthByIdRepo = async (id) => {
    const result = await pool.query(
        `
        SELECT id, username, email, password_hash, status
        FROM users
        WHERE id = $1
        `,
        [id]
    )

    return result.rows[0] || null
}

export const getUserMatchStatsRepo = async (userId) => {
    const result = await pool.query(
        `
        SELECT
            COUNT(*) FILTER (WHERE matches.status IN ('finished', 'abandoned'))::int AS total_games,
            COUNT(*) FILTER (
                WHERE matches.status IN ('finished', 'abandoned')
                    AND match_players.result = 'win'
            )::int AS wins
        FROM match_players
        JOIN matches ON matches.id = match_players.match_id
        WHERE match_players.user_id = $1
        `,
        [userId]
    )

    return result.rows[0] || {
        total_games: 0,
        wins: 0,
    }
}

export const getRecentUserMatchesRepo = async (userId, limit = 6) => {
    const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 6

    const result = await pool.query(
        `
        SELECT
            matches.id,
            matches.mode,
            matches.status,
            COALESCE(matches.ended_at, matches.created_at) AS played_at,
            self_player.result,
            self_player.score,
            self_team.team_score AS self_team_score,
            self_player.lines_cleared,
            self_player.level_reached,
            opponent_data.opponent_label,
            opponent_data.opponent_team_score
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
        WHERE self_player.user_id = $1
            AND matches.status IN ('finished', 'abandoned')
        ORDER BY COALESCE(matches.ended_at, matches.created_at) DESC, matches.id DESC
        LIMIT $2
        `,
        [userId, normalizedLimit]
    )

    return result.rows
}

export const getSocketUserRepo = async (id) => {
    const result = await pool.query(
        `
        SELECT
            users.id,
            users.username,
            users.email,
            users.avatar_url,
            roles.key AS role,
            COALESCE(user_rank_stats.rank_points, 0) AS rank_points,
            COALESCE(user_rank_stats.mmr, 1000) AS mmr,
            COALESCE(user_rank_stats.wins, 0) AS wins,
            COALESCE(user_rank_stats.losses, 0) AS losses,
            COALESCE(user_rank_stats.draws, 0) AS draws,
            COALESCE(user_rank_stats.total_matches, 0) AS total_matches
        FROM users
        JOIN roles ON roles.id = users.role_id
        LEFT JOIN user_rank_stats ON user_rank_stats.user_id = users.id
        WHERE users.id = $1
        LIMIT 1
        `,
        [id]
    )

    return result.rows[0] || null
}

export const updateUserProfileRepo = async ({ userId, username }) => {
    const result = await pool.query(
        `
        UPDATE users
        SET username = $2
        WHERE id = $1
        RETURNING id, username, email, avatar_url, status, role_id, created_at, last_login_at
        `,
        [userId, username]
    )

    return result.rows[0] || null
}

export const updateUserAvatarRepo = async ({ userId, avatarUrl }) => {
    const result = await pool.query(
        `
        UPDATE users
        SET avatar_url = $2
        WHERE id = $1
        RETURNING id, username, email, avatar_url, status, role_id, created_at, last_login_at
        `,
        [userId, avatarUrl]
    )

    return result.rows[0] || null
}

export const registerUserWithVerificationRepo = async ({
    username,
    email,
    passwordHash,
    roleId,
    verificationCodeHash,
    expiresAt,
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const userResult = await client.query(
            `
            INSERT INTO users (role_id, username, email, password_hash, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, email, status
            `,
            [roleId, username, email, passwordHash, 'pending_verification']
        )

        const user = userResult.rows[0]

        await client.query(
            `
            INSERT INTO email_verifications (user_id, email, code_hash, status, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [user.id, email, verificationCodeHash, 'pending', expiresAt]
        )

        await client.query(
            `
            INSERT INTO user_rank_stats (user_id, rank_points, mmr, wins, losses)
            VALUES ($1, 0, 1000, 0, 0)
            ON CONFLICT (user_id) DO NOTHING
            `,
            [user.id]
        )

        await client.query('COMMIT')

        return user
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const getUserByEmailRepo = async (email) => {
    const result = await pool.query(
        'SELECT id, username, email, status FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
    )

    return result.rows[0]
}

export const changePendingUserEmailRepo = async ({
    userId,
    currentEmail,
    nextEmail,
    verificationCodeHash,
    expiresAt,
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const userResult = await client.query(
            `
            UPDATE users
            SET email = $3, status = 'pending_verification', email_verified_at = NULL
            WHERE id = $1 AND LOWER(email) = LOWER($2) AND status = 'pending_verification'
            RETURNING id, username, email, status
            `,
            [userId, currentEmail, nextEmail]
        )

        const user = userResult.rows[0]

        if (!user) {
            await client.query('ROLLBACK')
            return null
        }

        await client.query(
            `
            UPDATE email_verifications
            SET status = 'expired'
            WHERE user_id = $1 AND status = 'pending'
            `,
            [userId]
        )

        await client.query(
            `
            INSERT INTO email_verifications (user_id, email, code_hash, status, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [userId, nextEmail, verificationCodeHash, 'pending', expiresAt]
        )

        await client.query('COMMIT')

        return user
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const getUserRankStatsRepo = async (userId) => {
    const result = await pool.query(
        `
        INSERT INTO user_rank_stats (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING user_id, rank_points, mmr, wins, losses, draws, best_solo_score, total_matches
        `,
        [userId]
    )

    if (result.rows[0]) {
        return result.rows[0]
    }

    const existingResult = await pool.query(
        `
        SELECT user_id, rank_points, mmr, wins, losses, draws, best_solo_score, total_matches
        FROM user_rank_stats
        WHERE user_id = $1
        `,
        [userId]
    )

    return existingResult.rows[0] || null
}

export const getLatestPendingVerificationByEmailRepo = async (email) => {
    const result = await pool.query(
        `
        SELECT id, user_id, email, code_hash, status, expires_at
        FROM email_verifications
        WHERE LOWER(email) = LOWER($1) AND status = 'pending'
        ORDER BY expires_at DESC
        LIMIT 1
        `,
        [email]
    )

    return result.rows[0]
}

export const createEmailVerificationRepo = async ({
    userId,
    email,
    verificationCodeHash,
    expiresAt,
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        await client.query(
            `
            UPDATE email_verifications
            SET status = 'expired'
            WHERE LOWER(email) = LOWER($1) AND status = 'pending'
            `,
            [email]
        )

        const result = await client.query(
            `
            INSERT INTO email_verifications (user_id, email, code_hash, status, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, email, status, expires_at
            `,
            [userId, email, verificationCodeHash, 'pending', expiresAt]
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

export const markEmailVerifiedRepo = async ({ userId, verificationId }) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        await client.query(
            `
            UPDATE email_verifications
            SET status = 'used', verified_at = NOW()
            WHERE id = $1
            `,
            [verificationId]
        )

        await client.query(
            `
            UPDATE email_verifications
            SET status = 'expired'
            WHERE user_id = $1 AND status = 'pending' AND id <> $2
            `,
            [userId, verificationId]
        )

        const userResult = await client.query(
            `
            UPDATE users
            SET status = 'active', email_verified_at = NOW()
            WHERE id = $1
            RETURNING id, username, email, status
            `,
            [userId]
        )

        await client.query('COMMIT')

        return userResult.rows[0]
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const updateUserLastLoginRepo = async (id) => {
    const result = await pool.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING id, username, email, status',
        [id]
    )

    return result.rows[0] || null
}

export const updateUserPasswordRepo = async ({ userId, passwordHash }) => {
    const result = await pool.query(
        `
        UPDATE users
        SET password_hash = $2
        WHERE id = $1
        RETURNING id, username, email, avatar_url, status, role_id, created_at, last_login_at
        `,
        [userId, passwordHash]
    )

    return result.rows[0] || null
}

export const expireEmailVerificationRepo = async (verificationId) => {
    const result = await pool.query(
        `
        UPDATE email_verifications
        SET status = 'expired'
        WHERE id = $1 AND status = 'pending'
        RETURNING id, user_id, email, status, expires_at
        `,
        [verificationId]
    )

    return result.rows[0] || null
}

export const createAuthLogRepo = async ({
    userId = null,
    eventType,
    ipAddress = null,
    userAgent = null,
}) => {
    const result = await pool.query(
        `
        INSERT INTO auth_logs (user_id, event_type, ip_address, user_agent)
        VALUES ($1, $2, NULLIF($3, '')::inet, $4)
        RETURNING id, user_id, event_type, ip_address, user_agent, created_at
        `,
        [userId, eventType, ipAddress, userAgent]
    )

    return result.rows[0]
}
