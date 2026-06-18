CREATE TABLE IF NOT EXISTS user_privacy_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
    friend_requests_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
    room_invites_visibility VARCHAR(20) NOT NULL DEFAULT 'friends',
    match_invites_visibility VARCHAR(20) NOT NULL DEFAULT 'friends',
    messages_visibility VARCHAR(20) NOT NULL DEFAULT 'friends',
    club_invites_visibility VARCHAR(20) NOT NULL DEFAULT 'friends',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT user_privacy_profile_visibility_check
        CHECK (profile_visibility IN ('public', 'friends', 'private')),
    CONSTRAINT user_privacy_friend_requests_visibility_check
        CHECK (friend_requests_visibility IN ('public', 'friends', 'private')),
    CONSTRAINT user_privacy_room_invites_visibility_check
        CHECK (room_invites_visibility IN ('public', 'friends', 'private')),
    CONSTRAINT user_privacy_match_invites_visibility_check
        CHECK (match_invites_visibility IN ('public', 'friends', 'private')),
    CONSTRAINT user_privacy_messages_visibility_check
        CHECK (messages_visibility IN ('public', 'friends', 'private')),
    CONSTRAINT user_privacy_club_invites_visibility_check
        CHECK (club_invites_visibility IN ('public', 'friends', 'private'))
);

INSERT INTO user_privacy_settings (
    user_id,
    friend_requests_visibility
)
SELECT
    users.id,
    CASE
        WHEN users.allow_friend_requests = TRUE THEN 'public'
        ELSE 'private'
    END
FROM users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION create_default_user_privacy_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user_privacy_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_user_privacy_settings ON users;

CREATE TRIGGER trg_create_default_user_privacy_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_user_privacy_settings();

DROP INDEX IF EXISTS idx_users_allow_friend_requests;

ALTER TABLE users
    DROP COLUMN IF EXISTS allow_friend_requests;

ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
