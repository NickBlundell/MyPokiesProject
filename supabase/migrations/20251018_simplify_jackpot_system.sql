-- Simplify jackpot system by removing redundant tables
-- player_ticket_counts is redundant - can just COUNT from jackpot_tickets
-- jackpot_draws can be simplified - draw info stored with winners

-- Drop player_ticket_counts (0 rows - redundant with COUNT(*) from jackpot_tickets)
DROP TABLE IF EXISTS player_ticket_counts CASCADE;

-- Drop jackpot_draws (0 rows - draw info can be stored directly with winners)
-- The draw metadata (draw_number, total_pool, etc) can be added to jackpot_winners
DROP TABLE IF EXISTS jackpot_draws CASCADE;

-- Add draw-related fields to jackpot_winners table
-- This way each winner record contains its own draw context
ALTER TABLE jackpot_winners
  DROP COLUMN IF EXISTS draw_id,
  ADD COLUMN IF NOT EXISTS draw_number INTEGER,
  ADD COLUMN IF NOT EXISTS draw_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_pool_amount NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS total_tickets_in_draw BIGINT;

-- Add index for querying winners by draw number
CREATE INDEX IF NOT EXISTS idx_jackpot_winners_draw_number
  ON jackpot_winners(draw_number, draw_date DESC);

-- Add index for querying winners by user
CREATE INDEX IF NOT EXISTS idx_jackpot_winners_user_id
  ON jackpot_winners(user_id, draw_date DESC);

-- Create a view for ticket counts (replaces player_ticket_counts table)
CREATE OR REPLACE VIEW player_jackpot_ticket_counts AS
SELECT
  user_id,
  jackpot_pool_id,
  COUNT(*) as total_tickets,
  MAX(earned_at) as last_ticket_at
FROM jackpot_tickets
WHERE draw_eligible = TRUE
GROUP BY user_id, jackpot_pool_id;

COMMENT ON VIEW player_jackpot_ticket_counts IS 'Dynamic view of player ticket counts - replaces player_ticket_counts table';

-- Add comments
COMMENT ON COLUMN jackpot_winners.draw_number IS 'Draw number for this win (replaces draw_id FK)';
COMMENT ON COLUMN jackpot_winners.draw_date IS 'Date of the draw for this win';
COMMENT ON COLUMN jackpot_winners.total_pool_amount IS 'Total jackpot pool amount at time of draw';
COMMENT ON COLUMN jackpot_winners.total_tickets_in_draw IS 'Total tickets in the pool at time of draw';
