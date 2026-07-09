import { pool } from '../db/index.js'

const DIRECT_CONVERSATION_SELECT = `
    SELECT
        chat_conversations.id,
        chat_conversations.type,
        chat_conversations.status,
        chat_conversations.created_by_user_id,
        chat_conversations.metadata,
        chat_conversations.created_at,
        chat_conversations.updated_at
    FROM chat_direct_conversations
    JOIN chat_conversations ON chat_conversations.id = chat_direct_conversations.conversation_id
    WHERE chat_direct_conversations.user_low_id = $1
        AND chat_direct_conversations.user_high_id = $2
    LIMIT 1
`

const getDirectPair = (leftUserId, rightUserId) => ({
    userLowId: Math.min(leftUserId, rightUserId),
    userHighId: Math.max(leftUserId, rightUserId),
})

export const getChatUserByIdRepo = async (userId) => {
    const result = await pool.query(
        `
        SELECT id, username, avatar_url, status
        FROM users
        WHERE id = $1 AND status = 'active'
        LIMIT 1
        `,
        [userId]
    )

    return result.rows[0] || null
}

export const getDirectConversationRepo = async ({ leftUserId, rightUserId }) => {
    const { userLowId, userHighId } = getDirectPair(leftUserId, rightUserId)
    const result = await pool.query(DIRECT_CONVERSATION_SELECT, [userLowId, userHighId])

    return result.rows[0] || null
}

export const getOrCreateDirectConversationRepo = async ({ creatorUserId, targetUserId }) => {
    const { userLowId, userHighId } = getDirectPair(creatorUserId, targetUserId)
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const existingResult = await client.query(DIRECT_CONVERSATION_SELECT, [userLowId, userHighId])
        const existingConversation = existingResult.rows[0] || null

        if (existingConversation) {
            await client.query('COMMIT')
            return existingConversation
        }

        const conversationResult = await client.query(
            `
            INSERT INTO chat_conversations (type, status, created_by_user_id)
            VALUES ('direct', 'active', $1)
            RETURNING id, type, status, created_by_user_id, metadata, created_at, updated_at
            `,
            [creatorUserId]
        )
        const conversation = conversationResult.rows[0]

        await client.query(
            `
            INSERT INTO chat_direct_conversations (conversation_id, user_low_id, user_high_id)
            VALUES ($1, $2, $3)
            `,
            [conversation.id, userLowId, userHighId]
        )

        await client.query(
            `
            INSERT INTO chat_conversation_members (conversation_id, user_id, role)
            VALUES
                ($1, $2, 'member'),
                ($1, $3, 'member')
            ON CONFLICT (conversation_id, user_id) DO NOTHING
            `,
            [conversation.id, userLowId, userHighId]
        )

        await client.query('COMMIT')

        return conversation
    } catch (error) {
        await client.query('ROLLBACK')

        if (error?.code === '23505') {
            const result = await pool.query(DIRECT_CONVERSATION_SELECT, [userLowId, userHighId])
            return result.rows[0] || null
        }

        throw error
    } finally {
        client.release()
    }
}

export const getConversationMemberRepo = async ({ conversationId, userId }) => {
    const result = await pool.query(
        `
        SELECT id, conversation_id, user_id, role, status, last_read_message_id, last_read_at, muted_until, archived_at
        FROM chat_conversation_members
        WHERE conversation_id = $1 AND user_id = $2 AND status = 'active'
        LIMIT 1
        `,
        [conversationId, userId]
    )

    return result.rows[0] || null
}

export const getConversationByIdForUserRepo = async ({ conversationId, userId }) => {
    const result = await pool.query(
        `
        SELECT
            chat_conversations.id,
            chat_conversations.type,
            chat_conversations.status,
            chat_conversations.created_by_user_id,
            chat_conversations.metadata,
            chat_conversations.created_at,
            chat_conversations.updated_at,
            chat_conversation_members.last_read_message_id,
            chat_conversation_members.last_read_at
        FROM chat_conversations
        JOIN chat_conversation_members
            ON chat_conversation_members.conversation_id = chat_conversations.id
        WHERE chat_conversations.id = $1
            AND chat_conversation_members.user_id = $2
            AND chat_conversation_members.status = 'active'
        LIMIT 1
        `,
        [conversationId, userId]
    )

    return result.rows[0] || null
}

export const getConversationParticipantsRepo = async (conversationId) => {
    const result = await pool.query(
        `
        SELECT
            chat_conversation_members.user_id,
            chat_conversation_members.last_read_message_id,
            chat_conversation_members.last_read_at,
            users.username,
            users.avatar_url
        FROM chat_conversation_members
        JOIN users ON users.id = chat_conversation_members.user_id
        WHERE chat_conversation_members.conversation_id = $1
            AND chat_conversation_members.status = 'active'
        ORDER BY chat_conversation_members.id ASC
        `,
        [conversationId]
    )

    return result.rows
}

export const getUserConversationsRepo = async ({ userId, limit, cursor }) => {
    const values = [userId, limit]
    const cursorCondition = cursor
        ? 'AND chat_conversations.updated_at < $3::timestamp'
        : ''

    if (cursor) {
        values.push(cursor)
    }

    const result = await pool.query(
        `
        SELECT
            chat_conversations.id,
            chat_conversations.type,
            chat_conversations.status,
            chat_conversations.created_at,
            chat_conversations.updated_at,
            self_member.last_read_message_id,
            self_member.last_read_at,
            other_member.user_id AS other_user_id,
            other_user.username AS other_username,
            other_user.avatar_url AS other_avatar_url,
            last_message.id AS last_message_id,
            last_message.sender_user_id AS last_message_sender_user_id,
            last_message.message_type AS last_message_type,
            last_message.body_ciphertext AS last_message_body_ciphertext,
            last_message.body_iv AS last_message_body_iv,
            last_message.body_auth_tag AS last_message_body_auth_tag,
            last_message.status AS last_message_status,
            last_message.created_at AS last_message_created_at,
            COUNT(unread_messages.id)::int AS unread_count
        FROM chat_conversation_members AS self_member
        JOIN chat_conversations ON chat_conversations.id = self_member.conversation_id
        LEFT JOIN chat_conversation_members AS other_member
            ON other_member.conversation_id = chat_conversations.id
            AND other_member.user_id <> self_member.user_id
            AND other_member.status = 'active'
        LEFT JOIN users AS other_user ON other_user.id = other_member.user_id
        LEFT JOIN LATERAL (
            SELECT *
            FROM chat_messages
            WHERE chat_messages.conversation_id = chat_conversations.id
                AND chat_messages.status <> 'deleted'
            ORDER BY chat_messages.created_at DESC, chat_messages.id DESC
            LIMIT 1
        ) AS last_message ON TRUE
        LEFT JOIN chat_messages AS unread_messages
            ON unread_messages.conversation_id = chat_conversations.id
            AND unread_messages.sender_user_id <> $1
            AND unread_messages.status <> 'deleted'
            AND (
                self_member.last_read_message_id IS NULL
                OR unread_messages.id > self_member.last_read_message_id
            )
        WHERE self_member.user_id = $1
            AND self_member.status = 'active'
            ${cursorCondition}
        GROUP BY
            chat_conversations.id,
            self_member.last_read_message_id,
            self_member.last_read_at,
            other_member.user_id,
            other_user.username,
            other_user.avatar_url,
            last_message.id,
            last_message.sender_user_id,
            last_message.message_type,
            last_message.body_ciphertext,
            last_message.body_iv,
            last_message.body_auth_tag,
            last_message.status,
            last_message.created_at
        ORDER BY chat_conversations.updated_at DESC, chat_conversations.id DESC
        LIMIT $2
        `,
        values
    )

    return result.rows
}

export const getConversationMessagesRepo = async ({ conversationId, beforeMessageId, limit }) => {
    const values = [conversationId, limit]
    const beforeCondition = beforeMessageId ? 'AND id < $3' : ''

    if (beforeMessageId) {
        values.push(beforeMessageId)
    }

    const result = await pool.query(
        `
        SELECT
            id,
            conversation_id,
            sender_user_id,
            message_type,
            body_ciphertext,
            body_iv,
            body_auth_tag,
            metadata,
            status,
            created_at,
            edited_at,
            deleted_at
        FROM chat_messages
        WHERE conversation_id = $1
            AND status <> 'deleted'
            ${beforeCondition}
        ORDER BY created_at DESC, id DESC
        LIMIT $2
        `,
        values
    )

    return result.rows.reverse()
}

export const createChatMessageRepo = async ({
    conversationId,
    senderUserId,
    bodyCiphertext,
    bodyIv,
    bodyAuthTag,
    metadata,
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const result = await client.query(
            `
            INSERT INTO chat_messages (
                conversation_id,
                sender_user_id,
                message_type,
                body_ciphertext,
                body_iv,
                body_auth_tag,
                metadata
            )
            VALUES ($1, $2, 'text', $3, $4, $5, $6::jsonb)
            RETURNING
                id,
                conversation_id,
                sender_user_id,
                message_type,
                body_ciphertext,
                body_iv,
                body_auth_tag,
                metadata,
                status,
                created_at,
                edited_at,
                deleted_at
            `,
            [
                conversationId,
                senderUserId,
                bodyCiphertext,
                bodyIv,
                bodyAuthTag,
                JSON.stringify(metadata || {}),
            ]
        )

        await client.query(
            `
            UPDATE chat_conversations
            SET updated_at = NOW()
            WHERE id = $1
            `,
            [conversationId]
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

export const updateConversationReadRepo = async ({ conversationId, userId, messageId }) => {
    const result = await pool.query(
        `
        UPDATE chat_conversation_members
        SET
            last_read_message_id = CASE
                WHEN last_read_message_id IS NULL OR last_read_message_id < $3 THEN $3
                ELSE last_read_message_id
            END,
            last_read_at = NOW(),
            updated_at = NOW()
        WHERE conversation_id = $1
            AND user_id = $2
            AND status = 'active'
        RETURNING conversation_id, user_id, last_read_message_id, last_read_at
        `,
        [conversationId, userId, messageId]
    )

    return result.rows[0] || null
}

export const getMessageInConversationRepo = async ({ conversationId, messageId }) => {
    const result = await pool.query(
        `
        SELECT id, conversation_id, sender_user_id, created_at
        FROM chat_messages
        WHERE conversation_id = $1 AND id = $2 AND status <> 'deleted'
        LIMIT 1
        `,
        [conversationId, messageId]
    )

    return result.rows[0] || null
}
