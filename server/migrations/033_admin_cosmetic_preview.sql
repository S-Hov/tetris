ALTER TABLE user_cosmetic_loadouts
ADD COLUMN IF NOT EXISTS admin_preview_skin_pack_item_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_cosmetic_loadouts_admin_preview_skin_pack_fk'
            AND conrelid = 'user_cosmetic_loadouts'::regclass
    ) THEN
        ALTER TABLE user_cosmetic_loadouts
            ADD CONSTRAINT user_cosmetic_loadouts_admin_preview_skin_pack_fk
            FOREIGN KEY (admin_preview_skin_pack_item_id)
            REFERENCES cosmetic_items(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_user_cosmetic_loadouts_admin_preview_skin_pack
    ON user_cosmetic_loadouts(admin_preview_skin_pack_item_id)
    WHERE admin_preview_skin_pack_item_id IS NOT NULL;
