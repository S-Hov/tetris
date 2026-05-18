ALTER TABLE support_requests
    ADD COLUMN IF NOT EXISTS telegram_user_id TEXT,
    ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
    ADD COLUMN IF NOT EXISTS telegram_username TEXT,
    ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_support_requests_telegram_user_id
    ON support_requests(telegram_user_id)
    WHERE telegram_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_requests_telegram_chat_id
    ON support_requests(telegram_chat_id)
    WHERE telegram_chat_id IS NOT NULL;
