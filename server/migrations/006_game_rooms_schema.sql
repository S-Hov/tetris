CREATE TABLE IF NOT EXISTS game_rooms (
    id VARCHAR(100) PRIMARY KEY,
    status VARCHAR(30) NOT NULL DEFAULT 'waiting',
    match_id BIGINT REFERENCES matches(id) ON DELETE SET NULL,
    mode_key VARCHAR(20) NOT NULL,
    owner_socket_id VARCHAR(100),
    owner_user_key VARCHAR(128),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT game_rooms_status_check
        CHECK (status IN ('waiting', 'playing', 'closed')),
    CONSTRAINT game_rooms_mode_key_check
        CHECK (mode_key IN ('1v1', '2v2', '5v5', 'royale'))
);

CREATE INDEX IF NOT EXISTS idx_game_rooms_status
    ON game_rooms(status);

CREATE INDEX IF NOT EXISTS idx_game_rooms_mode_key
    ON game_rooms(mode_key);

CREATE INDEX IF NOT EXISTS idx_game_rooms_match_id
    ON game_rooms(match_id);

CREATE INDEX IF NOT EXISTS idx_game_rooms_updated_at
    ON game_rooms(updated_at);

CREATE TABLE IF NOT EXISTS game_room_players (
    id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
    socket_id VARCHAR(100) NOT NULL,
    user_key VARCHAR(128) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_registered BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    rank_stats JSONB,
    is_ready BOOLEAN NOT NULL DEFAULT FALSE,
    game_state JSONB,
    team_id BIGINT REFERENCES match_teams(id) ON DELETE SET NULL,
    team_number INTEGER,
    team_slot VARCHAR(20),
    match_player_id BIGINT REFERENCES match_players(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT game_room_players_room_user_key_unique
        UNIQUE (room_id, user_key),
    CONSTRAINT game_room_players_socket_id_unique
        UNIQUE (socket_id),
    CONSTRAINT game_room_players_team_number_check
        CHECK (team_number IS NULL OR team_number IN (1, 2)),
    CONSTRAINT game_room_players_team_slot_check
        CHECK (team_slot IS NULL OR team_slot IN ('team_1', 'team_2'))
);

CREATE INDEX IF NOT EXISTS idx_game_room_players_room_id
    ON game_room_players(room_id);

CREATE INDEX IF NOT EXISTS idx_game_room_players_socket_id
    ON game_room_players(socket_id);

CREATE INDEX IF NOT EXISTS idx_game_room_players_user_key
    ON game_room_players(user_key);

CREATE INDEX IF NOT EXISTS idx_game_room_players_user_id
    ON game_room_players(user_id);

CREATE INDEX IF NOT EXISTS idx_game_room_players_team
    ON game_room_players(room_id, team_number);

CREATE INDEX IF NOT EXISTS idx_game_room_players_updated_at
    ON game_room_players(updated_at);
