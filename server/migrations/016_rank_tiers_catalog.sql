CREATE TABLE IF NOT EXISTS rank_tiers (
    id BIGSERIAL PRIMARY KEY,
    tier_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    label_ru TEXT,
    min_points INTEGER NOT NULL CHECK (min_points >= 0),
    max_points INTEGER CHECK (max_points IS NULL OR max_points >= min_points),
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rank_tiers_status_points
    ON rank_tiers (status, min_points, max_points);

CREATE INDEX IF NOT EXISTS idx_rank_tiers_sort
    ON rank_tiers (sort_order, min_points, id);

INSERT INTO rank_tiers (
    tier_key,
    label,
    label_ru,
    min_points,
    max_points,
    status,
    sort_order
) VALUES
    ('bronze', 'Bronze', 'Bronze', 0, 999, 'active', 10),
    ('silver', 'Silver', 'Silver', 1000, 1999, 'active', 20),
    ('gold', 'Gold', 'Gold', 2000, 2999, 'active', 30),
    ('platinum', 'Platinum', 'Platinum', 3000, 3999, 'active', 40),
    ('diamond', 'Diamond', 'Diamond', 4000, 4999, 'active', 50),
    ('master', 'Master', 'Master', 5000, 5999, 'active', 60),
    ('legend', 'Legend', 'Legend', 6000, NULL, 'active', 70)
ON CONFLICT (tier_key) DO UPDATE SET
    label = EXCLUDED.label,
    label_ru = COALESCE(rank_tiers.label_ru, EXCLUDED.label_ru),
    min_points = EXCLUDED.min_points,
    max_points = EXCLUDED.max_points,
    status = EXCLUDED.status,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();
