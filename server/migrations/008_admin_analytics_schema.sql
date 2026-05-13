CREATE TABLE IF NOT EXISTS site_visit_events (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_key VARCHAR(128),
    ip_address INET,
    user_agent TEXT,
    path TEXT NOT NULL,
    referrer TEXT,
    source VARCHAR(80),
    device_type VARCHAR(40),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visit_events_user_id
    ON site_visit_events(user_id);

CREATE INDEX IF NOT EXISTS idx_site_visit_events_session_key
    ON site_visit_events(session_key);

CREATE INDEX IF NOT EXISTS idx_site_visit_events_path
    ON site_visit_events(path);

CREATE INDEX IF NOT EXISTS idx_site_visit_events_occurred_at
    ON site_visit_events(occurred_at);

CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_key VARCHAR(128) NOT NULL,
    socket_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    CONSTRAINT user_sessions_session_key_unique
        UNIQUE (session_key),
    CONSTRAINT user_sessions_status_check
        CHECK (status IN ('active', 'idle', 'ended', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
    ON user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_socket_id
    ON user_sessions(socket_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_status
    ON user_sessions(status);

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen_at
    ON user_sessions(last_seen_at);

CREATE TABLE IF NOT EXISTS game_activity_events (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES matches(id) ON DELETE SET NULL,
    room_id VARCHAR(100) REFERENCES game_rooms(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_key VARCHAR(128),
    mode VARCHAR(20),
    match_type VARCHAR(30),
    event_type VARCHAR(50) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT game_activity_events_mode_check
        CHECK (mode IS NULL OR mode IN ('solo', '1v1', '2v2', '5v5', 'royale')),
    CONSTRAINT game_activity_events_match_type_check
        CHECK (match_type IS NULL OR match_type IN ('ranked', 'casual', 'friends', 'private')),
    CONSTRAINT game_activity_events_event_type_check
        CHECK (event_type IN ('room_created', 'room_joined', 'room_left', 'match_created', 'match_started', 'match_finished', 'match_cancelled', 'match_abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_game_activity_events_match_id
    ON game_activity_events(match_id);

CREATE INDEX IF NOT EXISTS idx_game_activity_events_room_id
    ON game_activity_events(room_id);

CREATE INDEX IF NOT EXISTS idx_game_activity_events_user_id
    ON game_activity_events(user_id);

CREATE INDEX IF NOT EXISTS idx_game_activity_events_mode
    ON game_activity_events(mode);

CREATE INDEX IF NOT EXISTS idx_game_activity_events_event_type
    ON game_activity_events(event_type);

CREATE INDEX IF NOT EXISTS idx_game_activity_events_occurred_at
    ON game_activity_events(occurred_at);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(80),
    entity_id TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id
    ON admin_audit_logs(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
    ON admin_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity
    ON admin_audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
    ON admin_audit_logs(created_at);
