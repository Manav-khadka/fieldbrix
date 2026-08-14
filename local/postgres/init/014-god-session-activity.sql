-- Persist God Mode inactivity tracking across application restarts.
ALTER TABLE god_sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
UPDATE god_sessions SET last_activity_at = COALESCE(last_activity_at, reauthenticated_at, created_at) WHERE last_activity_at IS NULL;
ALTER TABLE god_sessions ALTER COLUMN last_activity_at SET DEFAULT clock_timestamp();
ALTER TABLE god_sessions ALTER COLUMN last_activity_at SET NOT NULL;
