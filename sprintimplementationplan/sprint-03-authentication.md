# Sprint 03 — Password Authentication and Tenant Isolation

Source: [Sprint plan](../sprintplans/sprint-03-authentication.md) · Prerequisite: Sprint 02 QA sign-off · Status: `NOT STARTED` · Target: 64 points

## Outcome and boundaries

Allow active workforce users to authenticate with user ID or email and password, maintain/revoke sessions and devices, reset passwords by email, and prove tenant isolation from UI through RLS. OTP, SMS, WhatsApp and customer-portal identity are out of scope.

## Data and security model

- Tables: workforce identities, password credentials/history, refresh sessions with hashed token IDs, reset tokens, login attempts/lockout, device installations, and security audit events.
- Migrate the baseline identity model to user-ID/email password login. Phone may remain contact data but is not a login credential; company PIN and `otp_challenges` are not active authentication/confirmation paths.
- Access token is short lived; refresh tokens rotate on every use and reuse revokes the token family. Store web refresh material in Secure/HttpOnly/SameSite cookies where architecture permits and mobile tokens in Keychain/Keystore.
- Password hashing uses bcrypt cost ≥12; reset tokens are random, single-use, hashed at rest, expire quickly, and do not reveal whether an account exists.
- Tenant context is derived only from the verified identity/session. A multi-tenant identity must select among server-returned memberships; client headers never grant tenancy.

## API contracts

| Method | Path | Access | Request/result | Key errors |
|---|---|---|---|---|
| POST | `/auth/login` | Public/rate-limited | identifier, password, device metadata, idempotency → tokens/account state | `401 INVALID_CREDENTIALS`, `423 ACCOUNT_LOCKED` |
| POST | `/auth/refresh` | Refresh token | rotating token → new token pair | `401 TOKEN_EXPIRED/REUSED` |
| POST | `/auth/logout` | Authenticated | session/idempotency → `data:null` | `401` |
| POST | `/auth/logout-all` | Authenticated | idempotency → revoke all sessions | `401` |
| POST | `/auth/password/forgot` | Public/rate-limited | identifier/idempotency → generic accepted response | `429` |
| POST | `/auth/password/reset` | Public | token, new password, idempotency → all sessions revoked | `400`, `409`, `422` |
| GET | `/me` | Authenticated | safe profile, memberships, active tenant/device | `401`, `403` |
| GET/DELETE | `/me/sessions/:sessionId?` | Authenticated | list or revoke owned sessions | `404` |
| POST | `/me/tenant-context` | Authenticated | membership ID/idempotency → token for selected tenant | `403`, `404` |
| POST | `/devices/register` | Authenticated | installation/public metadata/idempotency | `409` |
| DELETE | `/devices/:deviceId` | Authenticated | revoke device/idempotency | `404` |

## Implementation checklist

- [ ] Build Auth/Tenant/Device modules with DTOs, services, repositories, domain exceptions and OpenAPI examples.
- [ ] Make login comparison timing-safe and account enumeration-resistant; normalize identifiers without changing their stored display form.
- [ ] Add per-IP and per-account throttling, progressive lockout, successful-login reset, suspicious-login event and administrator unlock path deferred to Sprint 05 UI.
- [ ] Implement token keys/rotation, audience/issuer checks, clock tolerance, session version, device binding and server-side revocation.
- [ ] Set transaction-local tenant context before tenant queries and clear it on completion/error; reject absent/inactive memberships.
- [ ] Build React login/reset/account-state screens, React Query mutations, accessible errors, safe redirect validation and logout on all tabs.
- [ ] Build Flutter login shell, secure token store, Dio refresh mutex, offline-expired state, device registration, logout and secure local wipe.
- [ ] Email reset through a temporary adapter; route it to the configurable SMTP implementation in Sprint 16 without changing the auth contract.
- [ ] Add a reviewed compatibility migration that deactivates/removes OTP/PIN-facing contracts without destroying unrelated customer contact data; generated clients contain no OTP/PIN login method.

## Dependency and Sentry implementation

- Introduce catalog-approved Router/Query/forms/Zod/date adapters only; route search is validated, server/session state never moves into Zustand, and backend validation remains authoritative.
- Add scrubbed React/Nest/Flutter auth navigation/request spans. Invalid credentials, reset requests and ordinary denials are expected metrics/breadcrumbs; passwords, tokens, cookies, emails, tenant IDs and reset URLs are prohibited event data.

## Code-principle gate

- [ ] SRP: credential verification, token/session lifecycle, tenant selection, device registration and UI state are separate components.
- [ ] OCP: credential/session policies and notification adapter extend contracts without changing callers.
- [ ] LSP/ISP/DIP: token, password and mail implementations obey focused ports and shared contract tests; Auth domain imports no provider SDK.
- [ ] DRY/KISS/YAGNI: one password/session policy serves web/mobile; OTP and deferred identity features are not scaffolded.
- [ ] Fail Fast: inactive/locked identity, invalid token/audience/membership and unsafe redirect fail before session or tenant side effects.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, audit, Sentry, and alerts

| Signal | Required events and fields |
|---|---|
| Operational logs | `auth_login_succeeded/failed`, `auth_locked`, `token_refreshed/reuse_detected`, `session_revoked`, `tenant_context_selected`, `device_registered/revoked`; identifier masked, never credentials/tokens |
| Audit | LOGIN_SUCCESS, LOGIN_FAILURE summary, PASSWORD_RESET, SESSION_REVOKE, DEVICE_REVOKE, TENANT_CONTEXT_CHANGE with actor/session/device/correlation |
| Sentry | Auth route/navigation spans; tag failure class, client platform and app version; treat invalid credentials as expected; capture unexpected crypto/session failures after scrubbing |
| Metrics/alerts | login success/failure/lockout, reset delivery/failure, refresh reuse, active sessions, 401 rate; alert on token-reuse spike and tenant-isolation failure |

## Integration, test, and LambdaTest checklist

- [ ] Unit-test password policy/hash, token rotation/reuse, session expiry/revocation, lockout and membership selection to ≥80%.
- [ ] API integration tests cover each endpoint happy path plus invalid, expired/revoked, locked/disabled, duplicate and cross-tenant cases.
- [ ] RLS/IDOR campaign uses two tenants, guessed UUIDs, modified JWT claims, forged tenant headers, missing context, inactive membership and direct repository calls.
- [ ] Browser tests cover login, remember/session behavior, reset, expiry during navigation, disabled account, safe redirects, logout and multi-tab revocation.
- [ ] Flutter tests cover secure storage, concurrent 401 refresh mutex, restart, offline launch, expired session, device replacement and local wipe.
- [ ] LambdaTest web: Chrome/Edge/Firefox/Safari plus Android Chrome/iOS Safari for login/reset; keyboard, screen reader labels, password-manager/autofill, responsive and cookie behavior.
- [ ] LambdaTest mobile: Android 10 low-memory, current Android and current iPhone; login/logout/restart/expiry/biometric-store interaction using Appium; capture device logs without tokens.
- [ ] Performance/security: credential stuffing rate limits, 100 concurrent refreshes, bcrypt latency budget, OWASP session checks, cookie flags and secret/log scan.

## Delivery and sign-off

- [ ] Regenerate clients and publish auth sequence/session-state diagrams, threat model, support diagnostics and token-key rotation runbook.
- [ ] CI gates auth unit/integration/E2E, tenant RLS matrix, web component/Playwright, Flutter analyze/widget/integration and security tests.
- [ ] Production test tenant smoke covers login → context → `/me` → refresh → logout; Sentry release has no auth regression.
- [ ] Attach API, email-adapter, audit, RLS, LambdaTest, Sentry and revocation evidence.
- [ ] Authentication QA sign-off blocks Sprint 04.
