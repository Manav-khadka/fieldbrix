-- Grants for additive Sprint 02–05 tables. Runtime remains append/read-oriented;
-- migration role owns schema changes and mutable administrative updates.
GRANT SELECT, INSERT ON password_history, password_reset_tokens, login_attempts,
  account_lockouts, device_installations, platform_administrators, god_sessions,
  destructive_requests, tenant_settings, skills, user_skills, support_notes,
  tenant_usage_snapshots, outbox_events, worker_job_attempts, files TO fieldbrix_runtime;
GRANT UPDATE ON sessions, users, password_reset_tokens, account_lockouts,
  tenant_settings, files, outbox_events, worker_job_attempts TO fieldbrix_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON password_history, password_reset_tokens,
  login_attempts, account_lockouts, device_installations, platform_administrators,
  god_sessions, destructive_requests, tenant_settings, skills, user_skills,
  support_notes, tenant_usage_snapshots, outbox_events, worker_job_attempts,
  files TO fieldbrix_migrator;
GRANT SELECT ON password_history, password_reset_tokens, login_attempts,
  account_lockouts, device_installations, platform_administrators, god_sessions,
  destructive_requests, tenant_settings, skills, user_skills, support_notes,
  tenant_usage_snapshots, outbox_events, worker_job_attempts, files TO fieldbrix_readonly;
REVOKE UPDATE, DELETE ON support_notes, audit_logs FROM fieldbrix_runtime, fieldbrix_readonly, fieldbrix_migrator;
