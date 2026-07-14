CREATE TABLE IF NOT EXISTS user_inventory_items (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cosmetic_item_id BIGINT NOT NULL REFERENCES cosmetic_items(id) ON DELETE RESTRICT,
    source TEXT NOT NULL,
    source_ref TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_inventory_items_id_user_unique
        UNIQUE (id, user_id),
    CONSTRAINT user_inventory_items_source_check
        CHECK (source IN ('shop', 'achievement', 'admin_grant', 'event', 'promo', 'gift', 'system')),
    CONSTRAINT user_inventory_items_status_check
        CHECK (status IN ('active', 'locked', 'consumed', 'revoked')),
    CONSTRAINT user_inventory_items_attributes_object_check
        CHECK (JSONB_TYPEOF(attributes) = 'object')
);

CREATE TABLE IF NOT EXISTS user_inventory_events (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    inventory_item_id BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_inventory_events_inventory_owner_fk
        FOREIGN KEY (inventory_item_id, user_id)
        REFERENCES user_inventory_items(id, user_id)
        ON DELETE CASCADE,
    CONSTRAINT user_inventory_events_type_check
        CHECK (event_type IN (
            'granted',
            'purchased',
            'equipped',
            'unequipped',
            'locked',
            'unlocked',
            'consumed',
            'revoked',
            'gifted'
        )),
    CONSTRAINT user_inventory_events_payload_object_check
        CHECK (JSONB_TYPEOF(payload) = 'object')
);

CREATE TABLE IF NOT EXISTS user_cosmetic_loadouts (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    active_skin_pack_inventory_id BIGINT,
    active_board_skin_inventory_id BIGINT,
    active_piece_skin_inventory_id BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_cosmetic_loadouts_skin_pack_owner_fk
        FOREIGN KEY (active_skin_pack_inventory_id, user_id)
        REFERENCES user_inventory_items(id, user_id),
    CONSTRAINT user_cosmetic_loadouts_board_skin_owner_fk
        FOREIGN KEY (active_board_skin_inventory_id, user_id)
        REFERENCES user_inventory_items(id, user_id),
    CONSTRAINT user_cosmetic_loadouts_piece_skin_owner_fk
        FOREIGN KEY (active_piece_skin_inventory_id, user_id)
        REFERENCES user_inventory_items(id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_inventory_items_user_acquired
    ON user_inventory_items(user_id, acquired_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_inventory_items_user_status
    ON user_inventory_items(user_id, status, cosmetic_item_id);

CREATE INDEX IF NOT EXISTS idx_user_inventory_items_cosmetic_item
    ON user_inventory_items(cosmetic_item_id);

CREATE INDEX IF NOT EXISTS idx_user_inventory_events_inventory_created
    ON user_inventory_events(inventory_item_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_inventory_events_user_created
    ON user_inventory_events(user_id, created_at DESC, id DESC);

ALTER TABLE user_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetic_loadouts ENABLE ROW LEVEL SECURITY;
