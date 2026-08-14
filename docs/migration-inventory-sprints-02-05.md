# FieldBrix migration inventory — Sprints 02–05

The executable baseline is `local/postgres/init/003-sprints-02-05.sql`, followed by Sprint 04 registry/presets `004-sprint-04-rbac-seed.sql`, base runtime grants `005-runtime-roles.sql`, Sprint 03 authentication `006-sprint-03-authentication.sql`, Sprint 05 support permission `007-sprint-05-support-permission.sql`, Sprint 04 grant scopes `008-sprint-04-role-grant-scopes.sql`, Sprint 04 god mode `009-sprint-04-god-mode.sql`, Sprint 05 administration `010-sprint-05-administration.sql`, Sprint 02 outbox/jobs `011-sprint-02-outbox-jobs.sql`, Sprint 02 file metadata `012-sprint-02-file-metadata.sql`, additive runtime grants `013-runtime-role-grants-sprints-03-05.sql`, God Mode activity persistence `014-god-session-activity.sql`, audit append-only enforcement `015-audit-append-only.sql`, Sprint 05 membership/lead history `016-administration-memberships.sql`, membership runtime grants `017-membership-runtime-grants.sql`, invitation cancellation `018-invitation-cancellation.sql`, public invitation token lookup `019-public-invitation-lookup.sql`, workforce tenant memberships `020-user-tenant-memberships.sql`, public user login lookup `021-public-user-login-lookup.sql`, role metadata permission `022-role-metadata-permission.sql`, public password reset lookup `023-public-password-reset-lookup.sql`, and public refresh session lookup `024-public-refresh-session-lookup.sql`. SQL-only policies remain in migrations because they must not be lost during ORM adoption.

Operational role grants are defined in `local/postgres/init/005-runtime-roles.sql`; deployment assigns login credentials separately.

| Area | Tables | Owner | Isolation/immutability |
|---|---|---|---|
| Platform | `tenants`, `branches`, `teams` | Sprint 02/05 | Tenant foreign keys and lifecycle status |
| Identity | `users`, `sessions`, `invitations`, `password_history`, `password_reset_tokens`, `login_attempts`, `account_lockouts`, `device_installations` | Sprint 03/05 | Tenant-scoped identities; revoked sessions retained; secrets hashed |
| Authorization | `roles`, `permissions`, `role_permissions`, `tenant_user_roles`, `feature_registry`, `dashboard_registry`, `role_presets` | Sprint 04 | Additive grants; default deny; tenant RLS |
| Reliability | `idempotency_records`, `outbox_events`, `worker_job_attempts`, `files` | Sprint 02 | Tenant + UUID key uniqueness, durable publish/retry metadata, namespaced encrypted file metadata |
| Audit and platform control | `audit_logs`, `platform_administrators`, `god_sessions`, `destructive_requests` | Sprint 02/04/05 | Append-only hash chain, platform context, two-person destructive approval, tenant RLS; no operational-log substitution |
| Administration | `tenant_settings`, `skills`, `user_skills`, `support_notes`, `tenant_usage_snapshots` | Sprint 05 | Tenant-scoped settings, stable skill attribution, append-only support notes, usage history |

All tenant-owned tables in the baseline—identity sessions, invitations, role assignments, branches, teams, idempotency records, and audit rows—use `FORCE ROW LEVEL SECURITY` and require `app.tenant_id`, except explicitly global platform/bootstrap records.

## Migration rules

- Runtime code must set `app.tenant_id` before tenant queries.
- Feature repositories must use `DatabaseService.tenantQuery()` for tenant-owned reads/writes; generic `query()` is reserved for platform/bootstrap operations.
- Runtime roles must not update or delete audit rows.
- Passwords, refresh material, reset tokens, invitation tokens, and presigned URLs are never stored or logged in plaintext.
- Sprint 03 owns password/session compatibility changes; OTP/PIN contracts are not active login paths.
- Sprint 04 owns role/grant migration and must preserve the original authorization intent before removing legacy role paths. Migration `022-role-metadata-permission.sql` adds the role metadata edit capability and updates the Company Admin preset.
- Sprint 05 owns tenant lifecycle, settings, membership, invitation, and usage extensions.

## Reapply and rollback guidance

`006-sprint-03-authentication.sql` is re-runnable: it uses `IF NOT EXISTS`, guarded constraint creation, and idempotent policy/index definitions. Before rollback, revoke active sessions and export security audit evidence. A rollback removes only Sprint 03 additive tables and the `sessions.token_type` column after dependent application code is disabled; password history and reset-token data must be retained according to the production retention policy rather than dropped automatically.
