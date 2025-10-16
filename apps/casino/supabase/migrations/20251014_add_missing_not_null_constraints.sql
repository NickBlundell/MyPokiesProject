-- Migration: Add Missing NOT NULL Constraints
-- Purpose: Add NOT NULL constraints to columns that should never be NULL for data integrity
-- Priority: 8/10
-- Estimated Time: 3 hours

BEGIN;

-- ============================================================================
-- STEP 1: Fix existing NULL values (if any)
-- ============================================================================

-- Fix users.created_at
UPDATE users
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

-- Fix transactions.created_at
UPDATE transactions
SET created_at = COALESCE(created_at, processed_at, NOW())
WHERE created_at IS NULL;

-- Fix player_bonuses.issued_at
UPDATE player_bonuses
SET issued_at = COALESCE(issued_at, created_at, NOW())
WHERE issued_at IS NULL;

-- Fix game_rounds.started_at
UPDATE game_rounds
SET started_at = COALESCE(started_at, NOW())
WHERE started_at IS NULL;

-- Fix marketing_campaigns.created_at
UPDATE marketing_campaigns
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

-- Fix marketing_campaigns.updated_at
UPDATE marketing_campaigns
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- Fix player_segments.created_at
UPDATE player_segments
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

-- Fix player_segments.updated_at
UPDATE player_segments
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- Fix scheduled_reports.created_at
UPDATE scheduled_reports
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

-- Fix scheduled_reports.updated_at
UPDATE scheduled_reports
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- ============================================================================
-- STEP 2: Add NOT NULL constraints
-- ============================================================================

-- Add NOT NULL constraint to users.created_at
ALTER TABLE users
ALTER COLUMN created_at SET NOT NULL;

-- Add NOT NULL constraint to transactions.created_at
ALTER TABLE transactions
ALTER COLUMN created_at SET NOT NULL;

-- Add NOT NULL constraint to player_bonuses.issued_at
ALTER TABLE player_bonuses
ALTER COLUMN issued_at SET NOT NULL;

-- Add NOT NULL constraint to game_rounds.started_at
ALTER TABLE game_rounds
ALTER COLUMN started_at SET NOT NULL;

-- Add NOT NULL constraints to marketing_campaigns timestamp columns
ALTER TABLE marketing_campaigns
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- Add NOT NULL constraints to player_segments timestamp columns
ALTER TABLE player_segments
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- Add NOT NULL constraints to scheduled_reports timestamp columns
ALTER TABLE scheduled_reports
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- ============================================================================
-- STEP 3: Update column defaults to ensure NOT NULL on insert
-- ============================================================================

-- Ensure defaults are set for all timestamp columns
ALTER TABLE users
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE transactions
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE player_bonuses
ALTER COLUMN issued_at SET DEFAULT NOW();

ALTER TABLE game_rounds
ALTER COLUMN started_at SET DEFAULT NOW();

ALTER TABLE marketing_campaigns
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE player_segments
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE scheduled_reports
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

-- ============================================================================
-- STEP 4: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN users.created_at IS 'User registration timestamp (NOT NULL)';
COMMENT ON COLUMN transactions.created_at IS 'Transaction creation timestamp (NOT NULL)';
COMMENT ON COLUMN player_bonuses.issued_at IS 'Bonus issuance timestamp (NOT NULL)';
COMMENT ON COLUMN game_rounds.started_at IS 'Game round start timestamp (NOT NULL)';
COMMENT ON COLUMN marketing_campaigns.created_at IS 'Campaign creation timestamp (NOT NULL)';
COMMENT ON COLUMN marketing_campaigns.updated_at IS 'Last campaign update timestamp (NOT NULL)';
COMMENT ON COLUMN player_segments.created_at IS 'Segment creation timestamp (NOT NULL)';
COMMENT ON COLUMN player_segments.updated_at IS 'Last segment update timestamp (NOT NULL)';
COMMENT ON COLUMN scheduled_reports.created_at IS 'Report configuration creation timestamp (NOT NULL)';
COMMENT ON COLUMN scheduled_reports.updated_at IS 'Last report configuration update timestamp (NOT NULL)';

-- ============================================================================
-- VERIFICATION: Check that no NULLs remain
-- ============================================================================

DO $$
DECLARE
    v_null_count INTEGER;
BEGIN
    -- Check users.created_at
    SELECT COUNT(*) INTO v_null_count FROM users WHERE created_at IS NULL;
    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'Found % NULL values in users.created_at', v_null_count;
    END IF;

    -- Check transactions.created_at
    SELECT COUNT(*) INTO v_null_count FROM transactions WHERE created_at IS NULL;
    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'Found % NULL values in transactions.created_at', v_null_count;
    END IF;

    -- Check player_bonuses.issued_at
    SELECT COUNT(*) INTO v_null_count FROM player_bonuses WHERE issued_at IS NULL;
    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'Found % NULL values in player_bonuses.issued_at', v_null_count;
    END IF;

    -- Check game_rounds.started_at
    SELECT COUNT(*) INTO v_null_count FROM game_rounds WHERE started_at IS NULL;
    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'Found % NULL values in game_rounds.started_at', v_null_count;
    END IF;

    -- Check marketing_campaigns columns
    SELECT COUNT(*) INTO v_null_count FROM marketing_campaigns WHERE created_at IS NULL OR updated_at IS NULL;
    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'Found % NULL values in marketing_campaigns timestamp columns', v_null_count;
    END IF;

    -- Check player_segments columns
    SELECT COUNT(*) INTO v_null_count FROM player_segments WHERE created_at IS NULL OR updated_at IS NULL;
    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'Found % NULL values in player_segments timestamp columns', v_null_count;
    END IF;

    -- Check scheduled_reports columns
    SELECT COUNT(*) INTO v_null_count FROM scheduled_reports WHERE created_at IS NULL OR updated_at IS NULL;
    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'Found % NULL values in scheduled_reports timestamp columns', v_null_count;
    END IF;

    RAISE NOTICE 'All NOT NULL constraints successfully added. No NULL values found.';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (in case migration needs to be reverted)
-- ============================================================================
-- To rollback this migration, run:
/*
BEGIN;

-- Remove NOT NULL constraints
ALTER TABLE users ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE transactions ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE player_bonuses ALTER COLUMN issued_at DROP NOT NULL;
ALTER TABLE game_rounds ALTER COLUMN started_at DROP NOT NULL;
ALTER TABLE marketing_campaigns
    ALTER COLUMN created_at DROP NOT NULL,
    ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE player_segments
    ALTER COLUMN created_at DROP NOT NULL,
    ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE scheduled_reports
    ALTER COLUMN created_at DROP NOT NULL,
    ALTER COLUMN updated_at DROP NOT NULL;

COMMIT;
*/