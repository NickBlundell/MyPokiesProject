-- Complete Casino System: Loyalty, Jackpot, and Bonus Implementation
-- Migration for VIP tiers, Progressive Jackpot, and Bonus System

-- ============================================================================
-- LOYALTY/VIP SYSTEM
-- ============================================================================

-- Loyalty tier definitions
CREATE TABLE loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name VARCHAR(50) NOT NULL UNIQUE,
    tier_level INTEGER NOT NULL UNIQUE CHECK (tier_level BETWEEN 1 AND 5),
    points_required INTEGER NOT NULL,
    cashback_rate DECIMAL(4, 2) NOT NULL, -- 0.5, 1.0, 2.0, 3.0, 5.0
    points_per_dollar_redemption INTEGER NOT NULL, -- 100, 90, 80, 70
    withdrawal_priority VARCHAR(20) NOT NULL, -- standard, fast, priority, instant
    birthday_bonus DECIMAL(10, 2) DEFAULT 0,
    has_personal_manager BOOLEAN DEFAULT FALSE,
    jackpot_ticket_rate DECIMAL(10, 2) NOT NULL, -- Wagering amount per ticket (Option A)
    benefits JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO loyalty_tiers (tier_name, tier_level, points_required, cashback_rate, points_per_dollar_redemption, withdrawal_priority, birthday_bonus, has_personal_manager, jackpot_ticket_rate, benefits) VALUES
('Bronze', 1, 0, 0.5, 100, 'standard', 10, FALSE, 250, '{"description": "Entry level tier"}'::jsonb),
('Silver', 2, 500, 1.0, 100, 'fast', 25, FALSE, 225, '{"description": "Active player tier"}'::jsonb),
('Gold', 3, 2500, 2.0, 90, 'fast', 50, FALSE, 200, '{"description": "Regular player tier"}'::jsonb),
('Platinum', 4, 10000, 3.0, 80, 'priority', 100, TRUE, 175, '{"description": "VIP player tier", "weekly_cashback": true}'::jsonb),
('Diamond', 5, 50000, 5.0, 70, 'instant', 250, TRUE, 150, '{"description": "Elite VIP tier", "vip_events": true, "weekly_cashback": true}'::jsonb);

-- Player loyalty status
CREATE TABLE player_loyalty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    current_tier_id UUID REFERENCES loyalty_tiers(id),
    total_points_earned BIGINT DEFAULT 0,
    available_points BIGINT DEFAULT 0,
    lifetime_wagered DECIMAL(20, 2) DEFAULT 0,
    tier_started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_loyalty_user ON player_loyalty(user_id);
CREATE INDEX idx_player_loyalty_tier ON player_loyalty(current_tier_id);

-- Points transaction history
CREATE TABLE loyalty_points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'bonus', 'manual')),
    source VARCHAR(50), -- wagering, mission, promotion, manual
    related_transaction_id UUID REFERENCES transactions(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_points_user ON loyalty_points_transactions(user_id);
CREATE INDEX idx_loyalty_points_created ON loyalty_points_transactions(created_at DESC);

-- ============================================================================
-- PROGRESSIVE JACKPOT SYSTEM
-- ============================================================================

-- Jackpot pools
CREATE TABLE jackpot_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jackpot_name VARCHAR(100) NOT NULL UNIQUE,
    jackpot_type VARCHAR(20) NOT NULL CHECK (jackpot_type IN ('weekly', 'daily', 'monthly')),
    current_amount DECIMAL(20, 2) DEFAULT 0,
    seed_amount DECIMAL(20, 2) NOT NULL,
    contribution_rate DECIMAL(5, 4) NOT NULL, -- 0.0050 = 0.5%
    draw_frequency VARCHAR(20) NOT NULL, -- weekly, daily, monthly
    draw_day_of_week INTEGER, -- 0=Sunday, 3=Wednesday
    draw_time TIME NOT NULL, -- 20:00:00
    next_draw_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'drawing', 'paused')),
    draw_number INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default weekly jackpot
INSERT INTO jackpot_pools (jackpot_name, jackpot_type, current_amount, seed_amount, contribution_rate, draw_frequency, draw_day_of_week, draw_time, next_draw_at, status)
VALUES ('Weekly Main Jackpot', 'weekly', 10000, 10000, 0.0050, 'weekly', 3, '20:00:00',
        date_trunc('week', NOW()) + interval '3 days' + interval '20 hours', 'active');

-- Prize tier configuration
CREATE TABLE jackpot_prize_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jackpot_pool_id UUID REFERENCES jackpot_pools(id) ON DELETE CASCADE,
    tier_name VARCHAR(20) NOT NULL,
    tier_order INTEGER NOT NULL,
    winner_count INTEGER NOT NULL,
    pool_percentage DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(jackpot_pool_id, tier_order)
);

-- Insert default prize tiers for weekly jackpot
INSERT INTO jackpot_prize_tiers (jackpot_pool_id, tier_name, tier_order, winner_count, pool_percentage)
SELECT id, 'Grand', 1, 1, 50.00 FROM jackpot_pools WHERE jackpot_name = 'Weekly Main Jackpot'
UNION ALL
SELECT id, 'Major', 2, 3, 30.00 FROM jackpot_pools WHERE jackpot_name = 'Weekly Main Jackpot'
UNION ALL
SELECT id, 'Minor', 3, 10, 20.00 FROM jackpot_pools WHERE jackpot_name = 'Weekly Main Jackpot';

-- Player jackpot tickets
CREATE TABLE jackpot_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jackpot_pool_id UUID REFERENCES jackpot_pools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ticket_number BIGINT NOT NULL,
    earned_from_transaction_id UUID REFERENCES transactions(id),
    wager_amount DECIMAL(20, 2),
    draw_eligible BOOLEAN DEFAULT TRUE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(jackpot_pool_id, ticket_number)
);

CREATE INDEX idx_jackpot_tickets_pool ON jackpot_tickets(jackpot_pool_id);
CREATE INDEX idx_jackpot_tickets_user ON jackpot_tickets(user_id);
CREATE INDEX idx_jackpot_tickets_eligible ON jackpot_tickets(jackpot_pool_id, draw_eligible);

-- Aggregate ticket counts
CREATE TABLE player_ticket_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jackpot_pool_id UUID REFERENCES jackpot_pools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_tickets INTEGER DEFAULT 0,
    last_ticket_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(jackpot_pool_id, user_id)
);

CREATE INDEX idx_player_ticket_counts_pool_user ON player_ticket_counts(jackpot_pool_id, user_id);

-- Jackpot draw history
CREATE TABLE jackpot_draws (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jackpot_pool_id UUID REFERENCES jackpot_pools(id) ON DELETE CASCADE,
    draw_number INTEGER NOT NULL,
    total_pool_amount DECIMAL(20, 2) NOT NULL,
    total_tickets BIGINT NOT NULL,
    total_winners INTEGER NOT NULL,
    random_seed VARCHAR(255), -- For provably fair verification
    drawn_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jackpot_draws_pool ON jackpot_draws(jackpot_pool_id);
CREATE INDEX idx_jackpot_draws_drawn ON jackpot_draws(drawn_at DESC);

-- Jackpot winners
CREATE TABLE jackpot_winners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id UUID REFERENCES jackpot_draws(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL,
    tier_order INTEGER NOT NULL,
    winning_ticket_number BIGINT NOT NULL,
    tickets_held INTEGER NOT NULL,
    total_tickets_in_pool BIGINT NOT NULL,
    win_odds_percentage DECIMAL(6, 4),
    prize_amount DECIMAL(20, 2) NOT NULL,
    prize_credited BOOLEAN DEFAULT FALSE,
    credited_transaction_id UUID REFERENCES transactions(id),
    credited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jackpot_winners_draw ON jackpot_winners(draw_id);
CREATE INDEX idx_jackpot_winners_user ON jackpot_winners(user_id);
CREATE INDEX idx_jackpot_winners_created ON jackpot_winners(created_at DESC);

-- ============================================================================
-- BONUS SYSTEM
-- ============================================================================

-- Update user_balances to support bonus balance
ALTER TABLE user_balances ADD COLUMN IF NOT EXISTS bonus_balance DECIMAL(20, 8) DEFAULT 0 CHECK (bonus_balance >= 0);
ALTER TABLE user_balances ADD COLUMN IF NOT EXISTS locked_bonus DECIMAL(20, 8) DEFAULT 0 CHECK (locked_bonus >= 0);

-- Bonus offer configurations
CREATE TABLE bonus_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bonus_code VARCHAR(50) UNIQUE,
    bonus_name VARCHAR(100) NOT NULL,
    bonus_type VARCHAR(30) NOT NULL CHECK (bonus_type IN ('deposit_match', 'no_deposit', 'cashback', 'free_spins', 'reload')),
    match_percentage DECIMAL(5, 2), -- 100.00 = 100%
    max_bonus_amount DECIMAL(20, 2),
    min_deposit_amount DECIMAL(20, 2),
    fixed_bonus_amount DECIMAL(20, 2), -- For no-deposit bonuses
    wagering_requirement_multiplier INTEGER NOT NULL, -- 30x, 40x
    wagering_applies_to VARCHAR(20) DEFAULT 'bonus_only' CHECK (wagering_applies_to IN ('bonus_only', 'deposit_and_bonus')),
    max_cashout DECIMAL(20, 2), -- For no-deposit bonuses
    max_bet_with_bonus DECIMAL(20, 2), -- Max bet limit while bonus active
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc. (for daily bonuses)
    terms_conditions TEXT,
    active BOOLEAN DEFAULT TRUE,
    auto_apply BOOLEAN DEFAULT FALSE, -- Auto-apply on eligible deposit
    one_time_per_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game wagering contribution weights
CREATE TABLE game_wagering_weights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_type VARCHAR(50) NOT NULL UNIQUE,
    contribution_percentage DECIMAL(5, 2) NOT NULL, -- 100.00 = 100%
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default game weights
INSERT INTO game_wagering_weights (game_type, contribution_percentage) VALUES
('slots', 100.00),
('video_poker', 50.00),
('blackjack', 20.00),
('roulette', 20.00),
('baccarat', 20.00),
('live_dealer', 20.00),
('table_games', 20.00);

-- Player bonus instances
CREATE TABLE player_bonuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bonus_offer_id UUID REFERENCES bonus_offers(id),
    bonus_code_used VARCHAR(50),
    bonus_amount DECIMAL(20, 2) NOT NULL,
    deposit_amount DECIMAL(20, 2), -- Original deposit that triggered bonus
    wagering_requirement_total DECIMAL(20, 2) NOT NULL,
    wagering_completed DECIMAL(20, 2) DEFAULT 0,
    wagering_percentage DECIMAL(5, 2) DEFAULT 0,
    max_cashout DECIMAL(20, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'forfeited', 'expired', 'cancelled')),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    forfeited_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_bonuses_user ON player_bonuses(user_id);
CREATE INDEX idx_player_bonuses_status ON player_bonuses(status);
CREATE INDEX idx_player_bonuses_expires ON player_bonuses(expires_at);

-- Bonus wagering contribution tracking
CREATE TABLE bonus_wagering_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_bonus_id UUID REFERENCES player_bonuses(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id),
    game_type VARCHAR(50),
    wager_amount DECIMAL(20, 2) NOT NULL,
    contribution_percentage DECIMAL(5, 2) NOT NULL,
    contribution_amount DECIMAL(20, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bonus_wagering_bonus ON bonus_wagering_contributions(player_bonus_id);
CREATE INDEX idx_bonus_wagering_transaction ON bonus_wagering_contributions(transaction_id);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_loyalty_updated_at
    BEFORE UPDATE ON player_loyalty
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_jackpot_pools_updated_at
    BEFORE UPDATE ON jackpot_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bonus_offers_updated_at
    BEFORE UPDATE ON bonus_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_player_bonuses_updated_at
    BEFORE UPDATE ON player_bonuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE player_loyalty;
ALTER PUBLICATION supabase_realtime ADD TABLE jackpot_pools;
ALTER PUBLICATION supabase_realtime ADD TABLE jackpot_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE player_ticket_counts;
ALTER PUBLICATION supabase_realtime ADD TABLE jackpot_winners;
ALTER PUBLICATION supabase_realtime ADD TABLE player_bonuses;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jackpot_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE jackpot_prize_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jackpot_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ticket_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jackpot_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE jackpot_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_wagering_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_wagering_contributions ENABLE ROW LEVEL SECURITY;

-- Public read for tier definitions
CREATE POLICY "Anyone can view loyalty tiers" ON loyalty_tiers FOR SELECT USING (true);
CREATE POLICY "Anyone can view jackpot pools" ON jackpot_pools FOR SELECT USING (true);
CREATE POLICY "Anyone can view prize tiers" ON jackpot_prize_tiers FOR SELECT USING (true);
CREATE POLICY "Anyone can view bonus offers" ON bonus_offers FOR SELECT USING (active = true);
CREATE POLICY "Anyone can view game weights" ON game_wagering_weights FOR SELECT USING (true);
CREATE POLICY "Anyone can view jackpot draws" ON jackpot_draws FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service role full access to player_loyalty" ON player_loyalty FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to loyalty_points_transactions" ON loyalty_points_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to jackpot_tickets" ON jackpot_tickets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to player_ticket_counts" ON player_ticket_counts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to jackpot_winners" ON jackpot_winners FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to player_bonuses" ON player_bonuses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to bonus_wagering_contributions" ON bonus_wagering_contributions FOR ALL USING (auth.role() = 'service_role');

-- Users can view their own data
CREATE POLICY "Users can view own loyalty status" ON player_loyalty FOR SELECT
    USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = player_loyalty.user_id));

CREATE POLICY "Users can view own points history" ON loyalty_points_transactions FOR SELECT
    USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = loyalty_points_transactions.user_id));

CREATE POLICY "Users can view own tickets" ON jackpot_tickets FOR SELECT
    USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = jackpot_tickets.user_id));

CREATE POLICY "Users can view own ticket counts" ON player_ticket_counts FOR SELECT
    USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = player_ticket_counts.user_id));

CREATE POLICY "Users can view own bonuses" ON player_bonuses FOR SELECT
    USING (auth.uid() IN (SELECT auth_user_id FROM users WHERE id = player_bonuses.user_id));

CREATE POLICY "Users can view own wagering contributions" ON bonus_wagering_contributions FOR SELECT
    USING (auth.uid() IN (
        SELECT u.auth_user_id FROM users u
        INNER JOIN player_bonuses pb ON u.id = pb.user_id
        WHERE pb.id = bonus_wagering_contributions.player_bonus_id
    ));

-- Winners are public (with user info)
CREATE POLICY "Anyone can view jackpot winners" ON jackpot_winners FOR SELECT USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE loyalty_tiers IS 'VIP tier definitions with benefits and jackpot ticket rates';
COMMENT ON TABLE player_loyalty IS 'Player loyalty status and points balance';
COMMENT ON TABLE jackpot_pools IS 'Progressive jackpot pool configurations';
COMMENT ON TABLE jackpot_tickets IS 'Individual player tickets for jackpot draws';
COMMENT ON TABLE jackpot_winners IS 'Historical record of jackpot winners';
COMMENT ON TABLE bonus_offers IS 'Bonus offer configurations (deposit match, no-deposit, etc)';
COMMENT ON TABLE player_bonuses IS 'Active and historical player bonus instances';
COMMENT ON TABLE bonus_wagering_contributions IS 'Tracks wagering progress toward bonus requirements';
