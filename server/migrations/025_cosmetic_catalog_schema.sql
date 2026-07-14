CREATE TABLE IF NOT EXISTS cosmetic_collections (
    id BIGSERIAL PRIMARY KEY,
    collection_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    label_ru TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    description_ru TEXT NOT NULL DEFAULT '',
    preview_url TEXT,
    status TEXT NOT NULL DEFAULT 'inactive',
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cosmetic_collections_key_not_blank_check
        CHECK (BTRIM(collection_key) <> ''),
    CONSTRAINT cosmetic_collections_status_check
        CHECK (status IN ('active', 'inactive', 'hidden', 'retired')),
    CONSTRAINT cosmetic_collections_metadata_object_check
        CHECK (JSONB_TYPEOF(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS cosmetic_items (
    id BIGSERIAL PRIMARY KEY,
    item_key TEXT NOT NULL UNIQUE,
    collection_id BIGINT REFERENCES cosmetic_collections(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    rarity TEXT NOT NULL DEFAULT 'common',
    label TEXT NOT NULL,
    label_ru TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    description_ru TEXT NOT NULL DEFAULT '',
    preview_url TEXT,
    status TEXT NOT NULL DEFAULT 'inactive',
    is_shop_visible BOOLEAN NOT NULL DEFAULT FALSE,
    is_unlockable BOOLEAN NOT NULL DEFAULT FALSE,
    tradable BOOLEAN NOT NULL DEFAULT FALSE,
    marketable BOOLEAN NOT NULL DEFAULT FALSE,
    giftable BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cosmetic_items_key_not_blank_check
        CHECK (BTRIM(item_key) <> ''),
    CONSTRAINT cosmetic_items_type_check
        CHECK (type IN ('skin_pack', 'board_skin', 'piece_skin', 'bundle')),
    CONSTRAINT cosmetic_items_rarity_check
        CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
    CONSTRAINT cosmetic_items_status_check
        CHECK (status IN ('active', 'inactive', 'hidden', 'retired')),
    CONSTRAINT cosmetic_items_metadata_object_check
        CHECK (JSONB_TYPEOF(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS skin_pack_manifests (
    id BIGSERIAL PRIMARY KEY,
    cosmetic_item_id BIGINT NOT NULL REFERENCES cosmetic_items(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    manifest JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT skin_pack_manifests_item_version_unique
        UNIQUE (cosmetic_item_id, version),
    CONSTRAINT skin_pack_manifests_version_check
        CHECK (version > 0),
    CONSTRAINT skin_pack_manifests_status_check
        CHECK (status IN ('draft', 'active', 'archived')),
    CONSTRAINT skin_pack_manifests_manifest_object_check
        CHECK (JSONB_TYPEOF(manifest) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_cosmetic_collections_catalog
    ON cosmetic_collections(status, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_cosmetic_items_collection
    ON cosmetic_items(collection_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_cosmetic_items_catalog
    ON cosmetic_items(status, is_shop_visible, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_cosmetic_items_type_rarity
    ON cosmetic_items(type, rarity);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skin_pack_manifests_one_active_per_item
    ON skin_pack_manifests(cosmetic_item_id)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_skin_pack_manifests_item_status
    ON skin_pack_manifests(cosmetic_item_id, status, version DESC);

ALTER TABLE cosmetic_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmetic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE skin_pack_manifests ENABLE ROW LEVEL SECURITY;
