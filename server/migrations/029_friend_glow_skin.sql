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
    'friend_glow',
    cosmetic_collections.id,
    'skin_pack',
    'epic',
    'Spectrum Edge',
    'Спектральный контур',
    'An animated multicolor edge that flows around every block.',
    'Анимированная разноцветная рамка, переливающаяся вокруг каждого блока.',
    'active',
    FALSE,
    TRUE,
    20,
    '{"cssPreset": "friend-glow", "unlockCondition": "first_friend"}'::jsonb
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
        "preset": "friend-glow",
        "board": { "renderMode": "css", "style": {} },
        "emptyCell": { "renderMode": "css", "style": {} },
        "ghost": { "renderMode": "css", "style": {} },
        "pieces": {}
    }'::jsonb,
    'active'
FROM cosmetic_items
WHERE cosmetic_items.item_key = 'friend_glow'
ON CONFLICT (cosmetic_item_id, version) DO NOTHING;

WITH eligible_users AS (
    SELECT requester_id AS user_id
    FROM friendships
    WHERE status = 'accepted'
    UNION
    SELECT addressee_id AS user_id
    FROM friendships
    WHERE status = 'accepted'
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
        eligible_users.user_id,
        cosmetic_items.id,
        'event',
        'first-friend-reward',
        'active',
        '{"grantReason": "first_friend"}'::jsonb,
        NULL
    FROM eligible_users
    CROSS JOIN cosmetic_items
    WHERE cosmetic_items.item_key = 'friend_glow'
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
        'source', granted.source,
        'sourceRef', granted.source_ref
    )
FROM granted;

CREATE OR REPLACE FUNCTION grant_first_friend_skin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
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
    WHERE item_key = 'friend_glow'
        AND status = 'active'
    LIMIT 1;

    IF reward_item_id IS NULL THEN
        RETURN NEW;
    END IF;

    FOREACH reward_user_id IN ARRAY ARRAY[NEW.requester_id, NEW.addressee_id]
    LOOP
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
            'first-friend-reward',
            'active',
            '{"grantReason": "first_friend"}'::jsonb,
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
                    'itemKey', 'friend_glow',
                    'source', 'event',
                    'sourceRef', 'first-friend-reward',
                    'friendshipId', NEW.id
                )
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_grant_first_friend_skin_trigger ON friendships;

CREATE TRIGGER friendships_grant_first_friend_skin_trigger
AFTER INSERT OR UPDATE OF status ON friendships
FOR EACH ROW
EXECUTE FUNCTION grant_first_friend_skin();
