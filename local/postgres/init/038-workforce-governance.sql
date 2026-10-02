-- Configurable platform staff, company workforce, workflow access, and task governance.

CREATE TABLE IF NOT EXISTS platform_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  display_name text NOT NULL,
  access_level text NOT NULL CHECK (access_level IN ('SUPER_ADMIN', 'SUB_ADMIN')),
  capabilities text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS workforce_profiles (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL REFERENCES users(id),
  job_title text NOT NULL DEFAULT 'Field worker',
  workforce_type text NOT NULL DEFAULT 'FIELD_WORKER'
    CHECK (workforce_type IN ('COMPANY_ADMIN', 'OFFICE', 'FIELD_WORKER', 'SUPERVISOR', 'QUALITY_REVIEWER')),
  primary_team_id uuid REFERENCES teams(id),
  can_receive_tasks boolean NOT NULL DEFAULT true,
  can_assign_tasks boolean NOT NULL DEFAULT false,
  can_verify_tasks boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_workflow_access (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL REFERENCES users(id),
  workflow_id uuid NOT NULL REFERENCES workflow_drafts(id),
  access_level text NOT NULL CHECK (access_level IN ('PERFORM', 'SUPERVISE', 'VERIFY')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, user_id, workflow_id, access_level)
);

CREATE TABLE IF NOT EXISTS team_supervisors (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  team_id uuid NOT NULL REFERENCES teams(id),
  user_id uuid NOT NULL REFERENCES users(id),
  supervisor_kind text NOT NULL DEFAULT 'OPERATIONAL'
    CHECK (supervisor_kind IN ('OPERATIONAL', 'QUALITY')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, team_id, user_id, supervisor_kind)
);

CREATE TABLE IF NOT EXISTS team_workflow_access (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  team_id uuid NOT NULL REFERENCES teams(id),
  workflow_id uuid NOT NULL REFERENCES workflow_drafts(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, team_id, workflow_id)
);

ALTER TABLE teams ADD COLUMN IF NOT EXISTS department_label text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS verification_mode text NOT NULL DEFAULT 'MANUAL_SUPERVISOR';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS required_approvals integer NOT NULL DEFAULT 1;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_verification_mode_check;
ALTER TABLE teams ADD CONSTRAINT teams_verification_mode_check
  CHECK (verification_mode IN ('AUTO', 'MANUAL_SUPERVISOR', 'QUALITY_DEPARTMENT'));
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_required_approvals_check;
ALTER TABLE teams ADD CONSTRAINT teams_required_approvals_check CHECK (required_approvals BETWEEN 1 AND 20);

ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES users(id);

CREATE TABLE IF NOT EXISTS task_supervisors (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  supervisor_kind text NOT NULL DEFAULT 'OPERATIONAL'
    CHECK (supervisor_kind IN ('OPERATIONAL', 'QUALITY')),
  assigned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id),
  PRIMARY KEY (tenant_id, task_id, user_id, supervisor_kind)
);

CREATE TABLE IF NOT EXISTS task_verification_requirements (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  task_id uuid NOT NULL,
  verification_mode text NOT NULL DEFAULT 'MANUAL_SUPERVISOR'
    CHECK (verification_mode IN ('AUTO', 'MANUAL_SUPERVISOR', 'QUALITY_DEPARTMENT')),
  required_approvals integer NOT NULL DEFAULT 1 CHECK (required_approvals BETWEEN 1 AND 20),
  quality_team_id uuid REFERENCES teams(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id),
  PRIMARY KEY (tenant_id, task_id)
);

CREATE INDEX IF NOT EXISTS workforce_profiles_team_idx ON workforce_profiles (tenant_id, primary_team_id);
CREATE INDEX IF NOT EXISTS user_workflow_access_workflow_idx ON user_workflow_access (tenant_id, workflow_id, access_level);
CREATE INDEX IF NOT EXISTS task_supervisors_task_idx ON task_supervisors (tenant_id, task_id);

ALTER TABLE workforce_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workflow_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_workflow_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_verification_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE user_workflow_access FORCE ROW LEVEL SECURITY;
ALTER TABLE team_supervisors FORCE ROW LEVEL SECURITY;
ALTER TABLE team_workflow_access FORCE ROW LEVEL SECURITY;
ALTER TABLE task_supervisors FORCE ROW LEVEL SECURITY;
ALTER TABLE task_verification_requirements FORCE ROW LEVEL SECURITY;

CREATE POLICY workforce_profiles_isolation ON workforce_profiles USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY user_workflow_access_isolation ON user_workflow_access USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY team_supervisors_isolation ON team_supervisors USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY team_workflow_access_isolation ON team_workflow_access USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY task_supervisors_isolation ON task_supervisors USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY task_verification_requirements_isolation ON task_verification_requirements USING (tenant_id::text = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON platform_staff, workforce_profiles, user_workflow_access,
  team_supervisors, team_workflow_access, task_supervisors, task_verification_requirements
  TO fieldbrix_runtime, fieldbrix_migrator;
GRANT SELECT ON platform_staff, workforce_profiles, user_workflow_access, team_supervisors,
  team_workflow_access, task_supervisors, task_verification_requirements TO fieldbrix_readonly;
