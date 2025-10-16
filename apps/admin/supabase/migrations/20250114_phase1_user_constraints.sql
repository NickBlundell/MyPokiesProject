-- Phase 1: Critical Database Fixes - User Table Constraints
-- Migration Date: 2025-01-14
-- Purpose: Add constraints and create unified user view

-- ============================================================================
-- PART 1: Add User Table Constraints
-- ============================================================================

-- Ensure users have either auth_user_id or external_user_id
-- This prevents orphaned user records
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_must_have_auth_or_external;

ALTER TABLE users
ADD CONSTRAINT users_must_have_auth_or_external
CHECK (auth_user_id IS NOT NULL OR external_user_id IS NOT NULL);

-- Add index for auth_user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- ============================================================================
-- PART 2: Create Unified User Profile View
-- ============================================================================

-- This view combines user data with loyalty, balance, and basic stats
-- Useful for admin dashboard and player profile pages
CREATE OR REPLACE VIEW unified_user_profile AS
SELECT
    u.id as player_id,
    u.external_user_id,
    u.email,
    u.auth_user_id,
    u.created_at as registered_at,
    u.updated_at,

    -- Loyalty info
    pl.current_tier_id,
    lt.tier_name,
    lt.tier_level,
    pl.total_points_earned,
    pl.available_points,
    pl.lifetime_wagered,
    pl.last_activity_at as loyalty_last_activity,

    -- Balance info (default currency AUD)
    ub.balance as current_balance,
    ub.bonus_balance,
    ub.locked_bonus,
    ub.currency,

    -- Activity stats
    (
        SELECT COUNT(DISTINCT DATE(created_at))
        FROM transactions t
        WHERE t.user_id = u.id
        AND t.created_at >= NOW() - INTERVAL '30 days'
    ) as active_days_last_30,

    (
        SELECT MAX(created_at)
        FROM transactions t
        WHERE t.user_id = u.id
    ) as last_transaction_at,

    -- Deposit totals
    (
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions t
        WHERE t.user_id = u.id
        AND t.type = 'credit'
        AND t.subtype = 'deposit'
    ) as total_deposits,

    -- Current active bonuses count
    (
        SELECT COUNT(*)
        FROM player_bonuses pb
        WHERE pb.user_id = u.id
        AND pb.status = 'active'
    ) as active_bonuses_count,

    -- Risk flags
    CASE
        WHEN pl.lifetime_wagered >= 50000 THEN 'VIP'
        WHEN pl.lifetime_wagered >= 10000 THEN 'HIGH_VALUE'
        WHEN pl.lifetime_wagered >= 1000 THEN 'REGULAR'
        WHEN pl.lifetime_wagered > 0 THEN 'ACTIVE'
        ELSE 'NEW'
    END as player_segment

FROM users u
LEFT JOIN player_loyalty pl ON u.id = pl.user_id
LEFT JOIN loyalty_tiers lt ON pl.current_tier_id = lt.id
LEFT JOIN user_balances ub ON u.id = ub.user_id AND ub.currency = 'AUD';

-- Create index on the base view for faster queries
-- Note: Cannot create indexes on views directly, but we ensure base tables are indexed

-- Grant access to service role
GRANT SELECT ON unified_user_profile TO service_role;

-- ============================================================================
-- PART 3: Add Missing User Fields
-- ============================================================================

-- Add phone number if not exists (useful for SMS campaigns)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add phone verification status
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Add last login tracking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add last login IP
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login_ip INET;

-- Add account status
ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active'
CHECK (account_status IN ('active', 'suspended', 'closed', 'self_excluded'));

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);

-- ============================================================================
-- PART 4: Helper Function to Get Full User Profile
-- ============================================================================

-- Function to get complete user profile in single call
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_profile JSON;
BEGIN
    SELECT row_to_json(up) INTO v_profile
    FROM unified_user_profile up
    WHERE up.player_id = p_user_id;

    RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO service_role;

-- ============================================================================
-- PART 5: Validation Function
-- ============================================================================

-- Function to validate user data integrity
CREATE OR REPLACE FUNCTION validate_user_integrity()
RETURNS TABLE(
    user_id UUID,
    issue_type VARCHAR,
    issue_description TEXT
) AS $$
BEGIN
    -- Check for users without auth_user_id or external_user_id
    RETURN QUERY
    SELECT
        u.id,
        'MISSING_IDENTIFIERS'::VARCHAR,
        'User has neither auth_user_id nor external_user_id'::TEXT
    FROM users u
    WHERE u.auth_user_id IS NULL AND u.external_user_id IS NULL;

    -- Check for users without player_loyalty record
    RETURN QUERY
    SELECT
        u.id,
        'MISSING_LOYALTY'::VARCHAR,
        'User has no player_loyalty record'::TEXT
    FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM player_loyalty pl WHERE pl.user_id = u.id
    );

    -- Check for users without balance record
    RETURN QUERY
    SELECT
        u.id,
        'MISSING_BALANCE'::VARCHAR,
        'User has no user_balances record'::TEXT
    FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_balances ub WHERE ub.user_id = u.id
    );

    -- Check for orphaned player_bonuses
    RETURN QUERY
    SELECT
        pb.user_id,
        'ORPHANED_BONUS'::VARCHAR,
        'Active bonus references non-existent bonus_offer'::TEXT
    FROM player_bonuses pb
    WHERE pb.status IN ('pending', 'active')
    AND pb.bonus_offer_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM bonus_offers bo WHERE bo.id = pb.bonus_offer_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION validate_user_integrity() TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW unified_user_profile IS 'Unified view of user profile combining user, loyalty, balance, and activity data';
COMMENT ON FUNCTION get_user_profile(UUID) IS 'Returns complete user profile as JSON for a given user_id';
COMMENT ON FUNCTION validate_user_integrity() IS 'Validates user data integrity and returns any issues found';
COMMENT ON COLUMN users.phone_number IS 'User phone number for SMS communications';
COMMENT ON COLUMN users.phone_verified IS 'Whether phone number has been verified';
COMMENT ON COLUMN users.account_status IS 'Current account status (active, suspended, closed, self_excluded)';
