CREATE TABLE IF NOT EXISTS uploaded_assets (
    url TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_assets_created_at
    ON uploaded_assets (created_at DESC);
