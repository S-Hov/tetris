import { pool } from '../db/index.js'

export const PRIVACY_DEFAULTS = {
    profileVisibility: 'public',
    friendRequestsVisibility: 'public',
    roomInvitesVisibility: 'friends',
    matchInvitesVisibility: 'friends',
    messagesVisibility: 'friends',
    clubInvitesVisibility: 'friends',
}

const mapPrivacyRow = (row = {}) => ({
    profileVisibility: row.profile_visibility || PRIVACY_DEFAULTS.profileVisibility,
    friendRequestsVisibility: row.friend_requests_visibility || PRIVACY_DEFAULTS.friendRequestsVisibility,
    roomInvitesVisibility: row.room_invites_visibility || PRIVACY_DEFAULTS.roomInvitesVisibility,
    matchInvitesVisibility: row.match_invites_visibility || PRIVACY_DEFAULTS.matchInvitesVisibility,
    messagesVisibility: row.messages_visibility || PRIVACY_DEFAULTS.messagesVisibility,
    clubInvitesVisibility: row.club_invites_visibility || PRIVACY_DEFAULTS.clubInvitesVisibility,
})

export const getUserPrivacySettingsRepo = async (userId) => {
    const result = await pool.query(
        `
        INSERT INTO user_privacy_settings (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING *
        `,
        [userId]
    )

    return mapPrivacyRow(result.rows[0])
}

export const updateUserPrivacySettingsRepo = async ({ userId, updates }) => {
    const columnByField = {
        profileVisibility: 'profile_visibility',
        friendRequestsVisibility: 'friend_requests_visibility',
        roomInvitesVisibility: 'room_invites_visibility',
        matchInvitesVisibility: 'match_invites_visibility',
        messagesVisibility: 'messages_visibility',
        clubInvitesVisibility: 'club_invites_visibility',
    }
    const entries = Object.entries(updates).filter(([field]) => columnByField[field])

    if (!entries.length) {
        return await getUserPrivacySettingsRepo(userId)
    }

    await pool.query(
        `
        INSERT INTO user_privacy_settings (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
        `,
        [userId]
    )

    const columns = entries.map(([field], index) => `${columnByField[field]} = $${index + 2}`)
    const values = entries.map(([, value]) => value)
    const result = await pool.query(
        `
        UPDATE user_privacy_settings
        SET ${columns.join(', ')},
            updated_at = NOW()
        WHERE user_id = $1
        RETURNING *
        `,
        [userId, ...values]
    )

    return mapPrivacyRow(result.rows[0])
}

export const getUserActionContextRepo = async ({ viewerId, targetUserId }) => {
    const result = await pool.query(
        `
        SELECT
            users.id,
            users.username,
            users.avatar_url,
            users.status,
            COALESCE(privacy.profile_visibility, 'public') AS profile_visibility,
            COALESCE(privacy.friend_requests_visibility, 'public') AS friend_requests_visibility,
            COALESCE(privacy.room_invites_visibility, 'friends') AS room_invites_visibility,
            COALESCE(privacy.match_invites_visibility, 'friends') AS match_invites_visibility,
            COALESCE(privacy.messages_visibility, 'friends') AS messages_visibility,
            COALESCE(privacy.club_invites_visibility, 'friends') AS club_invites_visibility,
            relationship.status AS relationship_status,
            EXISTS (
                SELECT 1
                FROM user_sessions
                WHERE user_sessions.user_id = users.id
                    AND user_sessions.status = 'active'
                    AND user_sessions.last_seen_at >= NOW() - INTERVAL '5 minutes'
            ) AS is_online,
            EXISTS (
                SELECT 1
                FROM game_room_players
                JOIN game_rooms ON game_rooms.id = game_room_players.room_id
                WHERE game_room_players.user_id = users.id
                    AND game_rooms.status = 'playing'
            ) AS is_in_game,
            EXISTS (
                SELECT 1
                FROM friendships viewer_friendship
                JOIN friendships target_friendship
                    ON CASE
                        WHEN viewer_friendship.requester_id = $1 THEN viewer_friendship.addressee_id
                        ELSE viewer_friendship.requester_id
                    END = CASE
                        WHEN target_friendship.requester_id = $2 THEN target_friendship.addressee_id
                        ELSE target_friendship.requester_id
                    END
                WHERE viewer_friendship.status = 'accepted'
                    AND target_friendship.status = 'accepted'
                    AND (viewer_friendship.requester_id = $1 OR viewer_friendship.addressee_id = $1)
                    AND (target_friendship.requester_id = $2 OR target_friendship.addressee_id = $2)
            ) AS has_mutual_friend
        FROM users
        LEFT JOIN user_privacy_settings AS privacy
            ON privacy.user_id = users.id
        LEFT JOIN friendships AS relationship
            ON LEAST(relationship.requester_id, relationship.addressee_id) = LEAST($1::int, users.id)
            AND GREATEST(relationship.requester_id, relationship.addressee_id) = GREATEST($1::int, users.id)
            AND relationship.status IN ('pending', 'accepted', 'blocked')
        WHERE users.id = $2
            AND users.status = 'active'
        LIMIT 1
        `,
        [viewerId, targetUserId]
    )

    return result.rows[0] || null
}
