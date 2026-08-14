-- Sprint 02 operational roles. Passwords are intentionally not defined here;
-- deployment provisions credentials through the secret manager.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fieldbrix_runtime') THEN CREATE ROLE fieldbrix_runtime NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fieldbrix_migrator') THEN CREATE ROLE fieldbrix_migrator NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fieldbrix_readonly') THEN CREATE ROLE fieldbrix_readonly NOLOGIN; END IF;
END $$;

GRANT USAGE ON SCHEMA public TO fieldbrix_runtime, fieldbrix_migrator, fieldbrix_readonly;
GRANT SELECT, INSERT ON tenants, users, roles, permissions, role_permissions, tenant_user_roles, sessions, idempotency_records, audit_logs, branches, teams, invitations, role_presets, feature_registry, dashboard_registry TO fieldbrix_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants, users, roles, permissions, role_permissions, tenant_user_roles, sessions, idempotency_records, audit_logs, branches, teams, invitations, role_presets, feature_registry, dashboard_registry TO fieldbrix_migrator;
GRANT SELECT ON tenants, users, roles, permissions, role_permissions, tenant_user_roles, sessions, idempotency_records, audit_logs, branches, teams, invitations, role_presets, feature_registry, dashboard_registry TO fieldbrix_readonly;
REVOKE UPDATE, DELETE ON audit_logs FROM fieldbrix_runtime, fieldbrix_readonly;
REVOKE UPDATE, DELETE ON audit_logs FROM fieldbrix_migrator;
