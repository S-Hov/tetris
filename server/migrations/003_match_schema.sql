CREATE TABLE IF NOT EXISTS matches (
    id BIGSERIAL PRIMARY KEY,
    mode VARCHAR(20) NOT NULL,
    match_type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'created',
    is_online BOOLEAN NOT NULL DEFAULT TRUE,
    counts_for_rating BOOLEAN NOT NULL DEFAULT FALSE,
    winner_team_id BIGINT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT matches_mode_check
        CHECK (mode IN ('solo', '1v1', '2v2', '5v5', 'royale')),
    CONSTRAINT matches_match_type_check
        CHECK (match_type IN ('ranked', 'casual', 'friends', 'private')),
    CONSTRAINT matches_status_check
        CHECK (status IN ('created', 'playing', 'finished', 'cancelled', 'abandoned'))
);

CREATE TABLE IF NOT EXISTS match_teams (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL,
    team_score INTEGER NOT NULL DEFAULT 0,
    result VARCHAR(20) DEFAULT 'none',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT match_teams_result_check
        CHECK (result IN ('win', 'lose', 'draw', 'none')),
    CONSTRAINT match_teams_match_id_team_number_key
        UNIQUE (match_id, team_number)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_matches_winner_team'
          AND conrelid = 'matches'::regclass
    ) THEN
        ALTER TABLE matches
            ADD CONSTRAINT fk_matches_winner_team
            FOREIGN KEY (winner_team_id)
            REFERENCES match_teams(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS match_players (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id BIGINT REFERENCES match_teams(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_registered BOOLEAN NOT NULL DEFAULT TRUE,
    nickname VARCHAR(100),
    score INTEGER NOT NULL DEFAULT 0,
    lines_cleared INTEGER NOT NULL DEFAULT 0,
    level_reached INTEGER NOT NULL DEFAULT 1,
    result VARCHAR(20) DEFAULT 'none',
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT match_players_result_check
        CHECK (result IN ('win', 'lose', 'draw', 'none'))
);

CREATE TABLE IF NOT EXISTS match_events (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    source_player_id BIGINT REFERENCES match_players(id) ON DELETE SET NULL,
    target_player_id BIGINT REFERENCES match_players(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_mode
    ON matches(mode);

CREATE INDEX IF NOT EXISTS idx_matches_status
    ON matches(status);

CREATE INDEX IF NOT EXISTS idx_matches_started_at
    ON matches(started_at);

CREATE INDEX IF NOT EXISTS idx_matches_counts_for_rating
    ON matches(counts_for_rating);

CREATE INDEX IF NOT EXISTS idx_match_teams_match_id
    ON match_teams(match_id);

CREATE INDEX IF NOT EXISTS idx_match_players_match_id
    ON match_players(match_id);

CREATE INDEX IF NOT EXISTS idx_match_players_user_id
    ON match_players(user_id);

CREATE INDEX IF NOT EXISTS idx_match_players_team_id
    ON match_players(team_id);

CREATE INDEX IF NOT EXISTS idx_match_players_result
    ON match_players(result);

CREATE INDEX IF NOT EXISTS idx_match_events_match_id
    ON match_events(match_id);

CREATE INDEX IF NOT EXISTS idx_match_events_event_type
    ON match_events(event_type);
