-- Games Catalog Schema
-- Migration for storing individual casino games from Fundist

-- ============================================================================
-- Games Catalog Table
-- ============================================================================

-- Games table - stores all available casino games
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id VARCHAR(50) UNIQUE NOT NULL, -- Unique game identifier from provider
    system_id VARCHAR(50) NOT NULL, -- System ID from Fundist (e.g., "998")
    game_type VARCHAR(100) NOT NULL, -- Game type (e.g., "roulette", "slots")
    game_name VARCHAR(255) NOT NULL, -- Display name for players
    provider VARCHAR(100), -- Game provider name
    category VARCHAR(50), -- Main category (slots, table, live, etc.)
    subcategory VARCHAR(50), -- Subcategory for filtering
    thumbnail_url TEXT, -- Game thumbnail image URL
    banner_url TEXT, -- Game banner image URL
    description TEXT, -- Game description
    rtp DECIMAL(5, 2), -- Return to player percentage (e.g., 96.50)
    min_bet DECIMAL(10, 2), -- Minimum bet amount
    max_bet DECIMAL(10, 2), -- Maximum bet amount
    volatility VARCHAR(20) CHECK (volatility IN ('low', 'medium', 'high', 'very_high')), -- Game volatility
    has_jackpot BOOLEAN DEFAULT FALSE, -- Whether game has jackpot
    has_freespins BOOLEAN DEFAULT FALSE, -- Whether game supports free spins
    is_new BOOLEAN DEFAULT FALSE, -- Mark as new game
    is_featured BOOLEAN DEFAULT FALSE, -- Featured on homepage
    is_active BOOLEAN DEFAULT TRUE, -- Game is available to play
    display_order INTEGER DEFAULT 0, -- Order for sorting
    tags TEXT[], -- Search tags
    supported_currencies TEXT[], -- Supported currency codes
    lines INTEGER, -- Number of paylines (for slots)
    reels INTEGER, -- Number of reels (for slots)
    max_multiplier DECIMAL(10, 2), -- Maximum win multiplier
    metadata JSONB, -- Additional game metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for games table
CREATE INDEX idx_games_game_id ON games(game_id);
CREATE INDEX idx_games_system_id ON games(system_id);
CREATE INDEX idx_games_game_type ON games(game_type);
CREATE INDEX idx_games_provider ON games(provider);
CREATE INDEX idx_games_category ON games(category);
CREATE INDEX idx_games_active ON games(is_active);
CREATE INDEX idx_games_featured ON games(is_featured);
CREATE INDEX idx_games_new ON games(is_new);
CREATE INDEX idx_games_display_order ON games(display_order);
CREATE INDEX idx_games_tags ON games USING GIN(tags);

-- ============================================================================
-- Update game_rounds to reference games
-- ============================================================================

-- Add foreign key to games table
ALTER TABLE game_rounds
ADD COLUMN game_id UUID REFERENCES games(id) ON DELETE SET NULL;

CREATE INDEX idx_game_rounds_game_id ON game_rounds(game_id);

-- ============================================================================
-- Game statistics table
-- ============================================================================

-- Track game play statistics
CREATE TABLE game_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    total_rounds INTEGER DEFAULT 0,
    total_players INTEGER DEFAULT 0,
    total_wagered DECIMAL(20, 8) DEFAULT 0,
    total_won DECIMAL(20, 8) DEFAULT 0,
    biggest_win DECIMAL(20, 8) DEFAULT 0,
    biggest_win_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    biggest_win_at TIMESTAMPTZ,
    last_played_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_stats_game_id ON game_statistics(game_id);
CREATE INDEX idx_game_stats_total_wagered ON game_statistics(total_wagered DESC);

-- ============================================================================
-- Player favorites
-- ============================================================================

-- Track player favorite games
CREATE TABLE player_favorite_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);

CREATE INDEX idx_favorites_user ON player_favorite_games(user_id);
CREATE INDEX idx_favorites_game ON player_favorite_games(game_id);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update games updated_at timestamp
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update game statistics updated_at timestamp
CREATE TRIGGER update_game_stats_updated_at
    BEFORE UPDATE ON game_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_favorite_games ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to games"
    ON games FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to game_statistics"
    ON game_statistics FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to player_favorite_games"
    ON player_favorite_games FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Public can view active games
CREATE POLICY "Anyone can view active games"
    ON games FOR SELECT
    USING (is_active = TRUE);

-- Public can view game statistics
CREATE POLICY "Anyone can view game statistics"
    ON game_statistics FOR SELECT
    USING (TRUE);

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorite games"
    ON player_favorite_games FOR SELECT
    USING (auth.uid() = user_id);

-- Users can add their own favorites
CREATE POLICY "Users can add their own favorite games"
    ON player_favorite_games FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can delete their own favorite games"
    ON player_favorite_games FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get or create game by Fundist game descriptor
CREATE OR REPLACE FUNCTION get_or_create_game(
    p_game_desc VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_game_id UUID;
    v_system_id VARCHAR;
    v_game_type VARCHAR;
    v_parts TEXT[];
BEGIN
    -- Parse game_desc format: "{SystemID}:{GameType}"
    v_parts := string_to_array(p_game_desc, ':');

    IF array_length(v_parts, 1) = 2 THEN
        v_system_id := v_parts[1];
        v_game_type := v_parts[2];

        -- Try to find existing game
        SELECT id INTO v_game_id
        FROM games
        WHERE system_id = v_system_id AND game_type = v_game_type;

        -- Create if not exists
        IF v_game_id IS NULL THEN
            INSERT INTO games (
                game_id,
                system_id,
                game_type,
                game_name,
                is_active
            ) VALUES (
                p_game_desc,
                v_system_id,
                v_game_type,
                v_game_type, -- Default to game type as name
                TRUE
            )
            RETURNING id INTO v_game_id;

            -- Initialize statistics
            INSERT INTO game_statistics (game_id)
            VALUES (v_game_id);
        END IF;
    END IF;

    RETURN v_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update game statistics
CREATE OR REPLACE FUNCTION update_game_statistics(
    p_game_id UUID,
    p_user_id UUID,
    p_wagered DECIMAL,
    p_won DECIMAL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO game_statistics (
        game_id,
        total_rounds,
        total_players,
        total_wagered,
        total_won,
        biggest_win,
        biggest_win_user_id,
        biggest_win_at,
        last_played_at
    ) VALUES (
        p_game_id,
        1,
        1,
        p_wagered,
        p_won,
        p_won,
        p_user_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (game_id) DO UPDATE SET
        total_rounds = game_statistics.total_rounds + 1,
        total_wagered = game_statistics.total_wagered + p_wagered,
        total_won = game_statistics.total_won + p_won,
        biggest_win = CASE
            WHEN p_won > game_statistics.biggest_win THEN p_won
            ELSE game_statistics.biggest_win
        END,
        biggest_win_user_id = CASE
            WHEN p_won > game_statistics.biggest_win THEN p_user_id
            ELSE game_statistics.biggest_win_user_id
        END,
        biggest_win_at = CASE
            WHEN p_won > game_statistics.biggest_win THEN NOW()
            ELSE game_statistics.biggest_win_at
        END,
        last_played_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger to auto-link games to rounds and update statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION link_game_round_to_game()
RETURNS TRIGGER AS $$
DECLARE
    v_game_id UUID;
BEGIN
    -- Get or create game from game_desc
    IF NEW.game_desc IS NOT NULL THEN
        v_game_id := get_or_create_game(NEW.game_desc);
        NEW.game_id := v_game_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER link_game_round_to_game_trigger
    BEFORE INSERT ON game_rounds
    FOR EACH ROW
    EXECUTE FUNCTION link_game_round_to_game();

-- Update statistics when round is completed
CREATE OR REPLACE FUNCTION update_game_stats_on_round_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update stats when round status changes to completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        IF NEW.game_id IS NOT NULL THEN
            PERFORM update_game_statistics(
                NEW.game_id,
                NEW.user_id,
                NEW.total_bet,
                NEW.total_win
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_game_stats_on_round_complete_trigger
    AFTER UPDATE ON game_rounds
    FOR EACH ROW
    EXECUTE FUNCTION update_game_stats_on_round_complete();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE games IS 'Catalog of all available casino games';
COMMENT ON TABLE game_statistics IS 'Aggregate statistics per game';
COMMENT ON TABLE player_favorite_games IS 'Player favorite games for quick access';

COMMENT ON COLUMN games.game_id IS 'Unique game identifier (can be Fundist game_desc)';
COMMENT ON COLUMN games.system_id IS 'System ID from Fundist game_desc';
COMMENT ON COLUMN games.game_type IS 'Game type from Fundist game_desc';
COMMENT ON COLUMN games.rtp IS 'Return to player percentage';
COMMENT ON COLUMN games.volatility IS 'Game volatility level';
COMMENT ON COLUMN games.display_order IS 'Sort order for game listings';
