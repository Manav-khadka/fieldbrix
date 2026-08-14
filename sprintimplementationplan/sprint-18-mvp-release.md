# Sprint 18 — MVP Security and Paid-Pilot Release

Source: [Sprint plan](../sprintplans/sprint-18-mvp-release.md) · Prerequisite: Sprint 17 beta sign-off · Status: `NOT STARTED` · Target: 64 points · Milestone: Paid-pilot MVP

## Outcome and release scope

Qualify the complete MVP for controlled paid pilots in production. This is an evidence/remediation sprint, not a feature-expansion sprint. All critical journeys, tenant isolation, dynamic RBAC, god mode, upload/evidence integrity, offline behavior, SMTP, backup, rollback, monitoring and operating procedures must pass with no open release blocker.

## Release interface freeze

- Freeze `/api/v1` OpenAPI, error catalogue, permission registry, event/queue schemas, workflow snapshot versions and mobile minimum-supported version at RC cut.
- Only backward-compatible or release-blocker fixes enter after freeze; every exception records impact, test scope, approvers and rollback.
- Health/version/synthetic contracts become externally monitored. Synthetic identities and data are isolated, least-privileged and rotated.

## Implementation and hardening checklist

- [ ] Create immutable RC manifest: backend/web/mobile/Lambda versions, DB migration, OpenAPI/content hashes, dependencies/SBOM and infra commit.
- [ ] Run SAST, dependency/container/IaC/secret scan, DAST and manual threat campaigns; close critical/high findings or obtain explicit time-bound risk acceptance.
- [ ] Attack tenant/RLS/IDOR, capability cache, role assignment, god-session forgery/expiry, audit bypass/tamper and self-approved destructive action.
- [ ] Attack uploads/evidence (MIME spoof, malware policy, zip bomb, oversized, checksum/presigned misuse), spreadsheet injection and log/Sentry PII leakage.
- [ ] Run offline stress/reconciliation and prove no evidence loss, duplicate completion or false synced state.
- [ ] Rehearse backup restore, app rollback, reversible migration, failed deployment, queue redrive, SMTP failure and compromised god-session revocation.
- [ ] Validate alarms/on-call routing, runbook access, production test-tenant safeguards and support access evidence.
- [ ] Complete pilot onboarding, data handling/retention, incident response, status communication and rollback authority checklists.
- [ ] Verify every company-web, worker-mobile and platform-admin screen in DOCX §24 is implemented, linked to a permission/route, included in accessibility/browser/device coverage and absent when its capability is denied.
- [ ] Capture pilot KPIs: configuration time, unaided worker completion, completion/abandonment, offline sync, on-time/overdue, review/rejection, follow-up reasons, confirmation and configuration-versus-custom-code ratio.

## Dependency and Sentry implementation

- Freeze exact Node/Flutter/Python manifests, lockfiles and SBOM in the RC; fail deprecated/vulnerable/discontinued or unapproved-license dependencies, paid/premium frontend packages and any prerelease other than the documented exact grid beta.
- Verify `fieldbrixxx/{vite-react,nest,flutter,lambdas}` release IDs, source maps/symbols, scrubbing, tested alerts/runbooks and crash/error baselines; no unresolved critical issue or privacy leak may ship.

## Code-principle gate

- [ ] SRP: blocker fixes preserve established module boundaries and do not mix release tooling with domain behavior.
- [ ] OCP: release fixes extend intended contracts/strategies; emergency central switches or tenant-specific branches require rejection or explicit ADR.
- [ ] LSP/ISP/DIP: contract suites re-prove all substituted local/AWS/provider adapters and import-boundary architecture tests.
- [ ] DRY/KISS/YAGNI: fixes use authoritative policies and the smallest safe change; no feature expansion enters the RC.
- [ ] Fail Fast: frozen contract/config/migration/security/release-manifest checks stop promotion before production side effects.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Observability and Sentry release gates

| Gate | Pass criterion |
|---|---|
| Logs/audit | critical journeys correlate device/web → API → queue/Lambda; no secret/PII violations; audit chain reconciles |
| Sentry | correct releases/source maps/debug files; no unresolved new critical issue; crash-free baseline recorded; alerts tested |
| CloudWatch | API latency/error, RDS, S3, queue/DLQ, jobs, SMTP, sync and backups visible with named owner/runbook |
| Synthetics | liveness/readiness/login/task/report safe smoke passes on schedule and after deploy; failure pages on-call |
| Recovery | recorded restore/rollback meets agreed RTO/RPO and does not corrupt accepted mobile work |

## Test and LambdaTest campaign

- [ ] Run all unit/integration/contract/E2E suites from a clean RC commit; flaky tests are fixed/quarantined only with owner and deadline.
- [ ] Run four-sector production-like journeys including custom roles/dashboard, god support, offline evidence, signature/review, PDF and tenant SMTP.
- [ ] Assert deferred interfaces are absent from MVP routes/OpenAPI/navigation: OTP/PIN/phone login, portal, invoice/payment/quote, continuous/off-duty tracking, route optimization, custom master modules, AI/OCR, advanced inventory and native white-label apps.
- [ ] LambdaTest web: full critical suite on current Chrome/Edge/Firefox/Safari plus Android Chrome/iOS Safari; WCAG 2.2 AA, 200% zoom and slow-network passes.
- [ ] LambdaTest mobile: signed RC APK/IPA on low-end Android 10, current Android and current iPhone; offline day, kill/restart, GPS/camera/signature/storage and accessibility.
- [ ] Run load/soak at pilot concurrency and max supported workflow/evidence; record p95/p99, error rate, queue lag, DB pool and cost.
- [ ] Run destructive-approval drill with two administrators and verify self/stale/replay/changed-payload paths fail.
- [ ] Perform browser/device failure triage with video/trace/log correlation and rerun every fixed failure on same matrix.

## Paid-pilot go/no-go

- [ ] Product confirms scope/non-goals and pilot acceptance journeys.
- [ ] QA confirms zero Severity 1/2 defects and approved disposition for lower severities.
- [ ] Security confirms no critical/high exploitable findings and signs god-mode/tenant isolation.
- [ ] Platform confirms deploy/rollback/restore/alarms/on-call and capacity/cost limits.
- [ ] Engineering confirms migration/API/mobile compatibility and support diagnostics.
- [ ] Pilot owner confirms named tenants/users, training, escalation and rollback/disable plan.
- [ ] Attach RC manifest, reports, LambdaTest/Sentry/CloudWatch links, restore/rollback evidence and formal release decision.

Rollback: disable affected feature flags/tenant access when safe, stop new pilot work if data integrity is at risk, preserve unsynced device data, and deploy the prior manifest using the rehearsed procedure.
