import { pool } from '../db/index.js'

const ACTIVE_SESSION_MINUTES = 5

const userSelect = `
    users.id,
    users.username,
    users.avatar_url,
    COALESCE(rank_stats.rank_points, 0)::int AS rank_points,
    COALESCE(rank_stats.mmr, 1000)::int AS mmr,
    COALESCE(rank_stats.wins, 0)::int AS wins,
    COALESCE(rank_stats.losses, 0)::int AS losses,
    COALESCE(rank_stats.total_matches, 0)::int AS total_matches,
    EXISTS (
        SELECT 1
        FROM user_sessions
        WHERE user_sessions.user_id = users.id
            AND user_sessions.status = 'active'
            AND user_sessions.last_seen_at >= NOW() - ($2::int * INTERVAL '1 minute')
    ) AS is_online,
    EXISTS (
        SELECT 1
        FROM game_room_players
        JOIN game_rooms
            ON game_rooms.id = game_room_players.room_id
        WHERE game_room_players.user_id = users.id
            AND game_rooms.status = 'playing'
    ) AS is_in_game
`

export const getFriendsRepo = async (userId) => {
    const result = await pool.query(
        `
        SELECT
            friendships.id AS friendship_id,
            friendships.created_at AS friends_since,
            ${userSelect}
        FROM friendships
        JOIN users
            ON users.id = CASE
                WHEN friendships.requester_id = $1 THEN friendships.addressee_id
                ELSE friendships.requester_id
            END
        LEFT JOIN user_rank_stats AS rank_stats
            ON rank_stats.user_id = users.id
        WHERE friendships.status = 'accepted'
            AND (friendships.requester_id = $1 OR friendships.addressee_id = $1)
        ORDER BY is_online DESC, users.username ASC
        `,
        [userId, ACTIVE_SESSION_MINUTES]
    )

    return result.rows
}

export const getIncomingFriendRequestsRepo = async (userId) => {
    const result = await pool.query(
        `
        SELECT
            friendships.id AS request_id,
            friendships.requested_at,
            ${userSelect}
        FROM friendships
        JOIN users
            ON users.id = friendships.requester_id
        LEFT JOIN user_rank_stats AS rank_stats
            ON rank_stats.user_id = users.id
        WHERE friendships.addressee_id = $1
            AND friendships.status = 'pending'
        ORDER BY friendships.requested_at DESC
        `,
        [userId, ACTIVE_SESSION_MINUTES]
    )

    return result.rows
}

export const getAcceptedFriendIdsRepo = async (userId) => {
    const result = await pool.query(
        `
        SELECT
            CASE
                WHEN requester_id = $1 THEN addressee_id
                ELSE requester_id
            END AS friend_id
        FROM friendships
        WHERE status = 'accepted'
            AND (requester_id = $1 OR addressee_id = $1)
        `,
        [userId]
    )

    return result.rows.map((row) => row.friend_id).filter(Boolean)
}

export const findFriendCandidateByIdRepo = async ({ currentUserId, targetUserId }) => {
    const result = await pool.query(
        `
        SELECT
            ${userSelect},
            friendships.id AS friendship_id,
            friendships.status AS friendship_status,
            friendships.requester_id,
            friendships.addressee_id
        FROM users
        LEFT JOIN user_rank_stats AS rank_stats
            ON rank_stats.user_id = users.id
        LEFT JOIN friendships
            ON LEAST(friendships.requester_id, friendships.addressee_id) = LEAST($1::int, users.id)
            AND GREATEST(friendships.requester_id, friendships.addressee_id) = GREATEST($1::int, users.id)
            AND friendships.status IN ('pending', 'accepted', 'blocked')
        WHERE users.id = $3
            AND users.status = 'active'
        LIMIT 1
        `,
        [currentUserId, ACTIVE_SESSION_MINUTES, targetUserId]
    )

    return result.rows[0] || null
}

export const createFriendRequestRepo = async ({ requesterId, addresseeId }) => {
    const result = await pool.query(
        `
        INSERT INTO friendships (requester_id, addressee_id, status)
        VALUES ($1, $2, 'pending')
        RETURNING id, requester_id, addressee_id, status, requested_at
        `,
        [requesterId, addresseeId]
    )

    return result.rows[0] || null
}

export const respondFriendRequestRepo = async ({ userId, requestId, status }) => {
    const result = await pool.query(
        `
        UPDATE friendships
        SET status = $3,
            responded_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
            AND addressee_id = $2
            AND status = 'pending'
        RETURNING id, requester_id, addressee_id, status, responded_at
        `,
        [requestId, userId, status]
    )

    return result.rows[0] || null
}
