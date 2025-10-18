-- Drop AI-related tables since AI messages will be tracked in sms_messages
-- All AI functionality is consolidated into the main SMS messages table

-- Drop ai_offered_bonuses (1 row - bonus offers now handled differently)
DROP TABLE IF EXISTS ai_offered_bonuses CASCADE;

-- Drop ai_message_logs (0 rows - messages tracked in sms_messages)
DROP TABLE IF EXISTS ai_message_logs CASCADE;

-- Drop ai_personas (1 row - persona can be configured at app level)
DROP TABLE IF EXISTS ai_personas CASCADE;

-- Drop pending_ai_auto_replies (0 rows - auto-replies handled differently)
DROP TABLE IF EXISTS pending_ai_auto_replies CASCADE;

-- Drop any views that depend on these tables
DROP VIEW IF EXISTS ai_offered_bonuses_summary CASCADE;
