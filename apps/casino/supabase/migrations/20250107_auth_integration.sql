-- Link Supabase Auth users with Casino users
-- This migration adds auth integration for player accounts

-- Add auth_user_id to users table
ALTER TABLE users ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX idx_users_auth_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Update RLS policies to allow authenticated users to access their own data
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can view their own balances" ON user_balances;
CREATE POLICY "Users can view their own balances"
    ON user_balances FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM users WHERE users.id = user_balances.user_id
        )
    );

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM users WHERE users.id = transactions.user_id
        )
    );

DROP POLICY IF EXISTS "Users can view their own game rounds" ON game_rounds;
CREATE POLICY "Users can view their own game rounds"
    ON game_rounds FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM users WHERE users.id = game_rounds.user_id
        )
    );

DROP POLICY IF EXISTS "Users can view their own promotion wins" ON promotion_wins;
CREATE POLICY "Users can view their own promotion wins"
    ON promotion_wins FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM users WHERE users.id = promotion_wins.user_id
        )
    );

-- Function to link auth user to casino account
CREATE OR REPLACE FUNCTION link_auth_to_casino_user(
    p_external_user_id VARCHAR,
    p_auth_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Find the casino user by external ID
    SELECT id INTO v_user_id
    FROM users
    WHERE external_user_id = p_external_user_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Casino user not found with external_user_id: %', p_external_user_id;
    END IF;

    -- Link the auth user
    UPDATE users
    SET auth_user_id = p_auth_user_id
    WHERE id = v_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's casino data
CREATE OR REPLACE FUNCTION get_my_casino_profile()
RETURNS TABLE(
    casino_user_id UUID,
    external_user_id VARCHAR,
    email VARCHAR,
    total_balance DECIMAL,
    currency VARCHAR,
    total_bets DECIMAL,
    total_wins DECIMAL,
    total_transactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id as casino_user_id,
        u.external_user_id,
        u.email,
        COALESCE(SUM(ub.balance), 0) as total_balance,
        ub.currency,
        COALESCE(SUM(gr.total_bet), 0) as total_bets,
        COALESCE(SUM(gr.total_win), 0) as total_wins,
        COUNT(DISTINCT t.id) as total_transactions
    FROM users u
    LEFT JOIN user_balances ub ON u.id = ub.user_id
    LEFT JOIN game_rounds gr ON u.id = gr.user_id
    LEFT JOIN transactions t ON u.id = t.user_id
    WHERE u.auth_user_id = auth.uid()
    GROUP BY u.id, u.external_user_id, u.email, ub.currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for user's recent transactions
CREATE OR REPLACE VIEW my_recent_transactions AS
SELECT
    t.id,
    t.tid,
    t.type,
    t.subtype,
    t.amount,
    t.currency,
    t.balance_before,
    t.balance_after,
    t.created_at,
    gr.game_desc,
    gr.game_round_id
FROM transactions t
LEFT JOIN game_rounds gr ON t.game_round_id = gr.id
INNER JOIN users u ON t.user_id = u.id
WHERE u.auth_user_id = auth.uid()
ORDER BY t.created_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON my_recent_transactions TO authenticated;

COMMENT ON COLUMN users.auth_user_id IS 'Links casino user to Supabase Auth user for player login';
COMMENT ON FUNCTION link_auth_to_casino_user IS 'Links an authenticated user account to their casino account';
COMMENT ON FUNCTION get_my_casino_profile IS 'Gets the current authenticated user''s casino profile and statistics';
