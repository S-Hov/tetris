ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS room_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_matches_room_id
    ON matches(room_id);
