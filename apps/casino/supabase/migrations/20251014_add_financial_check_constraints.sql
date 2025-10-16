-- Migration: Add CHECK constraints to financial columns
-- Purpose: Prevent data corruption and invalid amounts in financial tables
-- Created: 2025-10-14
-- Author: Claude Code

-- This migration adds comprehensive CHECK constraints to ensure data integrity
-- for all financial columns across the casino platform.

BEGIN;

-- =============================================================================
-- TRANSACTIONS TABLE
-- =============================================================================
-- Ensures all transaction amounts and balances are valid and within safe limits

-- Constraint: Validate transaction amounts
-- Ensures amounts are non-negative and within safe numeric limits (10 billion)
-- This prevents negative transactions and numeric overflow
ALTER TABLE transactions
  ADD CONSTRAINT check_amount_valid
    CHECK (amount >= 0 AND amount <= 9999999999.99);

-- Constraint: Validate balance_before
-- Ensures the balance before transaction is non-negative
ALTER TABLE transactions
  ADD CONSTRAINT check_balance_before_valid
    CHECK (balance_before >= 0 AND balance_before <= 9999999999.99);

-- Constraint: Validate balance_after
-- Ensures the balance after transaction is non-negative
-- This is critical for preventing negative balance exploits
ALTER TABLE transactions
  ADD CONSTRAINT check_balance_after_valid
    CHECK (balance_after >= 0 AND balance_after <= 9999999999.99);

COMMENT ON CONSTRAINT check_amount_valid ON transactions IS
  'Ensures transaction amounts are non-negative and within safe limits (max 9,999,999,999.99)';
COMMENT ON CONSTRAINT check_balance_before_valid ON transactions IS
  'Ensures balance_before is non-negative and within safe limits';
COMMENT ON CONSTRAINT check_balance_after_valid ON transactions IS
  'Ensures balance_after is non-negative and within safe limits, preventing negative balance exploits';

-- =============================================================================
-- USER_BALANCES TABLE
-- =============================================================================
-- Note: Basic non-negativity constraints already exist (user_balances_balance_check,
-- user_balances_bonus_balance_check, user_balances_locked_bonus_check)
-- We're adding upper limit constraints for overflow protection

-- Constraint: Validate balance upper limit
-- Adds overflow protection while preserving existing non-negativity constraint
ALTER TABLE user_balances
  DROP CONSTRAINT IF EXISTS user_balances_balance_check,
  ADD CONSTRAINT check_balance_valid
    CHECK (balance >= 0 AND balance <= 9999999999.99);

-- Constraint: Validate bonus_balance upper limit
-- Adds overflow protection while preserving existing non-negativity constraint
ALTER TABLE user_balances
  DROP CONSTRAINT IF EXISTS user_balances_bonus_balance_check,
  ADD CONSTRAINT check_bonus_balance_valid
    CHECK (bonus_balance >= 0 AND bonus_balance <= 9999999999.99);

-- Constraint: Validate locked_bonus upper limit
-- Adds overflow protection while preserving existing non-negativity constraint
ALTER TABLE user_balances
  DROP CONSTRAINT IF EXISTS user_balances_locked_bonus_check,
  ADD CONSTRAINT check_locked_bonus_valid
    CHECK (locked_bonus >= 0 AND locked_bonus <= 9999999999.99);

COMMENT ON CONSTRAINT check_balance_valid ON user_balances IS
  'Ensures user balance is non-negative and within safe limits (max 9,999,999,999.99)';
COMMENT ON CONSTRAINT check_bonus_balance_valid ON user_balances IS
  'Ensures bonus balance is non-negative and within safe limits';
COMMENT ON CONSTRAINT check_locked_bonus_valid ON user_balances IS
  'Ensures locked bonus is non-negative and within safe limits';

-- =============================================================================
-- JACKPOT_POOLS TABLE
-- =============================================================================
-- Ensures jackpot amounts are valid and logically consistent

-- Constraint: Validate current_amount
-- Ensures current jackpot amount is at least the seed amount (jackpots can only grow)
-- and within safe numeric limits
ALTER TABLE jackpot_pools
  ADD CONSTRAINT check_current_amount_valid
    CHECK (current_amount >= seed_amount AND current_amount <= 9999999999.99);

-- Constraint: Validate seed_amount
-- Ensures seed amount (base/starting amount) is non-negative and within limits
ALTER TABLE jackpot_pools
  ADD CONSTRAINT check_seed_amount_valid
    CHECK (seed_amount >= 0 AND seed_amount <= 9999999999.99);

-- Constraint: Validate contribution_rate
-- Ensures contribution rate is between 0 and 100 percent (expressed as 0.0 to 100.0)
ALTER TABLE jackpot_pools
  ADD CONSTRAINT check_contribution_rate_valid
    CHECK (contribution_rate >= 0 AND contribution_rate <= 100);

COMMENT ON CONSTRAINT check_current_amount_valid ON jackpot_pools IS
  'Ensures current jackpot amount is at least the seed amount and within safe limits';
COMMENT ON CONSTRAINT check_seed_amount_valid ON jackpot_pools IS
  'Ensures seed amount is non-negative and within safe limits';
COMMENT ON CONSTRAINT check_contribution_rate_valid ON jackpot_pools IS
  'Ensures contribution rate is between 0 and 100 percent';

-- =============================================================================
-- PLAYER_BONUSES TABLE
-- =============================================================================
-- Note: Some constraints already exist (check_bonus_amount_positive, check_wagering_non_negative)
-- We're adding enhanced constraints with overflow protection

-- Constraint: Validate bonus_amount
-- Enhanced version with upper limit protection
-- The existing check_bonus_amount_positive constraint already ensures > 0
ALTER TABLE player_bonuses
  DROP CONSTRAINT IF EXISTS check_bonus_amount_positive,
  ADD CONSTRAINT check_bonus_amount_valid
    CHECK (bonus_amount > 0 AND bonus_amount <= 9999999999.99);

-- Constraint: Validate deposit_amount
-- Ensures deposit amounts are non-negative when present
ALTER TABLE player_bonuses
  ADD CONSTRAINT check_deposit_amount_valid
    CHECK (deposit_amount IS NULL OR (deposit_amount >= 0 AND deposit_amount <= 9999999999.99));

-- Constraint: Validate wagering_requirement_total
-- Ensures wagering requirements are non-negative and within limits
ALTER TABLE player_bonuses
  ADD CONSTRAINT check_wagering_requirement_total_valid
    CHECK (wagering_requirement_total >= 0 AND wagering_requirement_total <= 99999999999.99);

-- Constraint: Validate wagering_completed
-- Enhanced version ensuring completed wagering doesn't exceed total (with 1% tolerance for rounding)
-- This replaces the existing check_wagering_non_negative constraint
ALTER TABLE player_bonuses
  DROP CONSTRAINT IF EXISTS check_wagering_non_negative,
  ADD CONSTRAINT check_wagering_completed_valid
    CHECK (wagering_completed >= 0
           AND wagering_completed <= wagering_requirement_total * 1.01
           AND wagering_completed <= 99999999999.99);

-- Constraint: Validate max_cashout
-- Ensures max cashout is positive when set and within limits
ALTER TABLE player_bonuses
  ADD CONSTRAINT check_max_cashout_valid
    CHECK (max_cashout IS NULL OR (max_cashout > 0 AND max_cashout <= 9999999999.99));

-- Constraint: Validate wagering_percentage
-- Ensures wagering percentage is between 0 and 100 (with 1% tolerance)
ALTER TABLE player_bonuses
  ADD CONSTRAINT check_wagering_percentage_valid
    CHECK (wagering_percentage IS NULL OR (wagering_percentage >= 0 AND wagering_percentage <= 101));

COMMENT ON CONSTRAINT check_bonus_amount_valid ON player_bonuses IS
  'Ensures bonus amounts are positive and within safe limits (max 9,999,999,999.99)';
COMMENT ON CONSTRAINT check_deposit_amount_valid ON player_bonuses IS
  'Ensures deposit amounts are non-negative and within safe limits when present';
COMMENT ON CONSTRAINT check_wagering_requirement_total_valid ON player_bonuses IS
  'Ensures wagering requirements are non-negative and within safe limits';
COMMENT ON CONSTRAINT check_wagering_completed_valid ON player_bonuses IS
  'Ensures wagering completed is non-negative, does not exceed requirement (with 1% tolerance), and within safe limits';
COMMENT ON CONSTRAINT check_max_cashout_valid ON player_bonuses IS
  'Ensures max cashout is positive when set and within safe limits';
COMMENT ON CONSTRAINT check_wagering_percentage_valid ON player_bonuses IS
  'Ensures wagering percentage is between 0 and 101 (with 1% tolerance for rounding)';

-- =============================================================================
-- VERIFICATION AND SUMMARY
-- =============================================================================

-- Log the constraint additions
DO $$
BEGIN
  RAISE NOTICE 'Financial CHECK constraints successfully added:';
  RAISE NOTICE '  - transactions: 3 new constraints (amount, balance_before, balance_after)';
  RAISE NOTICE '  - user_balances: 3 enhanced constraints (balance, bonus_balance, locked_bonus)';
  RAISE NOTICE '  - jackpot_pools: 3 new constraints (current_amount, seed_amount, contribution_rate)';
  RAISE NOTICE '  - player_bonuses: 6 enhanced constraints (bonus_amount, deposit_amount, wagering fields, max_cashout, percentage)';
  RAISE NOTICE 'Total: 15 constraints added/enhanced for financial data integrity';
END $$;

COMMIT;
