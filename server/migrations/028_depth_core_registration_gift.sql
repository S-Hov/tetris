ALTER TABLE user_inventory_items
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

UPDATE user_inventory_items AS inventory
SET viewed_at = COALESCE(inventory.viewed_at, inventory.acquired_at)
FROM cosmetic_items AS item
WHERE item.id = inventory.cosmetic_item_id
    AND item.item_key = 'default';

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_inventory_items_idempotent_grant
    ON user_inventory_items(user_id, cosmetic_item_id, source, source_ref)
    WHERE source_ref IS NOT NULL AND status <> 'revoked';

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
    'depth_core',
    cosmetic_collections.id,
    'skin_pack',
    'rare',
    'Depth Core',
    'Глубина',
    'A dimensional CSS skin with inset faces and illuminated corner links.',
    'Объёмный CSS-скин с внутренними гранями и светящимися линиями от углов.',
    'active',
    FALSE,
    FALSE,
    10,
    '{"cssPreset": "depth-core", "isRegistrationGift": true}'::jsonb
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
        "preset": "depth-core",
        "board": { "renderMode": "css", "style": {} },
        "emptyCell": { "renderMode": "css", "style": {} },
        "ghost": { "renderMode": "css", "style": {} },
        "pieces": {}
    }'::jsonb,
    'active'
FROM cosmetic_items
WHERE cosmetic_items.item_key = 'depth_core'
ON CONFLICT (cosmetic_item_id, version) DO NOTHING;

WITH granted AS (
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
        users.id,
        cosmetic_items.id,
        'system',
        'registration-gift-v1',
        'active',
        '{"grantReason": "registration_gift"}'::jsonb,
        NULL
    FROM users
    CROSS JOIN cosmetic_items
    WHERE cosmetic_items.item_key = 'depth_core'
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

CREATE OR REPLACE FUNCTION grant_default_skin_to_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    gift RECORD;
    inventory_item_id BIGINT;
BEGIN
    FOR gift IN
        SELECT
            id,
            item_key,
            CASE
                WHEN item_key = 'default' THEN 'default-skin'
                ELSE 'registration-gift-v1'
            END AS source_ref
        FROM cosmetic_items
        WHERE item_key IN ('default', 'depth_core')
            AND status = 'active'
        ORDER BY sort_order, id
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
            NEW.id,
            gift.id,
            'system',
            gift.source_ref,
            'active',
            jsonb_build_object(
                'grantReason', CASE
                    WHEN gift.item_key = 'default' THEN 'default_skin'
                    ELSE 'registration_gift'
                END
            ),
            CASE WHEN gift.item_key = 'default' THEN NOW() ELSE NULL END
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
                NEW.id,
                inventory_item_id,
                'granted',
                jsonb_build_object(
                    'cosmeticItemId', gift.id,
                    'itemKey', gift.item_key,
                    'source', 'system',
                    'sourceRef', gift.source_ref
                )
            );
        END IF;

        IF gift.item_key = 'default' AND inventory_item_id IS NOT NULL THEN
            INSERT INTO user_cosmetic_loadouts (
                user_id,
                active_skin_pack_inventory_id
            )
            VALUES (
                NEW.id,
                inventory_item_id
            )
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;
