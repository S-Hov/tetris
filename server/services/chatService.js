import { badRequest, forbidden, notFound, unauthorized } from '../helpers/error.helper.js'
import {
    createChatMessageRepo,
    getChatUserByIdRepo,
    getConversationByIdForUserRepo,
    getConversationMessagesRepo,
    getConversationParticipantsRepo,
    getDirectConversationRepo,
    getMessageInConversationRepo,
    getOrCreateDirectConversationRepo,
    getUserConversationsRepo,
    updateConversationReadRepo,
} from '../repositories/chatRepository.js'
import { decryptChatMessage, encryptChatMessage } from './chatCryptoService.js'
import { getUserActionsService } from './privacyService.js'

export const CHAT_TEXT_MAX_LENGTH = 4000
const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100

const normalizePositiveInteger = (value) => {
    const number = Number.parseInt(value, 10)

    return Number.isInteger(number) && number > 0 ? number : null
}

export const normalizeChatText = (value) => String(value || '').trim()

export const assertAuthenticatedChatUser = (userId) => {
    if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
        throw unauthorized('CHAT.AUTH_REQUIRED')
    }

    return Number(userId)
}

const normalizeLimit = (value) => {
    const limit = Number.parseInt(value, 10)

    if (!Number.isInteger(limit) || limit <= 0) {
        return DEFAULT_LIMIT
    }

    return Math.min(limit, MAX_LIMIT)
}

const normalizeCursor = (value) => {
    if (!value) {
        return null
    }

    const date = new Date(value)

    return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const mapUser = (row) => row ? ({
    id: row.user_id ?? row.id,
    username: row.other_username ?? row.username,
    avatarUrl: row.other_avatar_url ?? row.avatar_url ?? null,
}) : null

const mapMessageRow = (row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    type: row.message_type,
    text: row.status === 'deleted'
        ? ''
        : decryptChatMessage({
            bodyCiphertext: row.body_ciphertext,
            bodyIv: row.body_iv,
            bodyAuthTag: row.body_auth_tag,
        }),
    metadata: row.metadata || {},
    status: row.status,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
})

const mapConversationRow = (row) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    otherUser: mapUser({
        user_id: row.other_user_id,
        username: row.other_username,
        avatar_url: row.other_avatar_url,
    }),
    lastMessage: row.last_message_id ? mapMessageRow({
        id: row.last_message_id,
        conversation_id: row.id,
        sender_user_id: row.last_message_sender_user_id,
        message_type: row.last_message_type,
        body_ciphertext: row.last_message_body_ciphertext,
        body_iv: row.last_message_body_iv,
        body_auth_tag: row.last_message_body_auth_tag,
        metadata: {},
        status: row.last_message_status,
        created_at: row.last_message_created_at,
        edited_at: null,
        deleted_at: null,
    }) : null,
    unreadCount: Number(row.unread_count) || 0,
    lastReadMessageId: row.last_read_message_id || null,
    lastReadAt: row.last_read_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
})

const assertCanMessageUser = async ({ senderUserId, targetUserId }) => {
    if (senderUserId === targetUserId) {
        throw badRequest('CHAT.CANNOT_MESSAGE_SELF')
    }

    const targetUser = await getChatUserByIdRepo(targetUserId)

    if (!targetUser) {
        throw notFound('CHAT.USER_NOT_FOUND')
    }

    const actions = await getUserActionsService({
        viewerId: senderUserId,
        targetUserId,
    })

    if (!actions.actions.message.enabled) {
        throw forbidden('CHAT.MESSAGE_NOT_ALLOWED')
    }

    return targetUser
}

export const getDirectConversationService = async ({ userId, targetUserId, createIfMissing = true }) => {
    const senderUserId = assertAuthenticatedChatUser(userId)
    const normalizedTargetUserId = normalizePositiveInteger(targetUserId)

    if (!normalizedTargetUserId) {
        throw badRequest('CHAT.INVALID_TARGET_USER')
    }

    await assertCanMessageUser({
        senderUserId,
        targetUserId: normalizedTargetUserId,
    })

    const conversation = createIfMissing
        ? await getOrCreateDirectConversationRepo({
            creatorUserId: senderUserId,
            targetUserId: normalizedTargetUserId,
        })
        : await getDirectConversationRepo({
            leftUserId: senderUserId,
            rightUserId: normalizedTargetUserId,
        })

    if (!conversation) {
        throw notFound('CHAT.CONVERSATION_NOT_FOUND')
    }

    return await getConversationDetailsService({
        userId: senderUserId,
        conversationId: conversation.id,
    })
}

export const getConversationDetailsService = async ({ userId, conversationId }) => {
    const normalizedUserId = assertAuthenticatedChatUser(userId)
    const normalizedConversationId = normalizePositiveInteger(conversationId)

    if (!normalizedConversationId) {
        throw badRequest('CHAT.INVALID_CONVERSATION')
    }

    const conversation = await getConversationByIdForUserRepo({
        userId: normalizedUserId,
        conversationId: normalizedConversationId,
    })

    if (!conversation) {
        throw notFound('CHAT.CONVERSATION_NOT_FOUND')
    }

    const participants = await getConversationParticipantsRepo(normalizedConversationId)
    const otherUser = participants.find((participant) => participant.user_id !== normalizedUserId) || null

    return {
        id: conversation.id,
        type: conversation.type,
        status: conversation.status,
        otherUser: mapUser(otherUser),
        participants: participants.map((participant) => ({
            userId: participant.user_id,
            username: participant.username,
            avatarUrl: participant.avatar_url,
            lastReadMessageId: participant.last_read_message_id || null,
            lastReadAt: participant.last_read_at || null,
        })),
        lastReadMessageId: conversation.last_read_message_id || null,
        lastReadAt: conversation.last_read_at || null,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
    }
}

export const getUserConversationsService = async ({ userId, limit, cursor }) => {
    const normalizedUserId = assertAuthenticatedChatUser(userId)
    const rows = await getUserConversationsRepo({
        userId: normalizedUserId,
        limit: normalizeLimit(limit),
        cursor: normalizeCursor(cursor),
    })

    const conversations = rows.map(mapConversationRow)

    return {
        conversations,
        nextCursor: conversations.length > 0
            ? conversations[conversations.length - 1].updatedAt
            : null,
    }
}

export const getConversationMessagesService = async ({ userId, conversationId, before, limit }) => {
    const normalizedUserId = assertAuthenticatedChatUser(userId)
    const normalizedConversationId = normalizePositiveInteger(conversationId)

    if (!normalizedConversationId) {
        throw badRequest('CHAT.INVALID_CONVERSATION')
    }

    const conversation = await getConversationByIdForUserRepo({
        userId: normalizedUserId,
        conversationId: normalizedConversationId,
    })

    if (!conversation) {
        throw notFound('CHAT.CONVERSATION_NOT_FOUND')
    }

    const rows = await getConversationMessagesRepo({
        conversationId: normalizedConversationId,
        beforeMessageId: normalizePositiveInteger(before),
        limit: normalizeLimit(limit),
    })

    return {
        messages: rows.map(mapMessageRow),
    }
}

export const sendChatMessageService = async ({
    userId,
    targetUserId,
    conversationId,
    text,
    clientMessageId,
}) => {
    const senderUserId = assertAuthenticatedChatUser(userId)
    const normalizedText = normalizeChatText(text)

    if (!normalizedText) {
        throw badRequest('CHAT.MESSAGE_EMPTY')
    }

    if (normalizedText.length > CHAT_TEXT_MAX_LENGTH) {
        throw badRequest('CHAT.MESSAGE_TOO_LONG')
    }

    let conversation = null
    let resolvedTargetUserId = normalizePositiveInteger(targetUserId)

    if (conversationId) {
        conversation = await getConversationDetailsService({
            userId: senderUserId,
            conversationId,
        })
        resolvedTargetUserId = conversation.participants.find((participant) => participant.userId !== senderUserId)?.userId || null
    } else if (resolvedTargetUserId) {
        conversation = await getDirectConversationService({
            userId: senderUserId,
            targetUserId: resolvedTargetUserId,
            createIfMissing: true,
        })
    }

    if (!conversation || !resolvedTargetUserId) {
        throw badRequest('CHAT.INVALID_RECIPIENT')
    }

    await assertCanMessageUser({
        senderUserId,
        targetUserId: resolvedTargetUserId,
    })

    const encrypted = encryptChatMessage(normalizedText)
    const row = await createChatMessageRepo({
        conversationId: conversation.id,
        senderUserId,
        ...encrypted,
        metadata: {
            clientMessageId: clientMessageId || null,
        },
    })
    const message = mapMessageRow(row)

    return {
        conversation: await getConversationDetailsService({
            userId: senderUserId,
            conversationId: conversation.id,
        }),
        message,
    }
}

export const markConversationReadService = async ({ userId, conversationId, messageId }) => {
    const normalizedUserId = assertAuthenticatedChatUser(userId)
    const normalizedConversationId = normalizePositiveInteger(conversationId)
    const normalizedMessageId = normalizePositiveInteger(messageId)

    if (!normalizedConversationId || !normalizedMessageId) {
        throw badRequest('CHAT.INVALID_READ_STATE')
    }

    const conversation = await getConversationByIdForUserRepo({
        userId: normalizedUserId,
        conversationId: normalizedConversationId,
    })

    if (!conversation) {
        throw notFound('CHAT.CONVERSATION_NOT_FOUND')
    }

    const message = await getMessageInConversationRepo({
        conversationId: normalizedConversationId,
        messageId: normalizedMessageId,
    })

    if (!message) {
        throw notFound('CHAT.MESSAGE_NOT_FOUND')
    }

    const readState = await updateConversationReadRepo({
        conversationId: normalizedConversationId,
        userId: normalizedUserId,
        messageId: normalizedMessageId,
    })

    if (!readState) {
        throw notFound('CHAT.CONVERSATION_NOT_FOUND')
    }

    return {
        conversationId: readState.conversation_id,
        userId: readState.user_id,
        lastReadMessageId: readState.last_read_message_id,
        lastReadAt: readState.last_read_at,
    }
}
