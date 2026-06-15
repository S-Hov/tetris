ALTER TABLE users
    ADD COLUMN IF NOT EXISTS allow_friend_requests BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS friendships (
    id BIGSERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT friendships_no_self_request
        CHECK (requester_id <> addressee_id),
    CONSTRAINT friendships_status_check
        CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'blocked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_active_pair
    ON friendships (
        LEAST(requester_id, addressee_id),
        GREATEST(requester_id, addressee_id)
    )
    WHERE status IN ('pending', 'accepted', 'blocked');

CREATE INDEX IF NOT EXISTS idx_friendships_requester_id
    ON friendships(requester_id);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id
    ON friendships(addressee_id);

CREATE INDEX IF NOT EXISTS idx_friendships_status
    ON friendships(status);

CREATE INDEX IF NOT EXISTS idx_friendships_requested_at
    ON friendships(requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_allow_friend_requests
    ON users(allow_friend_requests);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
