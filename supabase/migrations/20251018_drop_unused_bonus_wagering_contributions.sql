-- Drop unused bonus_wagering_contributions table
-- This table was created but never used in the application
-- Wagering is tracked directly in player_bonuses table instead

-- Drop dependent indexes first
DROP INDEX IF EXISTS idx_bonus_wagering_bonus;
DROP INDEX IF EXISTS idx_bonus_wagering_transaction;

-- Drop the table
DROP TABLE IF EXISTS bonus_wagering_contributions CASCADE;

-- Add comment to document the removal
COMMENT ON SCHEMA public IS 'Removed bonus_wagering_contributions table on 2025-10-18 - unused, wagering tracked in player_bonuses instead';
