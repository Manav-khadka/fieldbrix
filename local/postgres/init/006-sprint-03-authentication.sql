-- Sprint 03 authentication delta. This migration is additive and safe to reapply.
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  identifier_hash TEXT NOT NULL,
  ip_hash TEXT,
  succeeded BOOLEAN NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS account_lockouts (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  first_failed_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS device_installations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  device_name TEXT NOT NULL,
  platform TEXT,
  app_version TEXT,
  public_key TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_type TEXT NOT NULL DEFAULT 'refresh';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_token_type_check'
  ) THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_token_type_check CHECK (token_type IN ('access', 'refresh'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS password_history_user_created_idx ON password_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS password_reset_active_idx ON password_reset_tokens (user_id, expires_at) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS login_attempts_identifier_time_idx ON login_attempts (identifier_hash, occurred_at DESC);
CREATE INDEX IF NOT EXISTS device_installations_user_active_idx ON device_installations (user_id, revoked_at, last_seen_at DESC);

ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history FORCE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE login_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts FORCE ROW LEVEL SECURITY;
ALTER TABLE device_installations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS password_history_tenant_isolation ON password_history;
CREATE POLICY password_history_tenant_isolation ON password_history
  USING (user_id IN (SELECT id FROM users));
DROP POLICY IF EXISTS password_reset_tokens_tenant_isolation ON password_reset_tokens;
CREATE POLICY password_reset_tokens_tenant_isolation ON password_reset_tokens
  USING (user_id IN (SELECT id FROM users));
DROP POLICY IF EXISTS login_attempts_tenant_isolation ON login_attempts;
CREATE POLICY login_attempts_tenant_isolation ON login_attempts
  USING (user_id IS NULL OR user_id IN (SELECT id FROM users));
DROP POLICY IF EXISTS account_lockouts_tenant_isolation ON account_lockouts;
CREATE POLICY account_lockouts_tenant_isolation ON account_lockouts
  USING (user_id IN (SELECT id FROM users));
DROP POLICY IF EXISTS device_installations_tenant_isolation ON device_installations;
CREATE POLICY device_installations_tenant_isolation ON device_installations
  USING (user_id IN (SELECT id FROM users));
