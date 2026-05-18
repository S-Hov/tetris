CREATE TABLE IF NOT EXISTS support_request_messages (
    id BIGSERIAL PRIMARY KEY,
    support_request_id BIGINT NOT NULL REFERENCES support_requests(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL,
    sender_label TEXT,
    channel VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    telegram_user_id TEXT,
    telegram_chat_id TEXT,
    telegram_message_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT support_request_messages_sender_type_check
        CHECK (sender_type IN ('client', 'admin', 'system')),
    CONSTRAINT support_request_messages_channel_check
        CHECK (channel IN ('email', 'telegram', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_support_request_messages_request_id
    ON support_request_messages(support_request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_request_messages_telegram_chat_id
    ON support_request_messages(telegram_chat_id)
    WHERE telegram_chat_id IS NOT NULL;
