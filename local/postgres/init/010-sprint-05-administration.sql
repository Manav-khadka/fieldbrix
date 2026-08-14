-- Sprint 05 company administration and operational usage persistence.
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  settings JSONB NOT NULL DEFAULT '{}',
  revision BIGINT NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS user_skills (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  skill_id UUID NOT NULL REFERENCES skills(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS support_notes (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  actor_id UUID NOT NULL REFERENCES users(id),
  note TEXT NOT NULL CHECK (length(btrim(note)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS tenant_usage_snapshots (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  active_users INTEGER NOT NULL DEFAULT 0 CHECK (active_users >= 0),
  active_branches INTEGER NOT NULL DEFAULT 0 CHECK (active_branches >= 0),
  completed_tasks BIGINT NOT NULL DEFAULT 0 CHECK (completed_tasks >= 0),
  evidence_bytes BIGINT NOT NULL DEFAULT 0 CHECK (evidence_bytes >= 0),
  last_activity_at TIMESTAMPTZ,
  sync_health TEXT NOT NULL DEFAULT 'healthy' CHECK (sync_health IN ('healthy', 'degraded', 'inactive')),
  PRIMARY KEY (tenant_id, captured_at)
);

CREATE INDEX IF NOT EXISTS support_notes_tenant_time_idx ON support_notes (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tenant_usage_latest_idx ON tenant_usage_snapshots (tenant_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS user_skills_user_idx ON user_skills (tenant_id, user_id, assigned_at DESC);

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE skills FORCE ROW LEVEL SECURITY;
ALTER TABLE user_skills FORCE ROW LEVEL SECURITY;
ALTER TABLE support_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_settings_isolation ON tenant_settings;
CREATE POLICY tenant_settings_isolation ON tenant_settings USING (tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS skills_isolation ON skills;
CREATE POLICY skills_isolation ON skills USING (tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS user_skills_isolation ON user_skills;
CREATE POLICY user_skills_isolation ON user_skills USING (tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS support_notes_isolation ON support_notes;
CREATE POLICY support_notes_isolation ON support_notes USING (tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS tenant_usage_isolation ON tenant_usage_snapshots;
CREATE POLICY tenant_usage_isolation ON tenant_usage_snapshots USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE OR REPLACE FUNCTION reject_support_note_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'SUPPORT_NOTES_APPEND_ONLY';
END $$;
DROP TRIGGER IF EXISTS support_notes_append_only ON support_notes;
CREATE TRIGGER support_notes_append_only
  BEFORE UPDATE OR DELETE ON support_notes
  FOR EACH ROW EXECUTE FUNCTION reject_support_note_mutation();
