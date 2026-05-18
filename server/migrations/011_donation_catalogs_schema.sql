CREATE TABLE IF NOT EXISTS donation_currencies (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20),
    icon_url TEXT,
    icon_symbol VARCHAR(20),
    decimals INTEGER NOT NULL DEFAULT 8,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT donation_currencies_status_check
        CHECK (status IN ('active', 'inactive')),
    CONSTRAINT donation_currencies_decimals_check
        CHECK (decimals >= 0 AND decimals <= 30)
);

CREATE TABLE IF NOT EXISTS donation_networks (
    key VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    native_currency_code VARCHAR(20),
    chain_id VARCHAR(50),
    explorer_url TEXT,
    icon_url TEXT,
    icon_symbol VARCHAR(20),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT donation_networks_status_check
        CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS donation_currency_networks (
    id BIGSERIAL PRIMARY KEY,
    currency_code VARCHAR(20) NOT NULL REFERENCES donation_currencies(code) ON UPDATE CASCADE ON DELETE CASCADE,
    network_key VARCHAR(50) NOT NULL REFERENCES donation_networks(key) ON UPDATE CASCADE ON DELETE CASCADE,
    token_standard VARCHAR(50),
    contract_address TEXT,
    min_confirmations INTEGER NOT NULL DEFAULT 1,
    memo_required BOOLEAN NOT NULL DEFAULT FALSE,
    deposit_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT donation_currency_networks_unique
        UNIQUE (currency_code, network_key),
    CONSTRAINT donation_currency_networks_status_check
        CHECK (status IN ('active', 'inactive')),
    CONSTRAINT donation_currency_networks_confirmations_check
        CHECK (min_confirmations >= 0)
);

ALTER TABLE donation_wallets
    ADD COLUMN IF NOT EXISTS currency_network_id BIGINT REFERENCES donation_currency_networks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_donation_currencies_status
    ON donation_currencies(status);

CREATE INDEX IF NOT EXISTS idx_donation_networks_status
    ON donation_networks(status);

CREATE INDEX IF NOT EXISTS idx_donation_currency_networks_currency
    ON donation_currency_networks(currency_code);

CREATE INDEX IF NOT EXISTS idx_donation_currency_networks_network
    ON donation_currency_networks(network_key);

CREATE INDEX IF NOT EXISTS idx_donation_currency_networks_status
    ON donation_currency_networks(status);

CREATE INDEX IF NOT EXISTS idx_donation_wallets_currency_network_id
    ON donation_wallets(currency_network_id);

INSERT INTO donation_currencies (code, name, symbol, icon_symbol, decimals, sort_order)
VALUES
    ('USDT', 'Tether USD', 'USDT', '₮', 6, 10),
    ('USDC', 'USD Coin', 'USDC', '$', 6, 20),
    ('BTC', 'Bitcoin', 'BTC', '₿', 8, 30),
    ('ETH', 'Ethereum', 'ETH', 'Ξ', 18, 40),
    ('TON', 'Toncoin', 'TON', '💎', 9, 50),
    ('TRX', 'TRON', 'TRX', '◇', 6, 60),
    ('BNB', 'BNB', 'BNB', '◆', 18, 70),
    ('SOL', 'Solana', 'SOL', '◎', 9, 80),
    ('LTC', 'Litecoin', 'LTC', 'Ł', 8, 90),
    ('DOGE', 'Dogecoin', 'DOGE', 'Ð', 8, 100),
    ('XRP', 'XRP', 'XRP', '✕', 6, 110),
    ('ADA', 'Cardano', 'ADA', '₳', 6, 120),
    ('DOT', 'Polkadot', 'DOT', '●', 10, 130),
    ('POL', 'Polygon Ecosystem Token', 'POL', '⬡', 18, 140),
    ('MATIC', 'Polygon', 'MATIC', '⬡', 18, 145),
    ('DAI', 'Dai Stablecoin', 'DAI', '◈', 18, 150),
    ('BUSD', 'Binance USD', 'BUSD', '$', 18, 160),
    ('AVAX', 'Avalanche', 'AVAX', '▲', 18, 170),
    ('XLM', 'Stellar Lumens', 'XLM', '*', 7, 180),
    ('ATOM', 'Cosmos', 'ATOM', '⚛', 6, 190)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    icon_symbol = EXCLUDED.icon_symbol,
    decimals = EXCLUDED.decimals,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

INSERT INTO donation_networks (key, name, native_currency_code, chain_id, explorer_url, icon_symbol, sort_order)
VALUES
    ('bitcoin', 'Bitcoin', 'BTC', NULL, 'https://mempool.space', '₿', 10),
    ('ethereum', 'Ethereum', 'ETH', '1', 'https://etherscan.io', 'Ξ', 20),
    ('tron', 'TRON', 'TRX', NULL, 'https://tronscan.org', '◇', 30),
    ('ton', 'TON', 'TON', NULL, 'https://tonscan.org', '💎', 40),
    ('bnb-smart-chain', 'BNB Smart Chain', 'BNB', '56', 'https://bscscan.com', '◆', 50),
    ('solana', 'Solana', 'SOL', NULL, 'https://solscan.io', '◎', 60),
    ('litecoin', 'Litecoin', 'LTC', NULL, 'https://blockchair.com/litecoin', 'Ł', 70),
    ('dogecoin', 'Dogecoin', 'DOGE', NULL, 'https://blockchair.com/dogecoin', 'Ð', 80),
    ('ripple', 'XRP Ledger', 'XRP', NULL, 'https://xrpscan.com', '✕', 90),
    ('cardano', 'Cardano', 'ADA', NULL, 'https://cardanoscan.io', '₳', 100),
    ('polkadot', 'Polkadot', 'DOT', NULL, 'https://polkadot.subscan.io', '●', 110),
    ('polygon', 'Polygon PoS', 'POL', '137', 'https://polygonscan.com', '⬡', 120),
    ('arbitrum-one', 'Arbitrum One', 'ETH', '42161', 'https://arbiscan.io', 'A', 130),
    ('optimism', 'Optimism', 'ETH', '10', 'https://optimistic.etherscan.io', 'O', 140),
    ('base', 'Base', 'ETH', '8453', 'https://basescan.org', 'B', 150),
    ('avalanche-c-chain', 'Avalanche C-Chain', 'AVAX', '43114', 'https://snowtrace.io', '▲', 160),
    ('stellar', 'Stellar', 'XLM', NULL, 'https://stellar.expert', '*', 170),
    ('cosmos-hub', 'Cosmos Hub', 'ATOM', NULL, 'https://www.mintscan.io/cosmos', '⚛', 180)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    native_currency_code = EXCLUDED.native_currency_code,
    chain_id = EXCLUDED.chain_id,
    explorer_url = EXCLUDED.explorer_url,
    icon_symbol = EXCLUDED.icon_symbol,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

INSERT INTO donation_currency_networks (
    currency_code,
    network_key,
    token_standard,
    contract_address,
    min_confirmations,
    memo_required,
    sort_order
)
VALUES
    ('BTC', 'bitcoin', 'native', NULL, 3, FALSE, 10),
    ('ETH', 'ethereum', 'native', NULL, 12, FALSE, 20),
    ('USDT', 'tron', 'TRC20', 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj', 20, FALSE, 30),
    ('USDT', 'ethereum', 'ERC20', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 12, FALSE, 40),
    ('USDT', 'bnb-smart-chain', 'BEP20', '0x55d398326f99059fF775485246999027B3197955', 15, FALSE, 50),
    ('USDT', 'polygon', 'Polygon', '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 128, FALSE, 60),
    ('USDT', 'arbitrum-one', 'ERC20', '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 12, FALSE, 70),
    ('USDT', 'optimism', 'ERC20', '0x94b008aD8eDDEcB6feC8aa6bF77a43aefF7DcE6', 12, FALSE, 80),
    ('USDT', 'ton', 'Jetton', NULL, 1, TRUE, 90),
    ('USDC', 'ethereum', 'ERC20', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 12, FALSE, 100),
    ('USDC', 'bnb-smart-chain', 'BEP20', NULL, 15, FALSE, 110),
    ('USDC', 'polygon', 'Polygon', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 128, FALSE, 120),
    ('USDC', 'arbitrum-one', 'ERC20', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 12, FALSE, 130),
    ('USDC', 'optimism', 'ERC20', '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 12, FALSE, 140),
    ('USDC', 'base', 'ERC20', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 12, FALSE, 150),
    ('USDC', 'solana', 'SPL', NULL, 32, FALSE, 160),
    ('TON', 'ton', 'native', NULL, 1, TRUE, 170),
    ('TRX', 'tron', 'native', NULL, 20, FALSE, 180),
    ('BNB', 'bnb-smart-chain', 'native', NULL, 15, FALSE, 190),
    ('SOL', 'solana', 'native', NULL, 32, FALSE, 200),
    ('LTC', 'litecoin', 'native', NULL, 6, FALSE, 210),
    ('DOGE', 'dogecoin', 'native', NULL, 20, FALSE, 220),
    ('XRP', 'ripple', 'native', NULL, 12, TRUE, 230),
    ('ADA', 'cardano', 'native', NULL, 15, FALSE, 240),
    ('DOT', 'polkadot', 'native', NULL, 12, FALSE, 250),
    ('POL', 'polygon', 'native', NULL, 128, FALSE, 260),
    ('MATIC', 'polygon', 'native', NULL, 128, FALSE, 265),
    ('DAI', 'ethereum', 'ERC20', '0x6B175474E89094C44Da98b954EedeAC495271d0F', 12, FALSE, 270),
    ('DAI', 'polygon', 'Polygon', '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', 128, FALSE, 280),
    ('BUSD', 'bnb-smart-chain', 'BEP20', '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 15, FALSE, 290),
    ('AVAX', 'avalanche-c-chain', 'native', NULL, 12, FALSE, 300),
    ('XLM', 'stellar', 'native', NULL, 12, TRUE, 310),
    ('ATOM', 'cosmos-hub', 'native', NULL, 12, TRUE, 320)
ON CONFLICT (currency_code, network_key) DO UPDATE
SET token_standard = EXCLUDED.token_standard,
    contract_address = EXCLUDED.contract_address,
    min_confirmations = EXCLUDED.min_confirmations,
    memo_required = EXCLUDED.memo_required,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

UPDATE donation_wallets
SET currency_network_id = donation_currency_networks.id
FROM donation_currency_networks
WHERE donation_wallets.currency_network_id IS NULL
    AND donation_currency_networks.currency_code = donation_wallets.currency_code
    AND donation_currency_networks.network_key = donation_wallets.network_key;
