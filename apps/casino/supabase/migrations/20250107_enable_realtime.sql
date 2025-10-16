-- Enable Realtime for player-facing tables
-- This allows instant updates when balances or transactions change

-- Enable Realtime on user_balances
ALTER PUBLICATION supabase_realtime ADD TABLE user_balances;

-- Enable Realtime on transactions
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Enable Realtime on game_rounds
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;

-- Enable Realtime on promotion_wins
ALTER PUBLICATION supabase_realtime ADD TABLE promotion_wins;

-- Note: Realtime respects RLS policies, so users will only receive
-- updates for their own data based on the existing RLS policies

COMMENT ON PUBLICATION supabase_realtime IS 'Realtime publication for player data updates';
