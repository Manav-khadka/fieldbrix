-- Sprint 04: stable permission registry and cloneable workforce presets.
CREATE TABLE IF NOT EXISTS role_presets (
  key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  grants TEXT[] NOT NULL DEFAULT '{}',
  immutable BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS feature_registry (
  key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  module TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS dashboard_registry (
  key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  feature_key TEXT NOT NULL REFERENCES feature_registry(key),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO permissions (key, module, resource, action, scope) VALUES
  ('company.settings.view', 'company', 'settings', 'view', ARRAY['all']),
  ('company.settings.edit', 'company', 'settings', 'edit', ARRAY['all']),
  ('company.branches.view', 'company', 'branches', 'view', ARRAY['all']),
  ('company.branches.edit', 'company', 'branches', 'edit', ARRAY['all']),
  ('company.teams.view', 'company', 'teams', 'view', ARRAY['all']),
  ('company.teams.edit', 'company', 'teams', 'edit', ARRAY['all']),
  ('iam.users.view', 'iam', 'users', 'view', ARRAY['all']),
  ('iam.users.invite', 'iam', 'users', 'invite', ARRAY['all']),
  ('iam.users.edit', 'iam', 'users', 'edit', ARRAY['all']),
  ('iam.users.deactivate', 'iam', 'users', 'deactivate', ARRAY['all']),
  ('iam.assignments.configure', 'iam', 'assignments', 'configure', ARRAY['all']),
  ('iam.roles.view', 'iam', 'roles', 'view', ARRAY['all']),
  ('iam.roles.create', 'iam', 'roles', 'create', ARRAY['all']),
  ('iam.roles.configure', 'iam', 'roles', 'configure', ARRAY['all']),
  ('audit.events.view', 'audit', 'events', 'view', ARRAY['all'])
ON CONFLICT (key) DO UPDATE SET module = EXCLUDED.module, resource = EXCLUDED.resource, action = EXCLUDED.action, scope = EXCLUDED.scope;

INSERT INTO role_presets (key, display_name, grants) VALUES
  ('company_admin', 'Company Admin', ARRAY['company.settings.view','company.settings.edit','company.branches.view','company.branches.edit','company.teams.view','company.teams.edit','iam.users.view','iam.users.invite','iam.users.edit','iam.users.deactivate','iam.assignments.configure','iam.roles.view','iam.roles.create','iam.roles.configure','audit.events.view']),
  ('operations_manager', 'Operations Manager', ARRAY['company.settings.view','company.branches.view','company.teams.view','company.teams.edit','iam.users.view','iam.users.edit']),
  ('supervisor', 'Supervisor', ARRAY['company.branches.view','company.teams.view','iam.users.view']),
  ('field_worker', 'Field Worker', ARRAY[]::TEXT[]),
  ('dispatcher', 'Dispatcher', ARRAY['company.branches.view','company.teams.view','iam.users.view']),
  ('auditor', 'Auditor', ARRAY['audit.events.view','company.settings.view']),
  ('finance_manager', 'Finance Manager', ARRAY['company.settings.view']),
  ('support_agent', 'Support Agent', ARRAY['company.settings.view','iam.users.view']),
  ('report_viewer', 'Report Viewer', ARRAY[]::TEXT[]),
  ('compliance_manager', 'Compliance Manager', ARRAY['audit.events.view','company.settings.view'])
ON CONFLICT (key) DO UPDATE SET display_name = EXCLUDED.display_name, grants = EXCLUDED.grants;

INSERT INTO feature_registry (key, display_name, module) VALUES
  ('dashboard', 'Dashboard', 'platform'),
  ('company', 'Company Administration', 'company'),
  ('users', 'Workforce Users', 'iam'),
  ('roles', 'Roles and Capabilities', 'iam'),
  ('audit', 'Audit Events', 'audit')
ON CONFLICT (key) DO UPDATE SET display_name = EXCLUDED.display_name, module = EXCLUDED.module;
INSERT INTO dashboard_registry (key, display_name, feature_key) VALUES
  ('operations_overview', 'Operations Overview', 'dashboard'),
  ('company_settings', 'Company Settings', 'company'),
  ('workforce_directory', 'Workforce Directory', 'users'),
  ('role_management', 'Role Management', 'roles'),
  ('audit_timeline', 'Audit Timeline', 'audit')
ON CONFLICT (key) DO UPDATE SET display_name = EXCLUDED.display_name, feature_key = EXCLUDED.feature_key;

ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches FORCE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_records FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_tenant_isolation ON branches;
DROP POLICY IF EXISTS teams_tenant_isolation ON teams;
DROP POLICY IF EXISTS invitations_tenant_isolation ON invitations;
DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
DROP POLICY IF EXISTS idempotency_tenant_isolation ON idempotency_records;
DROP POLICY IF EXISTS tenant_user_roles_isolation ON tenant_user_roles;
DROP POLICY IF EXISTS role_permissions_tenant_isolation ON role_permissions;
CREATE POLICY branches_tenant_isolation ON branches USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY teams_tenant_isolation ON teams USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY invitations_tenant_isolation ON invitations USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY sessions_tenant_isolation ON sessions USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY idempotency_tenant_isolation ON idempotency_records USING (tenant_id IS NULL OR tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY tenant_user_roles_isolation ON tenant_user_roles USING (tenant_id::text = current_setting('app.tenant_id', true));
CREATE POLICY role_permissions_tenant_isolation ON role_permissions USING (EXISTS (SELECT 1 FROM roles WHERE roles.id = role_permissions.role_id AND roles.tenant_id::text = current_setting('app.tenant_id', true)));
