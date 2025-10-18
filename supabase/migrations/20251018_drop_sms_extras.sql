-- Drop unnecessary SMS-related tables and views
-- These are redundant or unused

-- Drop the view created earlier (not needed since we're simplifying)
DROP VIEW IF EXISTS sms_conversation_summary CASCADE;

-- Drop message_generation_context table (unused, 0 rows)
DROP TABLE IF EXISTS message_generation_context CASCADE;
