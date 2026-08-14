-- Sprint 05 temporal branch/team membership and lead attribution.
CREATE TABLE IF NOT EXISTS branch_memberships (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  user_id UUID NOT NULL REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ends_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES users(id),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ends_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES users(id),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS team_lead_history (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  lead_user_id UUID REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ends_at TIMESTAMPTZ,
  changed_by UUID REFERENCES users(id),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS branch_memberships_active_user_idx
  ON branch_memberships (tenant_id, branch_id, user_id) WHERE ends_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS team_memberships_active_user_idx
  ON team_memberships (tenant_id, team_id, user_id) WHERE ends_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS team_lead_history_active_idx
  ON team_lead_history (tenant_id, team_id) WHERE ends_at IS NULL;
CREATE INDEX IF NOT EXISTS branch_memberships_user_history_idx ON branch_memberships (tenant_id, user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS team_memberships_user_history_idx ON team_memberships (tenant_id, user_id, starts_at DESC);

ALTER TABLE branch_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE team_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE team_lead_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branch_memberships_isolation ON branch_memberships;
DROP POLICY IF EXISTS team_memberships_isolation ON team_memberships;
DROP POLICY IF EXISTS team_lead_history_isolation ON team_lead_history;
CREATE POLICY branch_memberships_isolation ON branch_memberships USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY team_memberships_isolation ON team_memberships USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY team_lead_history_isolation ON team_lead_history USING (tenant_id::text = current_setting('app.tenant_id', true));
