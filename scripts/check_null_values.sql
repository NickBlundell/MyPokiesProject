-- Script to check for NULL values in columns that should have NOT NULL constraints
-- Must be run before adding NOT NULL constraints

-- Check users.created_at
SELECT 'users.created_at' as column_name, COUNT(*) as null_count
FROM users WHERE created_at IS NULL
UNION ALL
-- Check transactions.created_at
SELECT 'transactions.created_at', COUNT(*)
FROM transactions WHERE created_at IS NULL
UNION ALL
-- Check player_bonuses.issued_at
SELECT 'player_bonuses.issued_at', COUNT(*)
FROM player_bonuses WHERE issued_at IS NULL
UNION ALL
-- Check game_rounds.started_at
SELECT 'game_rounds.started_at', COUNT(*)
FROM game_rounds WHERE started_at IS NULL
UNION ALL
-- Check marketing_campaigns.created_at
SELECT 'marketing_campaigns.created_at', COUNT(*)
FROM marketing_campaigns WHERE created_at IS NULL
UNION ALL
-- Check marketing_campaigns.updated_at
SELECT 'marketing_campaigns.updated_at', COUNT(*)
FROM marketing_campaigns WHERE updated_at IS NULL
UNION ALL
-- Check player_segments.created_at
SELECT 'player_segments.created_at', COUNT(*)
FROM player_segments WHERE created_at IS NULL
UNION ALL
-- Check player_segments.updated_at
SELECT 'player_segments.updated_at', COUNT(*)
FROM player_segments WHERE updated_at IS NULL
UNION ALL
-- Check scheduled_reports.created_at
SELECT 'scheduled_reports.created_at', COUNT(*)
FROM scheduled_reports WHERE created_at IS NULL
UNION ALL
-- Check scheduled_reports.updated_at
SELECT 'scheduled_reports.updated_at', COUNT(*)
FROM scheduled_reports WHERE updated_at IS NULL
ORDER BY column_name;