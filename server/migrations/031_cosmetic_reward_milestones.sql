INSERT INTO cosmetic_items (
    item_key, collection_id, type, rarity, label, label_ru,
    description, description_ru, status, is_shop_visible,
    is_unlockable, sort_order, metadata
)
SELECT
    reward.item_key,
    cosmetic_collections.id,
    'skin_pack',
    reward.rarity,
    reward.label,
    reward.label_ru,
    reward.description,
    reward.description_ru,
    'active',
    FALSE,
    TRUE,
    reward.sort_order,
    reward.metadata
FROM cosmetic_collections
CROSS JOIN (
    VALUES
        (
            'friend_palette', 'rare', 'Stone Garden', 'Каменный сад',
            'A calm alternative palette with no additional visual effects.',
            'Спокойная альтернативная палитра без дополнительных визуальных эффектов.',
            15,
            '{"cssPreset":"stone-garden","unlockCondition":"first_friend","requiredFriends":1}'::jsonb
        ),
        (
            'first_match_palette', 'rare', 'Night Bloom', 'Ночное цветение',
            'An alternative non-classic palette awarded after the first completed match.',
            'Альтернативная неклассическая палитра за первый завершённый матч.',
            16,
            '{"cssPreset":"night-bloom","unlockCondition":"first_match","requiredMatches":1}'::jsonb
        )
) AS reward(item_key, rarity, label, label_ru, description, description_ru, sort_order, metadata)
WHERE cosmetic_collections.collection_key = 'core'
ON CONFLICT (item_key) DO UPDATE
SET label = EXCLUDED.label,
    label_ru = EXCLUDED.label_ru,
    description = EXCLUDED.description,
    description_ru = EXCLUDED.description_ru,
    metadata = EXCLUDED.metadata,
    status = 'active';

INSERT INTO skin_pack_manifests (cosmetic_item_id, version, manifest, status)
SELECT
    cosmetic_items.id,
    1,
    jsonb_build_object(
        'format', 'tetris-skin-pack-v1',
        'preset', preset.preset,
        'board', jsonb_build_object('renderMode', 'css', 'style', '{}'::jsonb),
        'emptyCell', jsonb_build_object('renderMode', 'css', 'style', '{}'::jsonb),
        'ghost', jsonb_build_object('renderMode', 'css', 'style', '{}'::jsonb),
        'pieces', '{}'::jsonb
    ),
    'active'
FROM cosmetic_items
JOIN (
    VALUES
        ('friend_palette', 'stone-garden'),
        ('first_match_palette', 'night-bloom')
) AS preset(item_key, preset) ON preset.item_key = cosmetic_items.item_key
ON CONFLICT (cosmetic_item_id, version) DO UPDATE
SET manifest = EXCLUDED.manifest,
    status = 'active';

UPDATE cosmetic_items
SET metadata = metadata || '{"unlockCondition":"ten_friends","requiredFriends":10}'::jsonb
WHERE item_key = 'friend_glow';

UPDATE cosmetic_items
SET metadata = metadata || '{"unlockCondition":"five_friends","requiredFriends":5}'::jsonb
WHERE item_key = 'friend_glow_color';

CREATE OR REPLACE FUNCTION accepted_friend_count(target_user_id INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(DISTINCT friend_id)::INTEGER
    FROM (
        SELECT addressee_id AS friend_id
        FROM friendships
        WHERE requester_id = target_user_id AND status = 'accepted'
        UNION ALL
        SELECT requester_id AS friend_id
        FROM friendships
        WHERE addressee_id = target_user_id AND status = 'accepted'
    ) AS accepted_friends;
$$;

UPDATE user_cosmetic_loadouts AS loadout
SET active_skin_pack_inventory_id = (
        SELECT default_inventory.id
        FROM user_inventory_items AS default_inventory
        JOIN cosmetic_items AS default_item ON default_item.id = default_inventory.cosmetic_item_id
        WHERE default_inventory.user_id = loadout.user_id
            AND default_inventory.status = 'active'
            AND default_item.item_key = 'default'
        ORDER BY default_inventory.id
        LIMIT 1
    ),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1
    FROM user_inventory_items AS equipped_inventory
    JOIN cosmetic_items AS equipped_item ON equipped_item.id = equipped_inventory.cosmetic_item_id
    WHERE equipped_inventory.id = loadout.active_skin_pack_inventory_id
        AND (
            (equipped_item.item_key = 'friend_glow' AND accepted_friend_count(loadout.user_id) < 10)
            OR (equipped_item.item_key = 'friend_glow_color' AND accepted_friend_count(loadout.user_id) < 5)
        )
);

UPDATE user_inventory_items AS inventory
SET status = 'revoked',
    updated_at = NOW()
FROM cosmetic_items AS item
WHERE item.id = inventory.cosmetic_item_id
    AND inventory.status <> 'revoked'
    AND (
        (item.item_key = 'friend_glow' AND accepted_friend_count(inventory.user_id) < 10)
        OR (item.item_key = 'friend_glow_color' AND accepted_friend_count(inventory.user_id) < 5)
    );

UPDATE user_inventory_items AS inventory
SET source_ref = 'ten-friends-reward',
    attributes = inventory.attributes || '{"grantReason":"ten_friends","requiredFriends":10}'::jsonb,
    status = 'active',
    updated_at = NOW()
FROM cosmetic_items AS item
WHERE item.id = inventory.cosmetic_item_id
    AND item.item_key = 'friend_glow'
    AND inventory.status <> 'revoked'
    AND accepted_friend_count(inventory.user_id) >= 10;

UPDATE user_inventory_items AS inventory
SET source_ref = 'five-friends-reward',
    attributes = inventory.attributes || '{"grantReason":"five_friends","requiredFriends":5}'::jsonb,
    status = 'active',
    updated_at = NOW()
FROM cosmetic_items AS item
WHERE item.id = inventory.cosmetic_item_id
    AND item.item_key = 'friend_glow_color'
    AND inventory.status <> 'revoked'
    AND accepted_friend_count(inventory.user_id) >= 5;

CREATE OR REPLACE FUNCTION grant_skin_reward(
    reward_user_id INTEGER,
    reward_item_key TEXT,
    reward_source_ref TEXT,
    reward_attributes JSONB DEFAULT '{}'::jsonb,
    reward_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    reward_item_id BIGINT;
    inventory_item_id BIGINT;
BEGIN
    SELECT id INTO reward_item_id
    FROM cosmetic_items
    WHERE item_key = reward_item_key AND status = 'active'
    LIMIT 1;

    IF reward_item_id IS NULL OR reward_user_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO user_inventory_items (
        user_id, cosmetic_item_id, source, source_ref,
        status, attributes, viewed_at
    )
    VALUES (
        reward_user_id, reward_item_id, 'event', reward_source_ref,
        'active', reward_attributes, NULL
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO inventory_item_id;

    IF inventory_item_id IS NOT NULL THEN
        INSERT INTO user_inventory_events (
            user_id, inventory_item_id, event_type, payload
        )
        VALUES (
            reward_user_id,
            inventory_item_id,
            'granted',
            reward_payload || jsonb_build_object(
                'cosmeticItemId', reward_item_id,
                'itemKey', reward_item_key,
                'source', 'event',
                'sourceRef', reward_source_ref
            )
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION grant_friend_milestone_rewards(
    reward_user_id INTEGER,
    reward_friendship_id BIGINT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    friend_count INTEGER;
    common_payload JSONB;
BEGIN
    friend_count := accepted_friend_count(reward_user_id);
    common_payload := jsonb_build_object(
        'friendCount', friend_count,
        'friendshipId', reward_friendship_id
    );

    IF friend_count >= 1 THEN
        PERFORM grant_skin_reward(
            reward_user_id,
            'friend_palette',
            'first-friend-reward',
            '{"grantReason":"first_friend","requiredFriends":1}'::jsonb,
            common_payload || '{"requiredFriends":1}'::jsonb
        );
    END IF;

    IF friend_count >= 5 THEN
        PERFORM grant_skin_reward(
            reward_user_id,
            'friend_glow_color',
            'five-friends-reward',
            '{"grantReason":"five_friends","requiredFriends":5}'::jsonb,
            common_payload || '{"requiredFriends":5}'::jsonb
        );
    END IF;

    IF friend_count >= 10 THEN
        PERFORM grant_skin_reward(
            reward_user_id,
            'friend_glow',
            'ten-friends-reward',
            '{"grantReason":"ten_friends","requiredFriends":10}'::jsonb,
            common_payload || '{"requiredFriends":10}'::jsonb
        );
    END IF;
END;
$$;

SELECT grant_friend_milestone_rewards(users.id)
FROM users
WHERE accepted_friend_count(users.id) >= 1;

DROP TRIGGER IF EXISTS friendships_grant_first_friend_skin_trigger ON friendships;
DROP TRIGGER IF EXISTS friendships_grant_three_friends_skin_trigger ON friendships;
DROP TRIGGER IF EXISTS friendships_grant_milestone_skins_trigger ON friendships;

CREATE OR REPLACE FUNCTION grant_friend_milestone_skins_from_friendship()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status <> 'accepted'
        OR (TG_OP = 'UPDATE' AND OLD.status = 'accepted') THEN
        RETURN NEW;
    END IF;

    PERFORM grant_friend_milestone_rewards(NEW.requester_id, NEW.id);
    PERFORM grant_friend_milestone_rewards(NEW.addressee_id, NEW.id);

    RETURN NEW;
END;
$$;

CREATE TRIGGER friendships_grant_milestone_skins_trigger
AFTER INSERT OR UPDATE OF status ON friendships
FOR EACH ROW
EXECUTE FUNCTION grant_friend_milestone_skins_from_friendship();

SELECT grant_skin_reward(
    played.user_id,
    'first_match_palette',
    'first-match-reward',
    jsonb_build_object('grantReason', 'first_match'),
    jsonb_build_object('matchId', played.match_id, 'mode', played.mode)
)
FROM (
    SELECT DISTINCT ON (match_players.user_id)
        match_players.user_id,
        matches.id AS match_id,
        matches.mode
    FROM match_players
    JOIN matches ON matches.id = match_players.match_id
    WHERE match_players.user_id IS NOT NULL
        AND matches.status = 'finished'
    ORDER BY match_players.user_id, COALESCE(matches.ended_at, matches.created_at), matches.id
) AS played;

CREATE OR REPLACE FUNCTION grant_first_match_skin_from_player()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    played_match RECORD;
BEGIN
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT id, mode, status INTO played_match
    FROM matches
    WHERE id = NEW.match_id;

    IF played_match.status = 'finished' THEN
        PERFORM grant_skin_reward(
            NEW.user_id,
            'first_match_palette',
            'first-match-reward',
            jsonb_build_object('grantReason', 'first_match', 'mode', played_match.mode),
            jsonb_build_object('matchId', NEW.match_id, 'mode', played_match.mode)
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION grant_first_match_skin_from_match()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    matched_player RECORD;
BEGIN
    IF NEW.status <> 'finished' OR OLD.status = 'finished' THEN
        RETURN NEW;
    END IF;

    FOR matched_player IN
        SELECT DISTINCT user_id
        FROM match_players
        WHERE match_id = NEW.id AND user_id IS NOT NULL
    LOOP
        PERFORM grant_skin_reward(
            matched_player.user_id,
            'first_match_palette',
            'first-match-reward',
            jsonb_build_object('grantReason', 'first_match', 'mode', NEW.mode),
            jsonb_build_object('matchId', NEW.id, 'mode', NEW.mode)
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_players_grant_first_match_skin_trigger ON match_players;
CREATE TRIGGER match_players_grant_first_match_skin_trigger
AFTER INSERT OR UPDATE OF user_id ON match_players
FOR EACH ROW
EXECUTE FUNCTION grant_first_match_skin_from_player();

DROP TRIGGER IF EXISTS matches_grant_first_match_skin_trigger ON matches;
CREATE TRIGGER matches_grant_first_match_skin_trigger
AFTER UPDATE OF status ON matches
FOR EACH ROW
EXECUTE FUNCTION grant_first_match_skin_from_match();
