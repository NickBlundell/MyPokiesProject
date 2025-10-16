-- ============================================================================
-- ADD WAGERING_REQUIREMENT_REMAINING COMPUTED COLUMN
-- ============================================================================
-- Migration to fix missing wagering_requirement_remaining column
-- Referenced by: 20250108_phone_verification_bonus.sql
--
-- This column is a computed/generated column that automatically calculates
-- the remaining wagering requirement based on the total requirement and
-- what has been completed so far.
--
-- CRITICAL FIX: The phone bonus migration tries to INSERT into this column,
-- but it doesn't exist in the player_bonuses table schema.
-- ============================================================================

-- Add the computed column as GENERATED ALWAYS AS (STORED)
-- This ensures the value is automatically calculated and stored
ALTER TABLE player_bonuses
ADD COLUMN wagering_requirement_remaining DECIMAL(15,2)
GENERATED ALWAYS AS (
  CASE
    WHEN status IN ('completed', 'expired', 'forfeited', 'cancelled') THEN 0
    ELSE GREATEST(0, wagering_requirement_total - COALESCE(wagering_completed, 0))
  END
) STORED;

-- Add performance index for queries filtering by remaining wagering
-- Only index active bonuses since they're the ones we query most
CREATE INDEX idx_player_bonuses_wagering_remaining
ON player_bonuses(wagering_requirement_remaining)
WHERE status = 'active';

-- Add composite index for common query patterns
CREATE INDEX idx_player_bonuses_user_status_remaining
ON player_bonuses(user_id, status, wagering_requirement_remaining)
WHERE status = 'active';

-- ============================================================================
-- UPDATE PHONE VERIFICATION BONUS FUNCTION
-- ============================================================================
-- Fix the function to NOT insert wagering_requirement_remaining
-- since it's a generated column
-- ============================================================================

CREATE OR REPLACE FUNCTION award_phone_verification_bonus(p_auth_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_bonus_offer RECORD;
    v_casino_user RECORD;
    v_auth_user RECORD;
    v_expiry_date TIMESTAMPTZ;
    v_result JSON;
BEGIN
    -- Get auth user to check phone verification
    SELECT * INTO v_auth_user
    FROM auth.users
    WHERE id = p_auth_user_id;

    IF v_auth_user.id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User not found'
        );
    END IF;

    -- Check if phone is verified in Supabase Auth
    IF v_auth_user.phone_confirmed_at IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Phone number not verified'
        );
    END IF;

    -- Get casino user
    SELECT * INTO v_casino_user
    FROM users
    WHERE auth_user_id = p_auth_user_id;

    IF v_casino_user.id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Casino account not linked'
        );
    END IF;

    -- Check if already claimed
    IF v_casino_user.phone_bonus_claimed = TRUE THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Phone verification bonus already claimed'
        );
    END IF;

    -- Get the no-deposit bonus offer
    SELECT * INTO v_bonus_offer
    FROM bonus_offers
    WHERE bonus_code = 'NODEPOSIT20'
    AND active = TRUE;

    IF v_bonus_offer.id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'No-deposit bonus offer not available'
        );
    END IF;

    -- Check if user already has this bonus
    IF EXISTS (
        SELECT 1 FROM player_bonuses
        WHERE user_id = v_casino_user.id
        AND bonus_offer_id = v_bonus_offer.id
    ) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Bonus already claimed'
        );
    END IF;

    -- Set expiry date (7 days from now)
    v_expiry_date := NOW() + INTERVAL '7 days';

    -- Award the bonus (REMOVED wagering_requirement_remaining from INSERT)
    -- The wagering_requirement_remaining will be auto-calculated as a generated column
    INSERT INTO player_bonuses (
        user_id,
        bonus_offer_id,
        bonus_amount,
        wagering_requirement_total,
        max_cashout,
        status,
        activated_at,
        expires_at
    ) VALUES (
        v_casino_user.id,
        v_bonus_offer.id,
        v_bonus_offer.fixed_bonus_amount,
        v_bonus_offer.fixed_bonus_amount * v_bonus_offer.wagering_requirement_multiplier,
        v_bonus_offer.max_cashout,
        'active',
        NOW(),
        v_expiry_date
    );

    -- Add to user's bonus balance
    INSERT INTO user_balances (user_id, currency, bonus_balance, balance)
    VALUES (v_casino_user.id, 'USD', v_bonus_offer.fixed_bonus_amount, 0.00)
    ON CONFLICT (user_id, currency)
    DO UPDATE SET
        bonus_balance = user_balances.bonus_balance + v_bonus_offer.fixed_bonus_amount,
        updated_at = NOW();

    -- Mark bonus as claimed
    UPDATE users
    SET phone_bonus_claimed = TRUE
    WHERE id = v_casino_user.id;

    RETURN json_build_object(
        'success', TRUE,
        'bonus_amount', v_bonus_offer.fixed_bonus_amount,
        'wagering_required', v_bonus_offer.fixed_bonus_amount * v_bonus_offer.wagering_requirement_multiplier,
        'expires_at', v_expiry_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX BONUS_SYSTEM_STATS VIEW
-- ============================================================================
-- The view in 20251011_fix_rls_security_definer.sql references columns that
-- don't exist. We need to recreate it with the correct column names.
-- ============================================================================

CREATE OR REPLACE VIEW public.bonus_system_stats AS
SELECT
    COUNT(*) as total_active_bonuses,
    COUNT(DISTINCT user_id) as players_with_bonuses,
    SUM(wagering_requirement_remaining) as total_wagering_remaining,
    AVG(wagering_percentage) as avg_progress_percent
FROM player_bonuses
WHERE status = 'active';

COMMENT ON VIEW public.bonus_system_stats IS 'Summary statistics for active player bonuses';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the column was added correctly
-- ============================================================================

-- Verify column exists with correct definition
COMMENT ON COLUMN player_bonuses.wagering_requirement_remaining IS
'Automatically calculated remaining wagering requirement. Computed as: GREATEST(0, wagering_requirement_total - wagering_completed) for active bonuses, 0 for completed/expired/forfeited/cancelled.';

-- ============================================================================
-- TESTING QUERIES (for verification)
-- ============================================================================
--
-- Test 1: Check that wagering_requirement_remaining calculates correctly
-- SELECT
--   id,
--   status,
--   wagering_requirement_total,
--   wagering_completed,
--   wagering_requirement_remaining,
--   CASE
--     WHEN status IN ('completed', 'expired', 'forfeited', 'cancelled')
--     THEN wagering_requirement_remaining = 0
--     ELSE wagering_requirement_remaining = GREATEST(0, wagering_requirement_total - wagering_completed)
--   END as calculation_is_correct
-- FROM player_bonuses
-- LIMIT 10;
--
-- Test 2: Try inserting a new bonus (should auto-calculate remaining)
-- INSERT INTO player_bonuses (
--   user_id,
--   bonus_offer_id,
--   bonus_amount,
--   wagering_requirement_total,
--   wagering_completed,
--   status
-- ) VALUES (
--   (SELECT id FROM users LIMIT 1),
--   (SELECT id FROM bonus_offers LIMIT 1),
--   100.00,
--   3000.00,
--   500.00,
--   'active'
-- ) RETURNING wagering_requirement_remaining; -- Should return 2500.00
--
-- Test 3: Update wagering_completed and check remaining auto-updates
-- UPDATE player_bonuses
-- SET wagering_completed = 1000.00
-- WHERE id = (SELECT id FROM player_bonuses WHERE status = 'active' LIMIT 1)
-- RETURNING wagering_requirement_total, wagering_completed, wagering_requirement_remaining;
--
-- ============================================================================
