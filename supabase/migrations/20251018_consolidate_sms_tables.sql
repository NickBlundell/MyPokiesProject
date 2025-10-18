-- Consolidate SMS tables by merging conversation metadata into messages
-- This simplifies the schema and eliminates the need for a separate conversations table

-- First, add essential conversation fields to sms_messages table
ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id); -- Alias for player_id for consistency

-- Add AI-related fields that were in conversations
ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ai_temperature NUMERIC(3, 2),
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

-- Copy conversation_id data if needed before we drop it
-- (The conversation_id already exists in sms_messages)

-- Migrate player_id from conversations to messages where applicable
UPDATE sms_messages sm
SET player_id = sc.player_id,
    user_id = sc.player_id,
    ai_model = sc.ai_model,
    ai_temperature = sc.ai_temperature
FROM sms_conversations sc
WHERE sm.conversation_id = sc.id
  AND sm.player_id IS NULL;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sms_messages_player_id
  ON sms_messages(player_id)
  WHERE player_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sms_messages_phone_created
  ON sms_messages(phone_number, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_messages_direction_status
  ON sms_messages(direction, status);

-- Add comments
COMMENT ON COLUMN sms_messages.player_id IS 'Reference to the player/user this message is for';
COMMENT ON COLUMN sms_messages.user_id IS 'Alias for player_id for consistency with other tables';
COMMENT ON COLUMN sms_messages.ai_model IS 'AI model used to generate this message (if AI generated)';
COMMENT ON COLUMN sms_messages.ai_temperature IS 'Temperature setting used for AI generation';
COMMENT ON COLUMN sms_messages.ai_prompt IS 'Prompt used to generate this message (if AI generated)';

-- Drop the conversation_id foreign key constraint
ALTER TABLE sms_messages
  DROP CONSTRAINT IF EXISTS sms_messages_conversation_id_fkey;

-- Drop the sms_conversations table
DROP TABLE IF EXISTS sms_conversations CASCADE;

-- Add a view for conversation-like queries (grouping messages by phone/player)
CREATE OR REPLACE VIEW sms_conversation_summary AS
SELECT
  phone_number,
  player_id,
  COUNT(*) as message_count,
  COUNT(*) FILTER (WHERE direction = 'inbound') as inbound_count,
  COUNT(*) FILTER (WHERE direction = 'outbound') as outbound_count,
  COUNT(*) FILTER (WHERE ai_generated = true) as ai_message_count,
  MAX(created_at) as last_message_at,
  MAX(created_at) FILTER (WHERE direction = 'inbound') as last_inbound_at,
  MAX(created_at) FILTER (WHERE direction = 'outbound') as last_outbound_at,
  MIN(created_at) as first_message_at
FROM sms_messages
GROUP BY phone_number, player_id;

COMMENT ON VIEW sms_conversation_summary IS 'Aggregated view of SMS message activity per phone number/player, replacing the sms_conversations table';
