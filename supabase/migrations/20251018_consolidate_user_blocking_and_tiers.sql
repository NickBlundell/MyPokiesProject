-- Consolidate blocking and tier information into users table
-- This eliminates the need for the blocked_identifiers table
-- and makes tier information more accessible

-- Add blocking columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unblocked_at TIMESTAMPTZ;

-- Add index for blocked users queries
CREATE INDEX IF NOT EXISTS idx_users_is_blocked
  ON users(is_blocked)
  WHERE is_blocked = TRUE;

-- Add comment
COMMENT ON COLUMN users.is_blocked IS 'Whether this user account is blocked from accessing the platform';
COMMENT ON COLUMN users.blocked_reason IS 'Admin-provided reason for blocking the account';
COMMENT ON COLUMN users.blocked_by IS 'Admin user who blocked this account';
COMMENT ON COLUMN users.blocked_at IS 'Timestamp when account was blocked';
COMMENT ON COLUMN users.unblocked_at IS 'Timestamp when account was unblocked (if applicable)';

-- Drop the unused blocked_identifiers table
-- (Note: This table has 0 rows and is not used anywhere in the codebase)
DROP TABLE IF EXISTS blocked_identifiers CASCADE;
