-- Consolidate SMS opt-outs into users table
-- This simplifies opt-out management by keeping it with user data

-- Add SMS opt-out columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS sms_opted_out BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS sms_opted_out_at TIMESTAMPTZ;

-- Add index for querying opted-out users
CREATE INDEX IF NOT EXISTS idx_users_sms_opted_out
  ON users(sms_opted_out)
  WHERE sms_opted_out = TRUE;

-- Add index for phone number lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_phone_number
  ON users(phone_number)
  WHERE phone_number IS NOT NULL;

-- Add comments
COMMENT ON COLUMN users.sms_opted_out IS 'Whether user has opted out of SMS communications';
COMMENT ON COLUMN users.sms_opted_out_at IS 'Timestamp when user opted out of SMS';

-- Migrate any existing opt-out data (if there was any)
-- Note: sms_opt_outs currently has 0 rows, but keeping this for safety
UPDATE users u
SET
  sms_opted_out = TRUE,
  sms_opted_out_at = so.opted_out_at
FROM sms_opt_outs so
WHERE u.phone_number = so.phone_number
  AND so.opted_back_in = FALSE;

-- Drop the sms_opt_outs table
DROP TABLE IF EXISTS sms_opt_outs CASCADE;

-- Drop existing function first if it exists
DROP FUNCTION IF EXISTS is_phone_opted_out(VARCHAR);
DROP FUNCTION IF EXISTS is_phone_opted_out(character varying);

-- Create a helper function to check if phone number is opted out
CREATE OR REPLACE FUNCTION is_phone_opted_out(p_phone_number VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE phone_number = p_phone_number
      AND sms_opted_out = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_phone_opted_out IS 'Helper function to check if a phone number has opted out of SMS';
