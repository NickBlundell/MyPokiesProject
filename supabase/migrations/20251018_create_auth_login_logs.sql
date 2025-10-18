-- Create auth_login_logs table to track all login attempts
-- This links with player_sessions for comprehensive tracking

CREATE TABLE IF NOT EXISTS auth_login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  auth_session_id UUID, -- References auth.sessions(id) but can't FK across schemas
  player_session_id UUID REFERENCES player_sessions(id),

  -- Login attempt info
  login_method VARCHAR(50), -- 'email', 'phone', 'oauth_google', etc.
  login_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'mfa_required'
  failure_reason TEXT, -- Error message if failed

  -- Device/Location info
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_type VARCHAR(50),
  device_os VARCHAR(50),
  device_browser VARCHAR(50),

  -- Geographic info
  country_code VARCHAR(2),
  country_name VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),

  -- Security flags
  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT,
  requires_mfa BOOLEAN DEFAULT FALSE,

  -- Timestamps
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_auth_login_logs_user_id ON auth_login_logs(user_id, attempted_at DESC);
CREATE INDEX idx_auth_login_logs_status ON auth_login_logs(login_status, attempted_at DESC);
CREATE INDEX idx_auth_login_logs_ip ON auth_login_logs(ip_address, attempted_at DESC);
CREATE INDEX idx_auth_login_logs_player_session ON auth_login_logs(player_session_id);
CREATE INDEX idx_auth_login_logs_suspicious ON auth_login_logs(is_suspicious) WHERE is_suspicious = TRUE;

-- Add RLS
ALTER TABLE auth_login_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own login logs
CREATE POLICY "Users can view own login logs" ON auth_login_logs
  FOR SELECT
  USING (auth.uid()::uuid IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  ) AND user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Service role full access
CREATE POLICY "Service role full access to auth_login_logs" ON auth_login_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE auth_login_logs IS 'Tracks all authentication login attempts and links with player sessions';
COMMENT ON COLUMN auth_login_logs.auth_session_id IS 'Reference to auth.sessions - tracks Supabase auth session';
COMMENT ON COLUMN auth_login_logs.player_session_id IS 'Reference to player_sessions - tracks player activity session';
COMMENT ON COLUMN auth_login_logs.login_status IS 'success, failed, or mfa_required';
COMMENT ON COLUMN auth_login_logs.is_suspicious IS 'Flagged for suspicious login patterns (velocity, location changes, etc)';
