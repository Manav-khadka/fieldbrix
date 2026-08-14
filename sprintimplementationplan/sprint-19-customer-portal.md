# Sprint 19 — Customer Portal and Self-Service Tickets

Source: [Sprint plan](../sprintplans/sprint-19-customer-portal.md) · Prerequisite: Sprint 18 paid-pilot sign-off · Status: `NOT STARTED` · Target: 64 points

## Outcome and identity boundary

Customer users authenticate with email/password in a separate portal identity domain, access only explicitly linked customer/sites, create service requests with photos/comments and follow status. Portal identities cannot receive workforce/platform roles. Staff convert requests into tasks through a traced, idempotent link; god-mode support remains audited.

## API contracts

| Method | Path | Access/permission | Contract highlights |
|---|---|---|---|
| POST | `/portal/auth/login` | Public/rate-limited | email/password/device → portal session |
| POST | `/portal/auth/forgot-password` | Public | generic response/idempotency |
| POST | `/portal/auth/reset-password` | Public token | single-use reset/session revocation |
| GET | `/portal/me` | Portal auth | contact, customer/site grants, branding |
| GET/POST | `/portal/service-requests` | Portal scoped | list/create request with site/category/description/idempotency |
| GET | `/portal/service-requests/:id` | Portal scoped | status/timeline/safe comments/photos |
| POST | `/portal/service-requests/:id/comments` | Portal scoped | body/idempotency; moderation limits |
| POST | `/portal/service-requests/:id/attachments` | Portal scoped | upload intent/metadata/idempotency |
| POST | `/service-requests/:id/convert-to-task` | `requests.convert` + scope | workflow/assignment/schedule/revision/idempotency |
| GET/POST/PATCH | `/portal-contacts[/:id]` | `portal.contacts.*` | staff-managed contact/site access |

## Implementation checklist

- [ ] Add portal identities/credentials/sessions, contacts, customer/site access grants, requests, comments, attachments and status history with tenant/RLS.
- [ ] Use separate guards/token audience/repositories and route namespace; explicitly reject portal token on workforce/platform APIs and vice versa.
- [ ] Apply enumeration resistance, bcrypt/session controls and reset flows equivalent to Sprint 03.
- [ ] Validate request site against contact grant; never accept tenant/customer identity directly from body as authority.
- [ ] Reuse secure file pipeline with portal-specific quotas/MIME and malware policy; signed access is short-lived and scoped.
- [ ] Build branded responsive portal login/request list/create/detail/comment/recovery with accessible status language.
- [ ] Convert to task transactionally with reciprocal IDs, task permission/scope and stable replay result; subsequent state changes project safe statuses to portal.
- [ ] Route email through tenant SMTP resolution and expose delivery failure only to authorized administrators, not sensitive internals to customer.

## Dependency and Sentry implementation

- Reuse approved Router/Query/forms/Radix/Dropzone adapters in the separate portal entrypoint; forbid a second frontend framework, validation source or premium widget.
- Emit a distinct portal release to `fieldbrixxx/vite-react`; trace auth/request/upload routes with scrubbed URL/referrer/form text and leave replay disabled until masking tests pass.

## Code-principle gate

- [ ] SRP: portal identity, contact/site scope, request lifecycle, attachments, safe projection and task conversion remain separate.
- [ ] OCP: request categories/status projections/email handlers extend registries/policies without altering identity boundaries.
- [ ] LSP/ISP/DIP: portal/workforce auth and upload/mail adapters obey distinct focused contracts; portal domain owns its ports.
- [ ] DRY/KISS/YAGNI: shared security/upload knowledge is reused without merging identity domains; payments/chat/OTP remain deferred.
- [ ] Fail Fast: token audience, contact/site grant, file and conversion revision checks precede reads or mutations.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `portal_login_*`, `portal_request_created/commented/status_changed`, `portal_attachment_*`, `request_converted`; contact/email/text/photo excluded |
| Audit | contact/site grant, request/status/comment metadata, conversion actor/task and god support context |
| Sentry | separate portal frontend release; auth/request/upload traces; scrub URLs/form text; session replay disabled until masking verified |
| Metrics/alerts | portal login/request/upload/convert latency/failure, request age, email failure, 403/404 probes; alert on isolation anomaly or upload abuse |

## Test, integration, and LambdaTest checklist

- [ ] Unit-test portal scope resolver, token audience, request lifecycle, safe status projection and conversion.
- [ ] Two tenants × multiple customers/sites/contact grants: attempt guessed IDs, reassigned contacts, stale sessions, forged customer/site and workforce endpoint access.
- [ ] Endpoint tests cover valid flow plus invalid site, unsafe upload, duplicate conversion, forbidden status/comment and cross-tenant probe.
- [ ] E2E portal create with photo → staff triage/convert → task status updates → customer timeline/email.
- [ ] Test reset/lockout/session revoke, responsive upload retry, duplicate submit, deleted/inactive contact and god-mode support audit.
- [ ] LambdaTest portal: Chrome/Edge/Firefox/Safari, Android Chrome/iOS Safari real devices; request/photo/status/recovery, keyboard/screen reader/WCAG and branding.
- [ ] LambdaTest staff web: request queue/convert link on browser matrix; mobile native marked N/A unless notifications/deep links change.
- [ ] Load portal request/search/status projections and upload quotas; record query plans/rate-limit behavior.

## Delivery and sign-off

- [ ] Publish portal identity/threat model, safe status mapping, contact/site grant rules, privacy/retention and support/reset runbooks.
- [ ] CI gates token-domain separation, RLS/IDOR matrix, upload security, portal/staff E2E, accessibility and OpenAPI drift.
- [ ] Production test customer creates/converts/tracks a request; audit/log/Sentry/email correlation is verified.
- [ ] Attach isolation campaign, LambdaTest/Sentry/email evidence and QA/Security sign-off; Sprint 20 is blocked until complete.
