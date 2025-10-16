-- Fix RLS policies to allow public read access for games and jackpot data
-- These tables need to be viewable by anonymous users

-- Allow public read access to games table
DROP POLICY IF EXISTS "Public can view active games" ON games;
CREATE POLICY "Public can view active games" ON games
  FOR SELECT
  USING (is_active = true);

-- Allow public read access to game_statistics
DROP POLICY IF EXISTS "Public can view game statistics" ON game_statistics;
CREATE POLICY "Public can view game statistics" ON game_statistics
  FOR SELECT
  USING (true);

-- Allow public read access to jackpot_pools
DROP POLICY IF EXISTS "Public can view active jackpot pools" ON jackpot_pools;
CREATE POLICY "Public can view active jackpot pools" ON jackpot_pools
  FOR SELECT
  USING (status = 'active');

-- Allow public read access to jackpot_prize_tiers
DROP POLICY IF EXISTS "Public can view jackpot prize tiers" ON jackpot_prize_tiers;
CREATE POLICY "Public can view jackpot prize tiers" ON jackpot_prize_tiers
  FOR SELECT
  USING (true);

-- Allow public read access to loyalty_tiers
DROP POLICY IF EXISTS "Public can view loyalty tiers" ON loyalty_tiers;
CREATE POLICY "Public can view loyalty tiers" ON loyalty_tiers
  FOR SELECT
  USING (true);

-- Allow public read access to bonus_offers
DROP POLICY IF EXISTS "Public can view active bonus offers" ON bonus_offers;
CREATE POLICY "Public can view active bonus offers" ON bonus_offers
  FOR SELECT
  USING (active = true);

-- Allow public read access to jackpot winners (for displaying recent winners)
DROP POLICY IF EXISTS "Public can view jackpot winners" ON jackpot_winners;
CREATE POLICY "Public can view jackpot winners" ON jackpot_winners
  FOR SELECT
  USING (true);

-- Allow public read access to jackpot draws
DROP POLICY IF EXISTS "Public can view jackpot draws" ON jackpot_draws;
CREATE POLICY "Public can view jackpot draws" ON jackpot_draws
  FOR SELECT
  USING (true);
