-- OneWallet Casino Database Schema
-- Migration for Fundist OneWallet API v132-v161 integration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_user_id VARCHAR(255) UNIQUE NOT NULL, -- Fundist user ID
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_external_id ON users(external_user_id);

-- User balances table with optimistic locking
CREATE TABLE user_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL, -- ISO 4217 currency code
    balance DECIMAL(20, 8) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    version INTEGER NOT NULL DEFAULT 0, -- For optimistic locking
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

CREATE INDEX idx_balances_user_currency ON user_balances(user_id, currency);

-- Promotions table (needs to be before transactions)
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bonus_id INTEGER UNIQUE NOT NULL, -- i_bonusid from API
    bonus_desc VARCHAR(255), -- c_bonusdesc from API
    promotion_type VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotions_bonus_id ON promotions(bonus_id);
CREATE INDEX idx_promotions_active ON promotions(active);

-- Game rounds table (needs to be before transactions)
CREATE TABLE game_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_round_id VARCHAR(255) NOT NULL, -- c_gameround from API
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_desc VARCHAR(255), -- Game description
    currency VARCHAR(3) NOT NULL,
    total_bet DECIMAL(20, 8) DEFAULT 0,
    total_win DECIMAL(20, 8) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'rolled_back')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, game_round_id)
);

CREATE INDEX idx_rounds_user ON game_rounds(user_id);
CREATE INDEX idx_rounds_status ON game_rounds(status);
CREATE INDEX idx_rounds_started ON game_rounds(started_at DESC);

-- Transactions table (all financial operations)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tid VARCHAR(255) UNIQUE NOT NULL, -- Transaction ID from Fundist (must be unique)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('debit', 'credit', 'rollback', 'promotion_win')),
    subtype VARCHAR(50), -- bet, win, rollback, promotion, etc.
    amount DECIMAL(20, 8) NOT NULL,
    balance_before DECIMAL(20, 8) NOT NULL,
    balance_after DECIMAL(20, 8) NOT NULL,
    game_round_id UUID REFERENCES game_rounds(id) ON DELETE SET NULL,
    action_id INTEGER, -- i_actionid from API
    game_id INTEGER, -- i_gameid from API
    rollback_tid VARCHAR(255), -- References original TID being rolled back
    promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_tid ON transactions(tid);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_game_action ON transactions(game_id, action_id);
CREATE INDEX idx_transactions_rollback ON transactions(rollback_tid);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- Round actions table (detailed action history per round)
CREATE TABLE round_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID REFERENCES game_rounds(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    action_id INTEGER NOT NULL, -- i_actionid from API
    game_id INTEGER NOT NULL, -- i_gameid from API
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('bet', 'win', 'rollback')),
    amount DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(round_id, game_id, action_id)
);

CREATE INDEX idx_actions_round ON round_actions(round_id);
CREATE INDEX idx_actions_game ON round_actions(game_id, action_id);

-- Callback logs table (audit trail)
CREATE TABLE callback_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type VARCHAR(50) NOT NULL, -- ping, balance, debit, credit, rollback, roundinfo, promotion
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tid VARCHAR(255), -- Transaction ID if applicable
    request_body JSONB NOT NULL,
    response_body JSONB NOT NULL,
    response_code INTEGER NOT NULL,
    hmac_valid BOOLEAN NOT NULL,
    ip_address INET,
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_type ON callback_logs(request_type);
CREATE INDEX idx_logs_user ON callback_logs(user_id);
CREATE INDEX idx_logs_tid ON callback_logs(tid);
CREATE INDEX idx_logs_created ON callback_logs(created_at DESC);
CREATE INDEX idx_logs_hmac ON callback_logs(hmac_valid);

-- Promotion wins table
CREATE TABLE promotion_wins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 8) NOT NULL,
    awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotion_wins_user ON promotion_wins(user_id);
CREATE INDEX idx_promotion_wins_promotion ON promotion_wins(promotion_id);

-- ============================================================================
-- Updated_at Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_balances_updated_at
    BEFORE UPDATE ON user_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE callback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_wins ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role has full access to users"
    ON users FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to user_balances"
    ON user_balances FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to transactions"
    ON transactions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to game_rounds"
    ON game_rounds FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to round_actions"
    ON round_actions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to callback_logs"
    ON callback_logs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to promotions"
    ON promotions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to promotion_wins"
    ON promotion_wins FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can read their own data
CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can view their own balances"
    ON user_balances FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own game rounds"
    ON game_rounds FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view active promotions"
    ON promotions FOR SELECT
    USING (active = TRUE);

CREATE POLICY "Users can view their own promotion wins"
    ON promotion_wins FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get or create user by external ID
CREATE OR REPLACE FUNCTION get_or_create_user(
    p_external_user_id VARCHAR,
    p_email VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Try to find existing user
    SELECT id INTO v_user_id
    FROM users
    WHERE external_user_id = p_external_user_id;

    -- Create if not exists
    IF v_user_id IS NULL THEN
        INSERT INTO users (external_user_id, email)
        VALUES (p_external_user_id, p_email)
        RETURNING id INTO v_user_id;
    END IF;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get balance with currency initialization
CREATE OR REPLACE FUNCTION get_user_balance(
    p_user_id UUID,
    p_currency VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
    v_balance DECIMAL(20, 8);
BEGIN
    SELECT balance INTO v_balance
    FROM user_balances
    WHERE user_id = p_user_id AND currency = p_currency;

    -- Initialize balance if not exists
    IF v_balance IS NULL THEN
        INSERT INTO user_balances (user_id, currency, balance)
        VALUES (p_user_id, p_currency, 0)
        ON CONFLICT (user_id, currency) DO NOTHING
        RETURNING balance INTO v_balance;

        IF v_balance IS NULL THEN
            SELECT balance INTO v_balance
            FROM user_balances
            WHERE user_id = p_user_id AND currency = p_currency;
        END IF;
    END IF;

    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update balance with optimistic locking
CREATE OR REPLACE FUNCTION update_balance(
    p_user_id UUID,
    p_currency VARCHAR,
    p_amount DECIMAL,
    p_expected_version INTEGER
)
RETURNS TABLE(new_balance DECIMAL, new_version INTEGER) AS $$
DECLARE
    v_new_balance DECIMAL(20, 8);
    v_new_version INTEGER;
BEGIN
    UPDATE user_balances
    SET
        balance = balance + p_amount,
        version = version + 1,
        updated_at = NOW()
    WHERE
        user_id = p_user_id
        AND currency = p_currency
        AND version = p_expected_version
        AND (balance + p_amount) >= 0
    RETURNING balance, version INTO v_new_balance, v_new_version;

    IF v_new_balance IS NULL THEN
        RAISE EXCEPTION 'Balance update failed: version mismatch or insufficient funds';
    END IF;

    RETURN QUERY SELECT v_new_balance, v_new_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE users IS 'Casino users registered via Fundist API';
COMMENT ON TABLE user_balances IS 'User wallet balances per currency with optimistic locking';
COMMENT ON TABLE transactions IS 'All financial transactions (debits, credits, rollbacks, promotions)';
COMMENT ON TABLE game_rounds IS 'Game round tracking for casino sessions';
COMMENT ON TABLE round_actions IS 'Detailed action history within game rounds';
COMMENT ON TABLE callback_logs IS 'Audit trail of all API callback requests and responses';
COMMENT ON TABLE promotions IS 'Available casino promotions and bonuses';
COMMENT ON TABLE promotion_wins IS 'Promotion wins awarded to users';

COMMENT ON COLUMN transactions.tid IS 'Unique transaction ID from Fundist (must be idempotent)';
COMMENT ON COLUMN transactions.rollback_tid IS 'Original TID being rolled back (for rollback transactions)';
COMMENT ON COLUMN user_balances.version IS 'Version number for optimistic locking to prevent race conditions';
