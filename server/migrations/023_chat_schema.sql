CREATE TABLE IF NOT EXISTS chat_conversations (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(30) NOT NULL DEFAULT 'direct',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_conversations_type_check
        CHECK (type IN ('direct')),
    CONSTRAINT chat_conversations_status_check
        CHECK (status IN ('active', 'archived', 'blocked'))
);

CREATE TABLE IF NOT EXISTS chat_direct_conversations (
    conversation_id BIGINT PRIMARY KEY REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_low_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_high_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_direct_conversations_distinct_users_check
        CHECK (user_low_id < user_high_id),
    CONSTRAINT chat_direct_conversations_unique_pair
        UNIQUE (user_low_id, user_high_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message_type VARCHAR(30) NOT NULL DEFAULT 'text',
    body_ciphertext TEXT NOT NULL,
    body_iv TEXT NOT NULL,
    body_auth_tag TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'sent',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT chat_messages_type_check
        CHECK (message_type IN ('text')),
    CONSTRAINT chat_messages_status_check
        CHECK (status IN ('sent', 'edited', 'deleted'))
);

CREATE TABLE IF NOT EXISTS chat_conversation_members (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL DEFAULT 'member',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    last_read_message_id BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMP,
    muted_until TIMESTAMP,
    archived_at TIMESTAMP,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_conversation_members_unique_user
        UNIQUE (conversation_id, user_id),
    CONSTRAINT chat_conversation_members_role_check
        CHECK (role IN ('member', 'owner')),
    CONSTRAINT chat_conversation_members_status_check
        CHECK (status IN ('active', 'left', 'blocked'))
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at
    ON chat_conversations(updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_direct_conversations_users
    ON chat_direct_conversations(user_low_id, user_high_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_members_user
    ON chat_conversation_members(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_members_conversation
    ON chat_conversation_members(conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
    ON chat_messages(conversation_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
    ON chat_messages(sender_user_id, created_at DESC)
    WHERE sender_user_id IS NOT NULL;
