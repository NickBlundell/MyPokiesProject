-- ============================================================================
-- Populate Games Catalog with Popular Slot Games
-- ============================================================================
-- This migration adds popular online casino slot games to the games catalog
-- Games are from reputable providers: NetEnt, Pragmatic Play, Play'n GO, Microgaming

-- Note: Thumbnail URLs are placeholder paths - these should be replaced with
-- actual image URLs from your CDN or image hosting service

-- ============================================================================
-- NetEnt Slots (Industry Leader)
-- ============================================================================

INSERT INTO games (
    game_id, system_id, game_type, game_name, provider, category, subcategory,
    thumbnail_url, rtp, volatility, has_jackpot, has_freespins,
    is_featured, is_active, display_order, tags, lines, reels, max_multiplier
) VALUES
-- Starburst - Most iconic NetEnt slot
('netent_starburst', 'NETENT_001', 'slots', 'Starburst', 'NetEnt', 'slots', 'video_slots',
 '/images/games/starburst.jpg', 96.09, 'low', false, true,
 true, true, 1, ARRAY['popular', 'classic', 'space', 'gems'], 10, 5, 50000),

-- Gonzo's Quest - Revolutionary avalanche reels
('netent_gonzos_quest', 'NETENT_002', 'slots', 'Gonzo''s Quest', 'NetEnt', 'slots', 'video_slots',
 '/images/games/gonzos-quest.jpg', 95.97, 'medium', false, true,
 true, true, 2, ARRAY['popular', 'adventure', 'avalanche', 'multipliers'], 20, 5, 2500),

-- Starburst XXXtreme - Enhanced version
('netent_starburst_xxxtreme', 'NETENT_003', 'slots', 'Starburst XXXtreme', 'NetEnt', 'slots', 'video_slots',
 '/images/games/starburst-xxxtreme.jpg', 96.26, 'very_high', false, true,
 true, true, 3, ARRAY['new', 'space', 'gems', 'high_volatility'], 9, 5, 200000),

-- Dead or Alive 2 - High volatility wild west
('netent_dead_or_alive_2', 'NETENT_004', 'slots', 'Dead or Alive 2', 'NetEnt', 'slots', 'video_slots',
 '/images/games/dead-or-alive-2.jpg', 96.80, 'very_high', false, true,
 false, true, 4, ARRAY['western', 'high_volatility', 'freespins'], 9, 5, 111111),

-- Mega Fortune - Massive progressive jackpot
('netent_mega_fortune', 'NETENT_005', 'slots', 'Mega Fortune', 'NetEnt', 'slots', 'progressive',
 '/images/games/mega-fortune.jpg', 96.00, 'medium', true, true,
 false, true, 5, ARRAY['jackpot', 'luxury', 'progressive'], 25, 5, 10000),

-- Twin Spin - Linked reels mechanic
('netent_twin_spin', 'NETENT_006', 'slots', 'Twin Spin', 'NetEnt', 'slots', 'video_slots',
 '/images/games/twin-spin.jpg', 96.55, 'medium', false, false,
 false, true, 6, ARRAY['classic', 'retro', 'cluster'], 243, 5, 1000),

-- Blood Suckers - Vampire theme, high RTP
('netent_blood_suckers', 'NETENT_007', 'slots', 'Blood Suckers', 'NetEnt', 'slots', 'video_slots',
 '/images/games/blood-suckers.jpg', 98.00, 'medium', false, true,
 false, true, 7, ARRAY['horror', 'vampire', 'high_rtp'], 25, 5, 900),

-- Jack and the Beanstalk - Fairy tale adventure
('netent_jack_beanstalk', 'NETENT_008', 'slots', 'Jack and the Beanstalk', 'NetEnt', 'slots', 'video_slots',
 '/images/games/jack-beanstalk.jpg', 96.28, 'medium', false, true,
 false, true, 8, ARRAY['fairy_tale', 'walking_wilds', 'adventure'], 20, 5, 6000);

-- ============================================================================
-- Pragmatic Play Slots (Modern Provider)
-- ============================================================================

INSERT INTO games (
    game_id, system_id, game_type, game_name, provider, category, subcategory,
    thumbnail_url, rtp, volatility, has_jackpot, has_freespins,
    is_featured, is_active, display_order, tags, reels, max_multiplier
) VALUES
-- Gates of Olympus - Extremely popular cluster pays
('pragmatic_gates_olympus', 'PRAG_001', 'slots', 'Gates of Olympus', 'Pragmatic Play', 'slots', 'video_slots',
 '/images/games/gates-of-olympus.jpg', 96.50, 'high', false, true,
 true, true, 9, ARRAY['popular', 'mythology', 'cluster_pays', 'multipliers'], 6, 5000),

-- Sweet Bonanza - Candy-themed tumble feature
('pragmatic_sweet_bonanza', 'PRAG_002', 'slots', 'Sweet Bonanza', 'Pragmatic Play', 'slots', 'video_slots',
 '/images/games/sweet-bonanza.jpg', 96.51, 'high', false, true,
 true, true, 10, ARRAY['popular', 'candy', 'tumble', 'multipliers'], 6, 21100),

-- Wolf Gold - Classic with money respin
('pragmatic_wolf_gold', 'PRAG_003', 'slots', 'Wolf Gold', 'Pragmatic Play', 'slots', 'video_slots',
 '/images/games/wolf-gold.jpg', 96.00, 'medium', true, true,
 false, true, 11, ARRAY['animals', 'nature', 'jackpot', 'money_respin'], 5, 1000),

-- The Dog House - Fun dog theme
('pragmatic_dog_house', 'PRAG_004', 'slots', 'The Dog House', 'Pragmatic Play', 'slots', 'video_slots',
 '/images/games/dog-house.jpg', 96.51, 'high', false, true,
 false, true, 12, ARRAY['animals', 'dogs', 'sticky_wilds'], 5, 6750),

-- Big Bass Bonanza - Fishing theme, huge wins
('pragmatic_big_bass_bonanza', 'PRAG_005', 'slots', 'Big Bass Bonanza', 'Pragmatic Play', 'slots', 'video_slots',
 '/images/games/big-bass-bonanza.jpg', 96.71, 'high', false, true,
 true, true, 13, ARRAY['fishing', 'popular', 'bonus_buy'], 5, 2100),

-- Gates of Olympus 1000 - Enhanced version
('pragmatic_gates_olympus_1000', 'PRAG_006', 'slots', 'Gates of Olympus 1000', 'Pragmatic Play', 'slots', 'video_slots',
 '/images/games/gates-olympus-1000.jpg', 96.50, 'high', false, true,
 true, true, 14, ARRAY['new', 'mythology', 'cluster_pays', 'enhanced'], 6, 15000),

-- Sweet Bonanza 1000 - Enhanced candy slot
('pragmatic_sweet_bonanza_1000', 'PRAG_007', 'slots', 'Sweet Bonanza 1000', 'Pragmatic Play', 'slots', 'video_slots',
 '/images/games/sweet-bonanza-1000.jpg', 96.51, 'high', false, true,
 true, true, 15, ARRAY['new', 'candy', 'tumble', 'enhanced'], 6, 50000),

-- Sugar Rush - Candy racing theme
('pragmatic_sugar_rush', 'PRAG_008', 'slots', 'Sugar Rush', 'Pragmatic Play', 'slots', 'video_slots',
 '/images/games/sugar-rush.jpg', 96.50, 'high', false, true,
 false, true, 16, ARRAY['candy', 'cluster_pays', 'racing'], 7, 5000),

-- Starlight Princess - Anime-inspired
('pragmatic_starlight_princess', 'PRAG_009', 'slots', 'Starlight Princess', 'Pragmatic Play', 'slots', 'video_slots',
 '/images/games/starlight-princess.jpg', 96.50, 'high', false, true,
 false, true, 17, ARRAY['anime', 'princess', 'tumble', 'multipliers'], 6, 5000),

-- John Hunter Tomb of Scarab Queen
('pragmatic_scarab_queen', 'PRAG_010', 'slots', 'John Hunter and the Tomb of the Scarab Queen', 'Pragmatic Play', 'slots', 'video_slots',
 '/images/games/scarab-queen.jpg', 96.50, 'high', false, true,
 false, true, 18, ARRAY['adventure', 'egypt', 'expanding_symbols'], 5, 10500);

-- ============================================================================
-- Play'n GO Slots (Quality Provider)
-- ============================================================================

INSERT INTO games (
    game_id, system_id, game_type, game_name, provider, category, subcategory,
    thumbnail_url, rtp, volatility, has_jackpot, has_freespins,
    is_featured, is_active, display_order, tags, lines, reels, max_multiplier
) VALUES
-- Book of Dead - Iconic Egyptian slot
('playngo_book_of_dead', 'PNG_001', 'slots', 'Book of Dead', 'Play''n GO', 'slots', 'video_slots',
 '/images/games/book-of-dead.jpg', 96.21, 'high', false, true,
 true, true, 19, ARRAY['popular', 'egypt', 'expanding_symbols', 'adventure'], 10, 5, 5000),

-- Reactoonz - Alien cluster pays
('playngo_reactoonz', 'PNG_002', 'slots', 'Reactoonz', 'Play''n GO', 'slots', 'video_slots',
 '/images/games/reactoonz.jpg', 96.51, 'high', false, false,
 true, true, 20, ARRAY['popular', 'alien', 'cluster_pays', 'cascading'], 0, 7, 4570),

-- Legacy of Dead - Book of Dead successor
('playngo_legacy_of_dead', 'PNG_003', 'slots', 'Legacy of Dead', 'Play''n GO', 'slots', 'video_slots',
 '/images/games/legacy-of-dead.jpg', 96.58, 'high', false, true,
 false, true, 21, ARRAY['egypt', 'expanding_symbols', 'adventure'], 10, 5, 5000),

-- Fire Joker - Classic fruit slot
('playngo_fire_joker', 'PNG_004', 'slots', 'Fire_joker', 'Play''n GO', 'slots', 'classic_slots',
 '/images/games/fire-joker.jpg', 96.15, 'high', false, false,
 false, true, 22, ARRAY['classic', 'fruit', 'respin', 'simple'], 5, 3, 800),

-- Reactoonz 2 - Enhanced sequel
('playngo_reactoonz_2', 'PNG_005', 'slots', 'Reactoonz 2', 'Play''n GO', 'slots', 'video_slots',
 '/images/games/reactoonz-2.jpg', 96.20, 'high', false, false,
 false, true, 23, ARRAY['alien', 'cluster_pays', 'cascading', 'sequel'], 0, 7, 5083),

-- Rise of Olympus - Greek mythology
('playngo_rise_of_olympus', 'PNG_006', 'slots', 'Rise of Olympus', 'Play''n GO', 'slots', 'video_slots',
 '/images/games/rise-of-olympus.jpg', 96.50, 'high', false, true,
 false, true, 24, ARRAY['mythology', 'gods', 'cluster_pays'], 0, 5, 5000),

-- Moon Princess - Anime-style slot
('playngo_moon_princess', 'PNG_007', 'slots', 'Moon Princess', 'Play''n GO', 'slots', 'video_slots',
 '/images/games/moon-princess.jpg', 96.50, 'high', false, true,
 false, true, 25, ARRAY['anime', 'princess', 'cluster_pays', 'multipliers'], 0, 5, 5000),

-- Rich Wilde and the Pearls of India
('playngo_pearls_india', 'PNG_008', 'slots', 'Pearls of India', 'Play''n GO', 'slots', 'video_slots',
 '/images/games/pearls-india.jpg', 96.20, 'medium', false, true,
 false, true, 26, ARRAY['adventure', 'india', 'expanding_symbols'], 20, 5, 5000);

-- ============================================================================
-- Microgaming Slots (Legendary Provider)
-- ============================================================================

INSERT INTO games (
    game_id, system_id, game_type, game_name, provider, category, subcategory,
    thumbnail_url, rtp, volatility, has_jackpot, has_freespins,
    is_featured, is_active, display_order, tags, lines, reels, max_multiplier
) VALUES
-- Mega Moolah - World record jackpot
('micro_mega_moolah', 'MICRO_001', 'slots', 'Mega Moolah', 'Microgaming', 'slots', 'progressive',
 '/images/games/mega-moolah.jpg', 88.12, 'medium', true, true,
 true, true, 27, ARRAY['jackpot', 'progressive', 'safari', 'famous'], 25, 5, 10000),

-- Immortal Romance - Vampire drama
('micro_immortal_romance', 'MICRO_002', 'slots', 'Immortal Romance', 'Microgaming', 'slots', 'video_slots',
 '/images/games/immortal-romance.jpg', 96.86, 'medium', false, true,
 true, true, 28, ARRAY['vampire', 'romance', 'story', 'freespins'], 243, 5, 12150),

-- Thunderstruck II - Norse mythology
('micro_thunderstruck_2', 'MICRO_003', 'slots', 'Thunderstruck II', 'Microgaming', 'slots', 'video_slots',
 '/images/games/thunderstruck-2.jpg', 96.65, 'medium', false, true,
 false, true, 29, ARRAY['mythology', 'norse', 'gods', 'thunder'], 243, 5, 8100),

-- Immortal Romance Mega Moolah - Jackpot version
('micro_immortal_mega_moolah', 'MICRO_004', 'slots', 'Immortal Romance Mega Moolah', 'Microgaming', 'slots', 'progressive',
 '/images/games/immortal-romance-mm.jpg', 93.40, 'medium', true, true,
 false, true, 30, ARRAY['vampire', 'jackpot', 'progressive', 'romance'], 243, 5, 8000),

-- Thunderstruck II Mega Moolah - Jackpot version
('micro_thunderstruck_mega_moolah', 'MICRO_005', 'slots', 'Thunderstruck II Mega Moolah', 'Microgaming', 'slots', 'progressive',
 '/images/games/thunderstruck-2-mm.jpg', 92.00, 'medium', true, true,
 false, true, 31, ARRAY['mythology', 'jackpot', 'progressive', 'norse'], 243, 5, 5000),

-- Jungle Jim El Dorado
('micro_jungle_jim', 'MICRO_006', 'slots', 'Jungle Jim El Dorado', 'Microgaming', 'slots', 'video_slots',
 '/images/games/jungle-jim.jpg', 96.31, 'medium', false, true,
 false, true, 32, ARRAY['adventure', 'jungle', 'rolling_reels'], 25, 5, 9300),

-- Avalon II - Arthurian legend
('micro_avalon_2', 'MICRO_007', 'slots', 'Avalon II', 'Microgaming', 'slots', 'video_slots',
 '/images/games/avalon-2.jpg', 95.92, 'medium', false, true,
 false, true, 33, ARRAY['medieval', 'knights', 'quest', 'freespins'], 243, 5, 2400),

-- Book of Oz - Wizard theme
('micro_book_of_oz', 'MICRO_008', 'slots', 'Book of Oz', 'Microgaming', 'slots', 'video_slots',
 '/images/games/book-of-oz.jpg', 96.20, 'medium', false, true,
 false, true, 34, ARRAY['magic', 'wizard', 'expanding_symbols'], 10, 5, 5000);

-- ============================================================================
-- Red Tiger Slots (Innovative Provider)
-- ============================================================================

INSERT INTO games (
    game_id, system_id, game_type, game_name, provider, category, subcategory,
    thumbnail_url, rtp, volatility, has_jackpot, has_freespins,
    is_featured, is_active, display_order, tags, lines, reels, max_multiplier
) VALUES
-- Mystery Reels Megaways
('redtiger_mystery_megaways', 'RT_001', 'slots', 'Mystery Reels Megaways', 'Red Tiger', 'slots', 'megaways',
 '/images/games/mystery-reels-megaways.jpg', 95.70, 'medium', false, true,
 false, true, 35, ARRAY['megaways', 'mystery', 'cascading'], 0, 6, 10000),

-- Gonzo's Quest Megaways
('redtiger_gonzos_megaways', 'RT_002', 'slots', 'Gonzo''s Quest Megaways', 'Red Tiger', 'slots', 'megaways',
 '/images/games/gonzos-megaways.jpg', 96.00, 'medium', false, true,
 false, true, 36, ARRAY['adventure', 'megaways', 'avalanche', 'multipliers'], 0, 6, 21000),

-- Dragon's Luck Megaways
('redtiger_dragons_luck_megaways', 'RT_003', 'slots', 'Dragon''s Luck Megaways', 'Red Tiger', 'slots', 'megaways',
 '/images/games/dragons-luck-megaways.jpg', 96.22, 'high', false, false,
 false, true, 37, ARRAY['dragon', 'asian', 'megaways'], 0, 6, 10000),

-- Piggy Riches Megaways
('redtiger_piggy_riches_megaways', 'RT_004', 'slots', 'Piggy Riches Megaways', 'Red Tiger', 'slots', 'megaways',
 '/images/games/piggy-riches-megaways.jpg', 96.18, 'medium', false, true,
 false, true, 38, ARRAY['luxury', 'megaways', 'cascading'], 0, 6, 10000);

-- ============================================================================
-- Big Time Gaming Slots (Megaways Creator)
-- ============================================================================

INSERT INTO games (
    game_id, system_id, game_type, game_name, provider, category, subcategory,
    thumbnail_url, rtp, volatility, has_jackpot, has_freespins,
    is_featured, is_active, display_order, tags, lines, reels, max_multiplier
) VALUES
-- Bonanza Megaways - The original Megaways
('btg_bonanza', 'BTG_001', 'slots', 'Bonanza Megaways', 'Big Time Gaming', 'slots', 'megaways',
 '/images/games/bonanza-megaways.jpg', 96.00, 'high', false, true,
 true, true, 39, ARRAY['mining', 'megaways', 'classic', 'cascading'], 0, 6, 10000),

-- Extra Chilli Megaways
('btg_extra_chilli', 'BTG_002', 'slots', 'Extra Chilli Megaways', 'Big Time Gaming', 'slots', 'megaways',
 '/images/games/extra-chilli.jpg', 96.82, 'high', false, true,
 false, true, 40, ARRAY['mexico', 'megaways', 'bonus_buy', 'spicy'], 0, 6, 20000);

-- ============================================================================
-- Game Statistics Initialization
-- ============================================================================

-- Initialize game statistics for all games
INSERT INTO game_statistics (game_id, total_rounds, total_players, total_wagered, total_won)
SELECT id, 0, 0, 0, 0
FROM games
WHERE id NOT IN (SELECT game_id FROM game_statistics);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN games.game_id IS 'Unique provider-specific game identifier';
COMMENT ON COLUMN games.thumbnail_url IS 'Placeholder path - replace with actual CDN URLs';
COMMENT ON COLUMN games.display_order IS 'Lower numbers appear first in listings';
