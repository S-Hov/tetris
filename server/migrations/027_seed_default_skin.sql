INSERT INTO cosmetic_collections (
    collection_key,
    label,
    label_ru,
    description,
    description_ru,
    status,
    sort_order,
    metadata
)
VALUES (
    'core',
    'Core collection',
    'Базовая коллекция',
    'Permanent cosmetics available to every player.',
    'Постоянная косметика, доступная каждому игроку.',
    'active',
    0,
    '{"isDefault": true}'::jsonb
)
ON CONFLICT (collection_key) DO NOTHING;

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
    'default',
    cosmetic_collections.id,
    'skin_pack',
    'common',
    'Classic',
    'Классический',
    'The original PVP Tetris board and pieces.',
    'Оригинальное оформление поля и фигур PVP Tetris.',
    'active',
    FALSE,
    FALSE,
    0,
    '{"isDefault": true}'::jsonb
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
        "board": { "renderMode": "css", "style": {} },
        "emptyCell": { "renderMode": "css", "style": {} },
        "ghost": { "renderMode": "css", "style": {} },
        "pieces": {}
    }'::jsonb,
    'active'
FROM cosmetic_items
WHERE cosmetic_items.item_key = 'default'
ON CONFLICT (cosmetic_item_id, version) DO NOTHING;

INSERT INTO user_inventory_items (
    user_id,
    cosmetic_item_id,
    source,
    source_ref,
    status,
    attributes
)
SELECT
    users.id,
    cosmetic_items.id,
    'system',
    'default-skin',
    'active',
    '{"isDefaultGrant": true}'::jsonb
FROM users
CROSS JOIN cosmetic_items
WHERE cosmetic_items.item_key = 'default'
    AND NOT EXISTS (
        SELECT 1
        FROM user_inventory_items
        WHERE user_inventory_items.user_id = users.id
            AND user_inventory_items.cosmetic_item_id = cosmetic_items.id
            AND user_inventory_items.status <> 'revoked'
    );

INSERT INTO user_cosmetic_loadouts (
    user_id,
    active_skin_pack_inventory_id
)
SELECT
    users.id,
    inventory.id
FROM users
JOIN cosmetic_items
    ON cosmetic_items.item_key = 'default'
JOIN LATERAL (
    SELECT user_inventory_items.id
    FROM user_inventory_items
    WHERE user_inventory_items.user_id = users.id
        AND user_inventory_items.cosmetic_item_id = cosmetic_items.id
        AND user_inventory_items.status = 'active'
    ORDER BY user_inventory_items.id
    LIMIT 1
) AS inventory ON TRUE
ON CONFLICT (user_id) DO UPDATE
SET active_skin_pack_inventory_id = COALESCE(
        user_cosmetic_loadouts.active_skin_pack_inventory_id,
        EXCLUDED.active_skin_pack_inventory_id
    ),
    updated_at = CASE
        WHEN user_cosmetic_loadouts.active_skin_pack_inventory_id IS NULL THEN NOW()
        ELSE user_cosmetic_loadouts.updated_at
    END;

CREATE OR REPLACE FUNCTION grant_default_skin_to_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    default_item_id BIGINT;
    inventory_item_id BIGINT;
BEGIN
    SELECT id
    INTO default_item_id
    FROM cosmetic_items
    WHERE item_key = 'default'
        AND status = 'active'
    LIMIT 1;

    IF default_item_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO user_inventory_items (
        user_id,
        cosmetic_item_id,
        source,
        source_ref,
        status,
        attributes
    )
    VALUES (
        NEW.id,
        default_item_id,
        'system',
        'default-skin',
        'active',
        '{"isDefaultGrant": true}'::jsonb
    )
    RETURNING id INTO inventory_item_id;

    INSERT INTO user_cosmetic_loadouts (
        user_id,
        active_skin_pack_inventory_id
    )
    VALUES (
        NEW.id,
        inventory_item_id
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_grant_default_skin_trigger ON users;

CREATE TRIGGER users_grant_default_skin_trigger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION grant_default_skin_to_new_user();
