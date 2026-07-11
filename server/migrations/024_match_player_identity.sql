ALTER TABLE match_players
    ADD COLUMN IF NOT EXISTS player_key VARCHAR(180);

UPDATE match_players
SET player_key = CASE
    WHEN user_id IS NOT NULL THEN CONCAT('user:', user_id)
    ELSE CONCAT('legacy:', id)
END
WHERE player_key IS NULL;

ALTER TABLE match_players
    ALTER COLUMN player_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_players_match_player_key_unique
    ON match_players(match_id, player_key);
