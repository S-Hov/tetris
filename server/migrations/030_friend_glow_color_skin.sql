INSERT INTO cosmetic_items (
    item_key,
    collection_id,
    type,
    rarity,
    label,
    label_ru,
    description,
    description_ru,
    status,
    is_shop_visible,
    is_unlockable,
    sort_order,
    metadata
)
SELECT
    'friend_glow_color',
    cosmetic_collections.id,
    'skin_pack',
    'legendary',
    'Spectrum Edge: Color',
    'Спектральный контур: Цвет',
    'The animated Spectrum Edge with vivid piece-colored centers.',
    'Переливающийся спектральный контур с яркими цветными центрами фигур.',
    'active',
    FALSE,
    TRUE,
    30,
    '{"cssPreset": "friend-glow-color", "unlockCondition": "three_friends", "requiredFriends": 3}'::jsonb
FROM cosmetic_collections
WHERE cosmetic_collections.collection_key = 'core'
ON CONFLICT (item_key) DO NOTHING;

INSERT INTO skin_pack_manifests (
    cosmetic_item_id,
    version,
    manifest,
    status
)
SELECT
    cosmetic_items.id,
    1,
    '{
        "format": "tetris-skin-pack-v1",
        "preset": "friend-glow-color",
        "board": { "renderMode": "css", "style": {} },
        "emptyCell": { "renderMode": "css", "style": {} },
        "ghost": { "renderMode": "css", "style": {} },
        "pieces": {}
    }'::jsonb,
    'active'
FROM cosmetic_items
WHERE cosmetic_items.item_key = 'friend_glow_color'
ON CONFLICT (cosmetic_item_id, version) DO NOTHING;

WITH friend_counts AS (
    SELECT user_id, COUNT(DISTINCT friend_id) AS friend_count
    FROM (
        SELECT requester_id AS user_id, addressee_id AS friend_id
        FROM friendships
        WHERE status = 'accepted'
        UNION ALL
        SELECT addressee_id AS user_id, requester_id AS friend_id
        FROM friendships
        WHERE status = 'accepted'
    ) AS accepted_friend_edges
    GROUP BY user_id
    HAVING COUNT(DISTINCT friend_id) >= 3
), granted AS (
    INSERT INTO user_inventory_items (
        user_id,
        cosmetic_item_id,
        source,
        source_ref,
        status,
        attributes,
        viewed_at
    )
    SELECT
        friend_counts.user_id,
        cosmetic_items.id,
        'event',
        'three-friends-reward',
        'active',
        '{"grantReason": "three_friends", "requiredFriends": 3}'::jsonb,
        NULL
    FROM friend_counts
    CROSS JOIN cosmetic_items
    WHERE cosmetic_items.item_key = 'friend_glow_color'
    ON CONFLICT DO NOTHING
    RETURNING id, user_id, cosmetic_item_id, source, source_ref
)
INSERT INTO user_inventory_events (
    user_id,
    inventory_item_id,
    event_type,
    payload
)
SELECT
    granted.user_id,
    granted.id,
    'granted',
    jsonb_build_object(
        'cosmeticItemId', granted.cosmetic_item_id,
        'itemKey', 'friend_glow_color',
        'source', granted.source,
        'sourceRef', granted.source_ref,
        'requiredFriends', 3
    )
FROM granted;

CREATE OR REPLACE FUNCTION grant_three_friends_skin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    friend_count INTEGER;
    reward_item_id BIGINT;
    reward_user_id INTEGER;
    inventory_item_id BIGINT;
BEGIN
    IF NEW.status <> 'accepted'
        OR (TG_OP = 'UPDATE' AND OLD.status = 'accepted') THEN
        RETURN NEW;
    END IF;

    SELECT id
    INTO reward_item_id
    FROM cosmetic_items
    WHERE item_key = 'friend_glow_color'
        AND status = 'active'
    LIMIT 1;

    IF reward_item_id IS NULL THEN
        RETURN NEW;
    END IF;

    FOREACH reward_user_id IN ARRAY ARRAY[NEW.requester_id, NEW.addressee_id]
    LOOP
        SELECT COUNT(DISTINCT friend_id)
        INTO friend_count
        FROM (
            SELECT addressee_id AS friend_id
            FROM friendships
            WHERE requester_id = reward_user_id
                AND status = 'accepted'
            UNION ALL
            SELECT requester_id AS friend_id
            FROM friendships
            WHERE addressee_id = reward_user_id
                AND status = 'accepted'
        ) AS accepted_friends;

        IF friend_count < 3 THEN
            CONTINUE;
        END IF;

        inventory_item_id := NULL;

        INSERT INTO user_inventory_items (
            user_id,
            cosmetic_item_id,
            source,
            source_ref,
            status,
            attributes,
            viewed_at
        )
        VALUES (
            reward_user_id,
            reward_item_id,
            'event',
            'three-friends-reward',
            'active',
            '{"grantReason": "three_friends", "requiredFriends": 3}'::jsonb,
            NULL
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO inventory_item_id;

        IF inventory_item_id IS NOT NULL THEN
            INSERT INTO user_inventory_events (
                user_id,
                inventory_item_id,
                event_type,
                payload
            )
            VALUES (
                reward_user_id,
                inventory_item_id,
                'granted',
                jsonb_build_object(
                    'cosmeticItemId', reward_item_id,
                    'itemKey', 'friend_glow_color',
                    'source', 'event',
                    'sourceRef', 'three-friends-reward',
                    'friendshipId', NEW.id,
                    'friendCount', friend_count
                )
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_grant_three_friends_skin_trigger ON friendships;

CREATE TRIGGER friendships_grant_three_friends_skin_trigger
AFTER INSERT OR UPDATE OF status ON friendships
FOR EACH ROW
EXECUTE FUNCTION grant_three_friends_skin();
