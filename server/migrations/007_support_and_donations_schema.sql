CREATE TABLE IF NOT EXISTS support_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'new',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    contact_name VARCHAR(120),
    contact_email VARCHAR(255),
    title VARCHAR(180),
    message TEXT NOT NULL,
    page_url TEXT,
    attachment_url TEXT,
    client_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    admin_notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT support_requests_category_check
        CHECK (category IN ('bug', 'idea', 'mode', 'balance', 'other')),
    CONSTRAINT support_requests_status_check
        CHECK (status IN ('new', 'triaged', 'in_progress', 'closed', 'spam')),
    CONSTRAINT support_requests_priority_check
        CHECK (priority IN ('low', 'normal', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id
    ON support_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_support_requests_category
    ON support_requests(category);

CREATE INDEX IF NOT EXISTS idx_support_requests_status
    ON support_requests(status);

CREATE INDEX IF NOT EXISTS idx_support_requests_created_at
    ON support_requests(created_at);

CREATE TABLE IF NOT EXISTS donation_wallets (
    id BIGSERIAL PRIMARY KEY,
    currency_code VARCHAR(20) NOT NULL,
    network_key VARCHAR(50) NOT NULL,
    network_name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    address_label VARCHAR(120),
    memo_tag TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT donation_wallets_status_check
        CHECK (status IN ('active', 'inactive', 'test')),
    CONSTRAINT donation_wallets_currency_network_address_unique
        UNIQUE (currency_code, network_key, address)
);

CREATE INDEX IF NOT EXISTS idx_donation_wallets_currency_network
    ON donation_wallets(currency_code, network_key);

CREATE INDEX IF NOT EXISTS idx_donation_wallets_status
    ON donation_wallets(status);

CREATE TABLE IF NOT EXISTS donations (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    wallet_id BIGINT REFERENCES donation_wallets(id) ON DELETE SET NULL,
    donor_name VARCHAR(120),
    donor_contact VARCHAR(255),
    currency_code VARCHAR(20) NOT NULL,
    network_key VARCHAR(50) NOT NULL,
    expected_amount NUMERIC(36, 18),
    received_amount NUMERIC(36, 18),
    amount_usd NUMERIC(14, 2),
    status VARCHAR(40) NOT NULL DEFAULT 'created',
    tx_hash TEXT,
    tx_confirmations INTEGER NOT NULL DEFAULT 0,
    verification_source VARCHAR(80),
    verification_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    note TEXT,
    paid_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT donations_status_check
        CHECK (status IN ('created', 'waiting_payment', 'pending_verification', 'confirmed', 'failed', 'expired', 'refunded')),
    CONSTRAINT donations_expected_amount_check
        CHECK (expected_amount IS NULL OR expected_amount > 0),
    CONSTRAINT donations_received_amount_check
        CHECK (received_amount IS NULL OR received_amount >= 0),
    CONSTRAINT donations_tx_confirmations_check
        CHECK (tx_confirmations >= 0)
);

CREATE INDEX IF NOT EXISTS idx_donations_user_id
    ON donations(user_id);

CREATE INDEX IF NOT EXISTS idx_donations_wallet_id
    ON donations(wallet_id);

CREATE INDEX IF NOT EXISTS idx_donations_status
    ON donations(status);

CREATE INDEX IF NOT EXISTS idx_donations_currency_network
    ON donations(currency_code, network_key);

CREATE INDEX IF NOT EXISTS idx_donations_created_at
    ON donations(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_network_tx_hash_unique
    ON donations(network_key, tx_hash)
    WHERE tx_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS donation_verification_events (
    id BIGSERIAL PRIMARY KEY,
    donation_id BIGINT NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    status_from VARCHAR(40),
    status_to VARCHAR(40),
    tx_hash TEXT,
    confirmations INTEGER,
    verification_source VARCHAR(80),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT donation_verification_events_event_type_check
        CHECK (event_type IN ('created', 'submitted_tx', 'chain_check', 'confirmed', 'failed', 'expired', 'manual_review'))
);

CREATE INDEX IF NOT EXISTS idx_donation_verification_events_donation_id
    ON donation_verification_events(donation_id);

CREATE INDEX IF NOT EXISTS idx_donation_verification_events_event_type
    ON donation_verification_events(event_type);

CREATE INDEX IF NOT EXISTS idx_donation_verification_events_created_at
    ON donation_verification_events(created_at);
