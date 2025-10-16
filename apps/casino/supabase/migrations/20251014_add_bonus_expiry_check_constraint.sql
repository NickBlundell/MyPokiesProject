-- Migration: Add CHECK Constraint on Bonus Expiry Dates
-- Purpose: Ensure data integrity by validating expires_at > activated_at for player bonuses
-- Priority: 5/10
-- Estimated Time: 3 hours

BEGIN;

-- ============================================================================
-- STEP 1: Fix existing invalid date ranges
-- ============================================================================

-- First, identify any existing records with invalid date ranges
DO $$
DECLARE
    v_invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_invalid_count
    FROM player_bonuses
    WHERE expires_at IS NOT NULL
    AND activated_at IS NOT NULL
    AND expires_at <= activated_at;

    IF v_invalid_count > 0 THEN
        RAISE NOTICE 'Found % records with invalid expiry dates. Fixing...', v_invalid_count;
    END IF;
END $$;

-- Fix invalid expiry dates (set expires_at to 7 days after activated_at by default)
UPDATE player_bonuses
SET expires_at = activated_at + INTERVAL '7 days'
WHERE expires_at IS NOT NULL
AND activated_at IS NOT NULL
AND expires_at <= activated_at;

-- For records where activated_at is NULL but expires_at is set, use issued_at as reference
UPDATE player_bonuses
SET activated_at = issued_at
WHERE activated_at IS NULL
AND expires_at IS NOT NULL
AND status IN ('active', 'completed', 'expired');

-- ============================================================================
-- STEP 2: Add CHECK constraint
-- ============================================================================

-- Add the CHECK constraint to ensure expires_at > activated_at
ALTER TABLE player_bonuses
ADD CONSTRAINT chk_bonus_expiry_after_activation
CHECK (
    expires_at IS NULL
    OR activated_at IS NULL
    OR expires_at > activated_at
);

-- Also add a CHECK constraint to ensure expires_at > issued_at
ALTER TABLE player_bonuses
ADD CONSTRAINT chk_bonus_expiry_after_issuance
CHECK (
    expires_at IS NULL
    OR expires_at > issued_at
);

-- ============================================================================
-- STEP 3: Create trigger to auto-set expires_at if not provided
-- ============================================================================

-- Create function to automatically set expires_at based on bonus type
CREATE OR REPLACE FUNCTION set_bonus_expiry()
RETURNS TRIGGER AS $$
DECLARE
    v_expiry_days INTEGER;
    v_bonus_type VARCHAR(30);
BEGIN
    -- Only set expires_at if it's NULL and the bonus is being activated
    IF NEW.expires_at IS NULL AND NEW.activated_at IS NOT NULL THEN
        -- Get bonus type from bonus_offers table
        SELECT bo.bonus_type INTO v_bonus_type
        FROM bonus_offers bo
        WHERE bo.id = NEW.bonus_offer_id;

        -- Set expiry based on bonus type
        CASE v_bonus_type
            WHEN 'no_deposit' THEN
                v_expiry_days := 3; -- No deposit bonuses expire in 3 days
            WHEN 'free_spins' THEN
                v_expiry_days := 1; -- Free spins expire in 24 hours
            WHEN 'deposit_match' THEN
                v_expiry_days := 30; -- Deposit match bonuses expire in 30 days
            WHEN 'reload' THEN
                v_expiry_days := 14; -- Reload bonuses expire in 14 days
            WHEN 'cashback' THEN
                v_expiry_days := 7; -- Cashback bonuses expire in 7 days
            ELSE
                v_expiry_days := 7; -- Default to 7 days
        END CASE;

        -- Set the expiry date
        NEW.expires_at := NEW.activated_at + (v_expiry_days || ' days')::INTERVAL;

        RAISE NOTICE 'Auto-setting bonus expiry to % days for bonus type %', v_expiry_days, v_bonus_type;
    END IF;

    -- Validate that expires_at is after activated_at
    IF NEW.expires_at IS NOT NULL AND NEW.activated_at IS NOT NULL THEN
        IF NEW.expires_at <= NEW.activated_at THEN
            RAISE EXCEPTION 'Bonus expiry date (%) must be after activation date (%)',
                NEW.expires_at, NEW.activated_at;
        END IF;
    END IF;

    -- Validate that expires_at is after issued_at
    IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= NEW.issued_at THEN
        RAISE EXCEPTION 'Bonus expiry date (%) must be after issuance date (%)',
            NEW.expires_at, NEW.issued_at;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
CREATE TRIGGER trg_set_bonus_expiry_on_insert
BEFORE INSERT ON player_bonuses
FOR EACH ROW
EXECUTE FUNCTION set_bonus_expiry();

-- Create trigger for UPDATE
CREATE TRIGGER trg_set_bonus_expiry_on_update
BEFORE UPDATE ON player_bonuses
FOR EACH ROW
WHEN (
    OLD.activated_at IS DISTINCT FROM NEW.activated_at
    OR OLD.expires_at IS DISTINCT FROM NEW.expires_at
)
EXECUTE FUNCTION set_bonus_expiry();

-- ============================================================================
-- STEP 4: Create function to check and auto-expire bonuses
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_outdated_bonuses()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    -- Expire bonuses that have passed their expiry date
    UPDATE player_bonuses
    SET status = 'expired',
        updated_at = NOW()
    WHERE status IN ('pending', 'active')
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;

    IF v_expired_count > 0 THEN
        RAISE NOTICE 'Expired % outdated bonuses', v_expired_count;
    END IF;

    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Add helpful indexes for expiry management
-- ============================================================================

-- Index for finding bonuses that need to be expired
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_pending_expiry
ON player_bonuses(expires_at)
WHERE status IN ('pending', 'active') AND expires_at IS NOT NULL;

-- Index for finding recently activated bonuses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_player_bonuses_activation
ON player_bonuses(activated_at DESC)
WHERE activated_at IS NOT NULL;

-- ============================================================================
-- STEP 6: Update column comments for documentation
-- ============================================================================

COMMENT ON COLUMN player_bonuses.expires_at IS 'Bonus expiry timestamp - must be after activated_at (CHECK constraint enforced)';
COMMENT ON COLUMN player_bonuses.activated_at IS 'Bonus activation timestamp - triggers auto-calculation of expires_at if not provided';
COMMENT ON FUNCTION set_bonus_expiry() IS 'Automatically sets bonus expiry date based on bonus type when activated';
COMMENT ON FUNCTION expire_outdated_bonuses() IS 'Marks bonuses as expired when past their expiry date - should be called periodically via cron job';

-- ============================================================================
-- VERIFICATION: Validate constraints are working
-- ============================================================================

DO $$
DECLARE
    v_invalid_count INTEGER;
BEGIN
    -- Check for any records that violate the new constraints
    SELECT COUNT(*) INTO v_invalid_count
    FROM player_bonuses
    WHERE (expires_at IS NOT NULL AND activated_at IS NOT NULL AND expires_at <= activated_at)
    OR (expires_at IS NOT NULL AND expires_at <= issued_at);

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % records that violate the new CHECK constraints', v_invalid_count;
    END IF;

    RAISE NOTICE 'CHECK constraints successfully added. All bonus expiry dates are valid.';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (in case migration needs to be reverted)
-- ============================================================================
-- To rollback this migration, run:
/*
BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_set_bonus_expiry_on_insert ON player_bonuses;
DROP TRIGGER IF EXISTS trg_set_bonus_expiry_on_update ON player_bonuses;

-- Drop functions
DROP FUNCTION IF EXISTS set_bonus_expiry();
DROP FUNCTION IF EXISTS expire_outdated_bonuses();

-- Drop indexes
DROP INDEX IF EXISTS idx_player_bonuses_pending_expiry;
DROP INDEX IF EXISTS idx_player_bonuses_activation;

-- Drop CHECK constraints
ALTER TABLE player_bonuses DROP CONSTRAINT IF EXISTS chk_bonus_expiry_after_activation;
ALTER TABLE player_bonuses DROP CONSTRAINT IF EXISTS chk_bonus_expiry_after_issuance;

COMMIT;
*/

-- ============================================================================
-- USAGE EXAMPLE: Set up a cron job to expire bonuses
-- ============================================================================
-- Run this in your Supabase dashboard under Database > Extensions > pg_cron:
/*
SELECT cron.schedule(
    'expire-outdated-bonuses', -- job name
    '*/15 * * * *', -- every 15 minutes
    $$SELECT expire_outdated_bonuses();$$
);
*/