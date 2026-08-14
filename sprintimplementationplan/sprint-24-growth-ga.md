# Sprint 24 — Growth GA Qualification

Source: [Sprint plan](../sprintplans/sprint-24-growth-ga.md) · Prerequisite: Sprint 23 Growth RC sign-off · Status: `NOT STARTED` · Target: 64 points · Milestone: Growth GA

## Outcome and change control

Release the complete FieldBrix Growth product with verified functionality, isolation, god-mode control, reliability, privacy, accessibility, performance, documentation, monitoring and recovery. No new product scope enters this sprint. Only release blockers, operational readiness and evidence gaps are changed, each with explicit regression impact.

## Final release manifest

- API/web/mobile/Lambda/container versions and commit SHAs.
- OpenAPI, generated-client, permission/feature registry, workflow/template, event and sync protocol versions/hashes.
- Database migration sequence/checksums, RLS/constraint verification and rollback/forward-fix decision.
- Terraform plan/apply ID, production configuration hash, feature flags and tenant rollout cohort.
- SBOM, vulnerability/penetration report, Sentry release IDs, CloudWatch dashboards/alarms, LambdaTest build IDs and test reports.
- Named launch commander, database/platform/security/mobile/QA owners, go/no-go approvers and rollback authority.

## Final implementation and operations checklist

- [ ] Freeze RC and require two engineering reviews plus QA impact approval for every later change.
- [ ] Resolve every blocker; map each fix to unit/integration/E2E/security/device regression and rerun affected plus critical suites.
- [ ] Verify migrations on production-scale copy/disposable equivalent, backup immediately before deploy and test restore/forward-fix.
- [ ] Validate blue/green/canary or approved rollout, health gates, feature flags, tenant cohort control and automatic/manual rollback triggers.
- [ ] Configure production synthetics for health, auth, capabilities, task, portal, report/email-safe path and queue processing using isolated accounts.
- [ ] Verify on-call schedules, alerts, runbooks, status communication, audit access, god-session revocation, data incident and customer support escalation.
- [ ] Validate retention/deletion jobs, backup policies, secret/certificate rotation, dependency patch process and cost budgets.
- [ ] Produce administrator, dispatcher, worker, reviewer, accounts, portal and platform operator guides with exact supported versions.

## Dependency and Sentry implementation

- Final manifests/lockfiles/SBOM pass latest-compatible-stable, deprecation/discontinuation, advisory and approved open-source-license review; only exact `react-data-grid@7.0.0-beta.61` remains as the documented prerelease and no premium UI package launches.
- Validate every Sentry release/source map/symbol, scrubber, crash/error baseline and page-worthy alert/runbook during canary and rollout; record dependency/Sentry evidence and rollback versions in the GA manifest.

## Code-principle gate

- [ ] SRP: blocker fixes and operational changes retain module/use-case/repository/adapter responsibilities.
- [ ] OCP: no release fix introduces tenant-specific branches or growing central switches; exceptions require an ADR and follow-up owner.
- [ ] LSP/ISP/DIP: architecture/import and shared adapter contract tests pass for every production/local substitute.
- [ ] DRY/KISS/YAGNI: authoritative policy sources and the smallest safe fix are used; no new product scope or speculative abstraction enters GA.
- [ ] Fail Fast: manifest, migration, config, contract, security, health and canary gates stop rollout before unsafe traffic or mutations.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Security and god-mode campaign

- [ ] Cross-tenant probes cover every resource, endpoint, export, download, dashboard, queue job, search and portal projection.
- [ ] Dynamic roles cover blank/custom names, cloned presets, multiple additive roles, action/dashboard/scope grants, cache invalidation and deny-by-default.
- [ ] God mode covers tenant selection, reason, re-auth, banner, expiry, switching, every action class, audit contents and tenant-deny bypass.
- [ ] Forged/expired/revoked god contexts, tenant-admin assignment/clone/edit, scoped Support/Compliance elevation and audit interceptor removal all fail.
- [ ] Irreversible operations reject self-approval, inactive/stale approver, expired request, changed payload/target, replay and unapproved direct execution.
- [ ] Secrets/PII are absent from code, artifacts, logs, Sentry, traces, screenshots/videos, URLs and downloadable test evidence.
- [ ] Close or formally accept scan/penetration findings; no exploitable critical/high finding may launch.

## Full regression and LambdaTest matrix

- [ ] Clean-run backend/service/repository unit coverage ≥80%, controller integration happy + top three errors, OpenAPI contracts and all story E2E.
- [ ] Run customer → portal request → contract/entitlement → task/schedule → mobile offline execution/evidence/signature → review → report/email → invoice/credit → tracking/feedback/SLA end to end.
- [ ] Run import, workflow rule/version, sync chaos, invoice concurrency/rounding, SMTP fail-closed, tracking privacy and SLA reconciliation suites.
- [ ] LambdaTest web: complete critical journeys on current Chrome/Edge/Firefox/Safari; Android Chrome/iOS Safari; approved supported previous versions; responsive, 200% zoom and WCAG 2.2 AA.
- [ ] LambdaTest mobile: signed GA-candidate APK/IPA on low-end Android 10, current Samsung/Pixel, current iPhone and one previous supported OS; Appium, accessibility, offline/network/GPS/camera/storage/battery.
- [ ] Run production-scale load/soak for API, sync, imports, scheduler, reports/PDF/email, invoices, tracking and portal; meet published p95/p99/error/queue/DB/cost budgets.
- [ ] Validate Sentry source maps/symbols and crash-free/error baselines; test each page-worthy alert and connect it to a working runbook/on-call route.
- [ ] Run deploy smoke, canary observation, rollback and post-rollback mobile sync reconciliation before authorizing GA.

## GA go/no-go and post-launch

- [ ] Product confirms all locked scope and deferrals; documentation/training/support are ready.
- [ ] QA confirms all sprint sign-offs, no release blockers and traceable evidence for every acceptance journey.
- [ ] Security/Privacy confirms isolation, god mode, approvals, audit, uploads, secrets and retention.
- [ ] Platform confirms production capacity, backup/restore, deployment/rollback, alarms, certificates, domains and cost controls.
- [ ] Engineering confirms schema/API/protocol compatibility, zero uncommitted generated drift and operable support diagnostics.
- [ ] Launch commander records formal decision, rollout sequence, observation window, success/abort thresholds and stakeholder channel.
- [ ] Monitor release/Sentry/CloudWatch/synthetics during rollout; reconcile critical business counts and device sync receipts.
- [ ] At observation-window end, record GA outcome, incidents, residual risks, follow-up owners/dates and final evidence links in the master tracker.

Rollback: stop rollout and new high-risk mutations, preserve accepted and unsynced work, revoke unsafe sessions/links, restore prior immutable application manifest, and use the rehearsed database forward-fix/restore decision. Never “roll back” by deleting evidence, invoices, audit records or offline queues.
