ALTER TABLE support_requests
    ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(20) NOT NULL DEFAULT 'email',
    ADD COLUMN IF NOT EXISTS telegram_token TEXT,
    ADD COLUMN IF NOT EXISTS telegram_url TEXT;

ALTER TABLE support_requests
    DROP CONSTRAINT IF EXISTS support_requests_preferred_channel_check;

ALTER TABLE support_requests
    ADD CONSTRAINT support_requests_preferred_channel_check
        CHECK (preferred_channel IN ('email', 'telegram'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_requests_telegram_token_unique
    ON support_requests(telegram_token)
    WHERE telegram_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_requests_preferred_channel
    ON support_requests(preferred_channel);

CREATE TABLE IF NOT EXISTS support_user_blocks (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    reason TEXT,
    blocked_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT support_user_blocks_status_check
        CHECK (status IN ('active', 'inactive')),
    CONSTRAINT support_user_blocks_user_unique
        UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_support_user_blocks_user_id
    ON support_user_blocks(user_id);

CREATE INDEX IF NOT EXISTS idx_support_user_blocks_status
    ON support_user_blocks(status);

CREATE INDEX IF NOT EXISTS idx_support_user_blocks_blocked_until
    ON support_user_blocks(blocked_until);
