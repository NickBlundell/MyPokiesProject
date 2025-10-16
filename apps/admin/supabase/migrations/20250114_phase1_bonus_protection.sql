-- Phase 1: Critical Database Fixes - Bonus System Protection
-- Migration Date: 2025-01-14
-- Purpose: Protect bonus system integrity with triggers and constraints

-- ============================================================================
-- PART 1: Prevent Deletion of Active Bonus Offers
-- ============================================================================

-- Function to prevent deletion of bonus offers with active player bonuses
CREATE OR REPLACE FUNCTION prevent_active_bonus_deletion()
RETURNS TRIGGER AS $$
DECLARE
    v_active_count INTEGER;
    v_bonus_details TEXT;
BEGIN
    -- Check for active or pending player bonuses
    SELECT COUNT(*) INTO v_active_count
    FROM player_bonuses
    WHERE bonus_offer_id = OLD.id
    AND status IN ('pending', 'active');

    IF v_active_count > 0 THEN
        -- Get bonus details for error message
        v_bonus_details := OLD.bonus_name || ' (' || OLD.bonus_code || ')';

        RAISE EXCEPTION 'Cannot delete bonus offer "%" - % active/pending player bonuses exist. Please deactivate the bonus instead.',
            v_bonus_details, v_active_count
        USING HINT = 'Set active = FALSE to deactivate this bonus offer';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS prevent_bonus_offer_deletion ON bonus_offers;
CREATE TRIGGER prevent_bonus_offer_deletion
    BEFORE DELETE ON bonus_offers
    FOR EACH ROW
    EXECUTE FUNCTION prevent_active_bonus_deletion();

-- ============================================================================
-- PART 2: Validate Bonus Offer Configuration
-- ============================================================================

-- Function to validate bonus offer configuration before insert/update
CREATE OR REPLACE FUNCTION validate_bonus_offer()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate deposit_match bonuses
    IF NEW.bonus_type = 'deposit_match' THEN
        IF NEW.match_percentage IS NULL OR NEW.match_percentage <= 0 THEN
            RAISE EXCEPTION 'Deposit match bonus must have a positive match_percentage';
        END IF;

        IF NEW.max_bonus_amount IS NULL OR NEW.max_bonus_amount <= 0 THEN
            RAISE EXCEPTION 'Deposit match bonus must have a positive max_bonus_amount';
        END IF;

        IF NEW.min_deposit_amount IS NULL OR NEW.min_deposit_amount <= 0 THEN
            RAISE EXCEPTION 'Deposit match bonus must have a positive min_deposit_amount';
        END IF;
    END IF;

    -- Validate no_deposit bonuses
    IF NEW.bonus_type = 'no_deposit' THEN
        IF NEW.fixed_bonus_amount IS NULL OR NEW.fixed_bonus_amount <= 0 THEN
            RAISE EXCEPTION 'No deposit bonus must have a positive fixed_bonus_amount';
        END IF;

        IF NEW.max_cashout IS NULL THEN
            RAISE WARNING 'No deposit bonus should have max_cashout set';
        END IF;
    END IF;

    -- Validate wagering requirement
    IF NEW.wagering_requirement_multiplier IS NULL OR NEW.wagering_requirement_multiplier < 0 THEN
        RAISE EXCEPTION 'Bonus must have a valid wagering_requirement_multiplier (>= 0)';
    END IF;

    -- Validate bonus code format
    IF NEW.bonus_code IS NOT NULL THEN
        IF NEW.bonus_code !~ '^[A-Z0-9_-]+$' THEN
            RAISE EXCEPTION 'Bonus code must contain only uppercase letters, numbers, hyphens and underscores';
        END IF;

        IF LENGTH(NEW.bonus_code) < 3 OR LENGTH(NEW.bonus_code) > 50 THEN
            RAISE EXCEPTION 'Bonus code must be between 3 and 50 characters';
        END IF;
    END IF;

    -- Validate date range
    IF NEW.valid_from IS NOT NULL AND NEW.valid_until IS NOT NULL THEN
        IF NEW.valid_until <= NEW.valid_from THEN
            RAISE EXCEPTION 'Bonus valid_until must be after valid_from';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_bonus_offer_trigger ON bonus_offers;
CREATE TRIGGER validate_bonus_offer_trigger
    BEFORE INSERT OR UPDATE ON bonus_offers
    FOR EACH ROW
    EXECUTE FUNCTION validate_bonus_offer();

-- ============================================================================
-- PART 3: Validate Player Bonus Assignment
-- ============================================================================

-- Function to validate player bonus before insert
CREATE OR REPLACE FUNCTION validate_player_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus_offer RECORD;
    v_existing_active_count INTEGER;
BEGIN
    -- Get bonus offer details
    IF NEW.bonus_offer_id IS NOT NULL THEN
        SELECT * INTO v_bonus_offer
        FROM bonus_offers
        WHERE id = NEW.bonus_offer_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Bonus offer % not found', NEW.bonus_offer_id;
        END IF;

        IF NOT v_bonus_offer.active THEN
            RAISE EXCEPTION 'Cannot assign inactive bonus offer: %', v_bonus_offer.bonus_name;
        END IF;

        -- Check one-time-per-user restriction
        IF v_bonus_offer.one_time_per_user THEN
            SELECT COUNT(*) INTO v_existing_active_count
            FROM player_bonuses
            WHERE user_id = NEW.user_id
            AND bonus_offer_id = NEW.bonus_offer_id
            AND status NOT IN ('cancelled', 'forfeited');

            IF v_existing_active_count > 0 THEN
                RAISE EXCEPTION 'Player has already claimed this one-time bonus: %', v_bonus_offer.bonus_name;
            END IF;
        END IF;

        -- Validate bonus amount
        IF NEW.bonus_amount <= 0 THEN
            RAISE EXCEPTION 'Bonus amount must be positive';
        END IF;

        -- Validate wagering requirement
        IF NEW.wagering_requirement_total < 0 THEN
            RAISE EXCEPTION 'Wagering requirement total cannot be negative';
        END IF;
    END IF;

    -- Set default expiry if not provided (7 days from now)
    IF NEW.expires_at IS NULL AND NEW.status = 'active' THEN
        NEW.expires_at := NOW() + INTERVAL '7 days';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_player_bonus_trigger ON player_bonuses;
CREATE TRIGGER validate_player_bonus_trigger
    BEFORE INSERT OR UPDATE ON player_bonuses
    FOR EACH ROW
    EXECUTE FUNCTION validate_player_bonus();

-- ============================================================================
-- PART 4: Auto-Expire Old Bonuses
-- ============================================================================

-- Function to automatically expire old bonuses
CREATE OR REPLACE FUNCTION auto_expire_bonuses()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE player_bonuses
    SET
        status = 'expired',
        updated_at = NOW()
    WHERE status IN ('pending', 'active')
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;

    IF v_expired_count > 0 THEN
        RAISE NOTICE 'Expired % player bonuses', v_expired_count;
    END IF;

    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION auto_expire_bonuses() TO service_role;

-- ============================================================================
-- PART 5: Bonus Integrity Validation Function
-- ============================================================================

-- Function to validate bonus system integrity
CREATE OR REPLACE FUNCTION validate_bonus_integrity()
RETURNS TABLE(
    issue_type VARCHAR,
    bonus_offer_id UUID,
    player_bonus_id UUID,
    issue_description TEXT
) AS $$
BEGIN
    -- Check for orphaned player bonuses
    RETURN QUERY
    SELECT
        'ORPHANED_PLAYER_BONUS'::VARCHAR,
        pb.bonus_offer_id,
        pb.id,
        'Player bonus references non-existent bonus offer'::TEXT
    FROM player_bonuses pb
    WHERE pb.bonus_offer_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM bonus_offers bo WHERE bo.id = pb.bonus_offer_id
    );

    -- Check for expired bonuses still active
    RETURN QUERY
    SELECT
        'EXPIRED_STILL_ACTIVE'::VARCHAR,
        pb.bonus_offer_id,
        pb.id,
        'Bonus expired but still marked as active'::TEXT
    FROM player_bonuses pb
    WHERE pb.status = 'active'
    AND pb.expires_at IS NOT NULL
    AND pb.expires_at < NOW();

    -- Check for bonuses with invalid wagering
    RETURN QUERY
    SELECT
        'INVALID_WAGERING'::VARCHAR,
        pb.bonus_offer_id,
        pb.id,
        'Wagering completed exceeds requirement'::TEXT
    FROM player_bonuses pb
    WHERE pb.wagering_completed > pb.wagering_requirement_total;

    -- Check for bonus offers with invalid configuration
    RETURN QUERY
    SELECT
        'INVALID_CONFIG'::VARCHAR,
        bo.id,
        NULL::UUID,
        'Bonus offer missing required fields for bonus_type: ' || bo.bonus_type
    FROM bonus_offers bo
    WHERE (
        (bo.bonus_type = 'deposit_match' AND (bo.match_percentage IS NULL OR bo.max_bonus_amount IS NULL))
        OR (bo.bonus_type = 'no_deposit' AND bo.fixed_bonus_amount IS NULL)
    );

    -- Check for duplicate active bonus codes
    RETURN QUERY
    SELECT
        'DUPLICATE_CODE'::VARCHAR,
        bo.id,
        NULL::UUID,
        'Duplicate active bonus code: ' || bo.bonus_code
    FROM bonus_offers bo
    WHERE bo.active = TRUE
    AND bo.bonus_code IN (
        SELECT bonus_code
        FROM bonus_offers
        WHERE active = TRUE
        GROUP BY bonus_code
        HAVING COUNT(*) > 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_bonus_integrity() TO service_role;

-- ============================================================================
-- PART 6: Bonus Statistics View
-- ============================================================================

CREATE OR REPLACE VIEW bonus_system_stats AS
SELECT
    -- Bonus Offers Stats
    (SELECT COUNT(*) FROM bonus_offers WHERE active = TRUE) as active_offers_count,
    (SELECT COUNT(*) FROM bonus_offers WHERE active = FALSE) as inactive_offers_count,

    -- Player Bonuses Stats
    (SELECT COUNT(*) FROM player_bonuses WHERE status = 'active') as active_player_bonuses,
    (SELECT COUNT(*) FROM player_bonuses WHERE status = 'pending') as pending_player_bonuses,
    (SELECT COUNT(*) FROM player_bonuses WHERE status = 'completed') as completed_player_bonuses,
    (SELECT COUNT(*) FROM player_bonuses WHERE status = 'expired') as expired_player_bonuses,

    -- Financial Stats
    (SELECT COALESCE(SUM(bonus_amount), 0) FROM player_bonuses WHERE status = 'active') as active_bonus_value,
    (SELECT COALESCE(SUM(wagering_requirement_total - wagering_completed), 0)
     FROM player_bonuses WHERE status = 'active') as outstanding_wagering,

    -- Today's Stats
    (SELECT COUNT(*) FROM player_bonuses WHERE DATE(issued_at) = CURRENT_DATE) as bonuses_issued_today,
    (SELECT COALESCE(SUM(bonus_amount), 0) FROM player_bonuses WHERE DATE(issued_at) = CURRENT_DATE) as bonus_value_today,

    -- Integrity Issues
    (SELECT COUNT(*) FROM validate_bonus_integrity()) as integrity_issues_count;

GRANT SELECT ON bonus_system_stats TO service_role;

-- ============================================================================
-- PART 7: Prevent Direct Balance Manipulation
-- ============================================================================

-- Add constraint to prevent negative bonus amounts
ALTER TABLE player_bonuses
DROP CONSTRAINT IF EXISTS check_bonus_amount_positive;

ALTER TABLE player_bonuses
ADD CONSTRAINT check_bonus_amount_positive
CHECK (bonus_amount > 0);

-- Add constraint to prevent negative wagering
ALTER TABLE player_bonuses
DROP CONSTRAINT IF EXISTS check_wagering_non_negative;

ALTER TABLE player_bonuses
ADD CONSTRAINT check_wagering_non_negative
CHECK (
    wagering_completed >= 0
    AND wagering_requirement_total >= 0
    AND wagering_completed <= wagering_requirement_total * 1.01  -- Allow 1% over for rounding
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION prevent_active_bonus_deletion() IS 'Prevents deletion of bonus offers that have active or pending player bonuses';
COMMENT ON FUNCTION validate_bonus_offer() IS 'Validates bonus offer configuration before insert/update';
COMMENT ON FUNCTION validate_player_bonus() IS 'Validates player bonus assignment before insert/update';
COMMENT ON FUNCTION auto_expire_bonuses() IS 'Automatically expires player bonuses past their expiry date';
COMMENT ON FUNCTION validate_bonus_integrity() IS 'Checks bonus system for integrity issues and returns violations';
COMMENT ON VIEW bonus_system_stats IS 'Real-time statistics about the bonus system';
