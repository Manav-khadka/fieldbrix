# FieldBrix MVP + Growth Roadmap

This directory is the execution source of truth for the 24-sprint FieldBrix roadmap. Each sprint file contains one outcome-based goal, a fully allocated 64-point backlog, explicit dependencies, functional acceptance criteria, and the test coverage required for QA sign-off.

The [product and sprint traceability matrix](TRACEABILITY.md) maps every section of the original MVP requirements, all 46 baseline schema tables, approved superseding decisions, engineering rules, screen inventory, pilot gates, and explicit deferrals to an owning sprint. A sprint cannot receive QA sign-off while one of its traced requirements lacks evidence.

## Delivery baseline

| Item | Commitment |
|---|---|
| Cadence | 24 two-week sprints / 48 weeks |
| Capacity | 64 story points per sprint; 1,536 total |
| Team | 2 backend, 1 web, 2 mobile, 2 QA/automation, 1 platform/DevOps |
| Estimation | Modified Fibonacci story points |
| Quality policy | Development, infrastructure, test planning, QA, defect correction, and re-test all consume sprint capacity |
| Dependency policy | A dependent increment cannot start until its prerequisite has QA sign-off |
| Environment | Local development and production; CI uses disposable dependencies and production uses isolated internal test tenants |

There is no generic contingency or interrupt allocation. Every sprint commits 64 points to named feature or QA work. Actual velocity is reviewed after Sprint 3; dates may be rebaselined, but QA work is never compressed to preserve a date.

## Source control

- Product journeys and original MVP acceptance: [`Configurable_Field_Service_MVP_Requirements.docx`](../docs/Configurable_Field_Service_MVP_Requirements.docx)
- Original schema and design rationale: [`fieldbrix-schema.sql`](../docs/fieldbrix-schema.sql) and [`fieldbrix-schema-readme.md`](../docs/fieldbrix-schema-readme.md)
- Engineering rules: [`ENGINEERING_HANDBOOK.md`](../docs/ENGINEERING_HANDBOOK.md) and [`tech_implementation_guide.md`](../docs/tech_implementation_guide.md)
- Frontend dependency status, ownership and registry audit: [`react-libraries.md`](../react-libraries.md)
- Sentry platform contracts and safe verification: [`sentry/`](../sentry/)
- Verified AWS SSO/STS and hosted Sentry bootstrap: [`AWS_SENTRY_BOOTSTRAP.md`](../docs/terraform/AWS_SENTRY_BOOTSTRAP.md)
- Decision reconciliation and complete coverage: [TRACEABILITY.md](TRACEABILITY.md)

## Milestones

| Milestone | Sprint | Exit condition |
|---|---:|---|
| Internal alpha | 12 | Minimal assigned task completes through the mobile offline walking skeleton |
| MVP beta-ready | 17 | All industry templates exist and four representative sector journeys pass |
| Paid-pilot MVP | 18 | MVP security, reliability, recovery, and production-pilot gates pass |
| Growth release candidate | 23 | Multi-site, SLA, white-label, and complete portal integrations pass |
| Growth GA | 24 | Full regression, security, recovery, performance, and operational sign-off |

## Locked authorization model

### Platform Super Admin god mode

- Platform Super Admin is an immutable system role with unrestricted access across every tenant.
- God mode bypasses tenant roles, feature grants, dashboard restrictions, and own/team/branch scopes.
- Tenant access requires explicit tenant selection, a mandatory reason, recent password re-authentication, and a persistent god-mode banner.
- Every god-mode action records the administrator, tenant, reason, session, correlation ID, affected records, and before/after values.
- Tenant deletion, permanent purge, region migration, and equivalent irreversible actions require approval from a different authorized platform administrator.
- Tenant administrators cannot create, clone, assign, edit, or restrict god mode. Support and Compliance platform roles do not inherit it.

### Dynamic tenant authorization

- Ten tenant-workforce presets are cloneable; administrators may also create blank, arbitrarily named roles.
- A user may have multiple additive roles.
- Permissions are allow-only and deny-by-default.
- Grants cover dashboard/module features, actions, and `own`, `team`, `branch`, or `all` data scopes.
- Backend authorization is authoritative. Navigation and dashboard widgets derive from the same effective-capabilities response.
- Customer portal identities remain separate from tenant-workforce and platform identities.

## Locked authentication, email, and commercial scope

- Staff and portal users authenticate with ID/email and password.
- Visit confirmation uses offline signatures. OTP, SMS, and WhatsApp are deferred.
- Super Admin configures a global SMTP profile and optional tenant-specific overrides. Secrets are encrypted, profiles are testable, and a failed tenant profile queues retries and alerts rather than silently falling back.
- Growth includes contracts, entitlements, histories, renewals, immutable invoices, credit notes, PDF/email delivery, manual invoice status, and portal invoice visibility.
- Payments, reconciliation, dunning, quotations, automated SaaS charging, payroll, advanced inventory, AI/OCR, accounting integrations, and white-label native applications are deferred.

## Public interfaces and data model

- Replace the fixed membership-role enum with `roles`, `permissions`, `role_permissions`, and `tenant_user_roles`.
- Add a feature/dashboard registry and an effective-capabilities endpoint such as `GET /me/capabilities`.
- Require each protected API operation to declare its permission key and supported scope.
- Keep god-mode authorization separate from tenant RBAC and introduce short-lived god-mode tenant sessions.
- Store dual-approval requests with requester, approver, action, target, expiry, and execution result.
- Add encrypted global/tenant SMTP profiles, verification state, delivery attempts, retries, and errors.
- Preserve the tenant-scoped workflow/task schema and add Growth entities for portal users, service requests, contracts, contract versions, invoices, invoice lines, credit notes, tracking sessions, and feedback.
- Generate Flutter models from the backend OpenAPI contract.
- Treat `fieldbrix-schema.sql` as the original-MVP baseline, not the final target: preserve UUIDv7 entity identity, composite tenant foreign keys, forced RLS, soft history, indexes and evidence metadata while applying the dynamic-RBAC, signature-only, SMTP and Growth migrations listed in [TRACEABILITY.md](TRACEABILITY.md#database-baseline-coverage-and-evolution).

## Binding dependency and observability policy

- `react-libraries.md` is a candidate/ownership catalog, not an install-all command. Add a package only in its owning sprint when accepted behavior uses it.
- Choose the latest mutually compatible stable non-deprecated release, commit lockfiles and pass advisories, peer/runtime, migration and approved open-source-license checks. Paid/premium frontend runtime dependencies are prohibited.
- `react-data-grid@7.0.0-beta.61` is the only prerelease exception and is exact-pinned/isolated in Sprint 06. React Big Calendar replaces premium resource schedulers; official SheetJS `0.20.3` replaces the stale public npm package; date-fns is the single date utility; MapLibre is Sprint 22-only.
- Every sprint records dependency review and its Sentry project/release evidence. Hosted projects are `fieldbrixxx/{vite-react,nest,flutter,lambdas}` with environment-only DSNs, CI-only upload token, tested scrubbing and no replay until masking is approved.

## Dependency chain

```text
Repository and infrastructure
  -> application/database platform
    -> authentication and tenant isolation
      -> dynamic RBAC, god mode, and audit
        -> company administration
          -> master data and imports
            -> workflow builder
              -> conditional rules
                -> workflow governance
                  -> tasks and scheduling
                    -> mobile execution
                      -> offline hardening
                        -> confirmation and review
                          -> reporting and email
                            -> industry beta and paid pilot
                              -> portal
                                -> contracts
                                  -> invoices
                                    -> tracking
                                      -> multi-site Growth release
```

## Sprint index

1. [Repository and Infrastructure Foundation](sprint-01-foundation.md)
2. [Application, Database, and API Platform](sprint-02-application-platform.md)
3. [Password Authentication and Tenant Isolation](sprint-03-authentication.md)
4. [Dynamic RBAC, God Mode, and Audit](sprint-04-authorization.md)
5. [Platform and Company Administration](sprint-05-administration.md)
6. [Master Records and Spreadsheet Imports](sprint-06-master-data.md)
7. [Workflow Builder Foundation](sprint-07-workflow-builder.md)
8. [Advanced Fields and Conditional Rules](sprint-08-rule-engine.md)
9. [Workflow Governance and Templates](sprint-09-workflow-governance.md)
10. [Task Lifecycle and Assignment](sprint-10-task-lifecycle.md)
11. [Bulk Work, Recurrence, Scheduling, and Notifications](sprint-11-scheduling.md)
12. [Mobile Foundation and Offline Walking Skeleton](sprint-12-mobile-alpha.md)
13. [Full Mobile Execution and Evidence](sprint-13-mobile-execution.md)
14. [Offline Sync and Conflict Hardening](sprint-14-offline-sync.md)
15. [Customer Signature and Supervisor Review](sprint-15-review.md)
16. [Reporting, PDFs, and Tenant-Aware SMTP](sprint-16-reporting-email.md)
17. [Industry Templates and Beta Qualification](sprint-17-industry-beta.md)
18. [MVP Security and Paid-Pilot Release](sprint-18-mvp-release.md)
19. [Customer Portal and Self-Service Tickets](sprint-19-customer-portal.md)
20. [Contracts, Entitlements, and Renewals](sprint-20-contracts.md)
21. [Invoices, Credit Notes, and Manual Status](sprint-21-invoicing.md)
22. [Visit Tracking, Ratings, and Escalations](sprint-22-tracking-feedback.md)
23. [Multi-Site SLA and White-Label Portal](sprint-23-growth-rc.md)
24. [Growth GA Qualification](sprint-24-growth-ga.md)

## Principal risks

1. God mode has platform-wide blast radius. Re-authentication, reasons, short-lived context, persistent banners, audit, alerts, and dual approval are release gates.
2. There is no staging environment. CI isolation, migration rehearsals, blue/green deployments, production canaries, backups, and rollback drills compensate but do not remove the risk.
3. Offline synchronization and evidence integrity are the largest technical uncertainty; Sprint 14 is the most likely MVP sprint to slip.
4. Dynamic RBAC and god mode create two authorization paths that every endpoint, query, dashboard, and export must test.
5. Workflow rules, sector templates, contracts, tax behavior, and SLA definitions may change after design-partner validation. Sprints 8, 17, 20, 21, and 23 carry elevated product-policy risk.

The highest-regression areas are god mode/RBAC, tenant context/RLS, workflow rules/versioning, offline sync/task transitions, and invoice numbering/immutability.
