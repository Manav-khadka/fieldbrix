# Sprint 23 — Multi-Site SLA and White-Label Portal

Source: [Sprint plan](../sprintplans/sprint-23-growth-rc.md) · Prerequisite: Sprint 22 QA sign-off; contracts/reporting/portal signed off · Status: `NOT STARTED` · Target: 64 points · Milestone: Growth release candidate

## Outcome and RC scope

Large customer contacts access authorized sites and rollups; staff monitor versioned SLA clocks/breaches and reports; portals/emails support safe tenant themes, terminology and domains. All portal, contract, task, invoice and tracking boundaries remain intact. This sprint ends with a frozen Growth RC, not GA.

## API contracts

| Method | Path | Permission/scope | Contract highlights |
|---|---|---|---|
| GET/PUT | `/portal-contacts/:id/site-grants` | `portal.contacts.configure` | complete site set/revision/idempotency |
| GET/POST | `/sla-policies` | `sla.policies.view/create` | priority/service/calendar/targets/idempotency |
| PATCH | `/sla-policies/:id` | `sla.policies.edit` | new effective version; active history immutable |
| GET | `/sla-instances` | `sla.instances.view` + scope | active/paused/breached filters and deadlines |
| POST | `/sla-instances/:id/recalculate` | `sla.instances.correct` | policy/version/reason/idempotency; audited |
| GET | `/reports/sla` | `reports.sla.view` + scope | site/customer/period rollups with freshness |
| GET | `/portal/dashboard` | Portal site-scoped | request/task/contract/invoice/visit rollups |
| GET/PUT | `/company/portal-branding` | `company.branding.view/configure` | theme/logo/terms/email/domain config |
| POST | `/company/portal-domains/:id/verify` | `company.branding.configure` | DNS verification/idempotency/status |

## Implementation checklist

- [ ] Extend contact grants with explicit customer/site hierarchy and efficient scope joins; dashboard/report/export all use same resolver.
- [ ] Define SLA policy versions, business calendar/timezone/holidays, start/pause/resume/stop events, targets and immutable event timeline.
- [ ] Create SLA instance from pinned policy snapshot; scheduler updates deadlines/breach idempotently; recalculation requires permission/reason and preserves old result.
- [ ] Reconcile SLA rollups against instances and source task/request events; expose calculation explanation and freshness.
- [ ] Build multi-site portal dashboard/drill-down and staff SLA dashboard/history/report/export with tenant and portal scope controls.
- [ ] Sanitize/validate colors, logos, CSS tokens, terminology, sender content and hostnames; never permit arbitrary HTML/JS/CSS injection.
- [ ] Implement custom domain ownership verification, certificate/DNS lifecycle, routing allowlist, safe fallback and observable expiry/failure.
- [ ] Apply branding consistently to portal, PDF-safe tokens and SMTP templates without cross-tenant cache leakage.
- [ ] Cut immutable RC manifest and restrict post-freeze changes to blocker fixes with regression mapping.

## Dependency and Sentry implementation

- Reuse approved charts, branding, table and portal adapters; run RC dependency/license/bundle checks and reject tenant-specific forks or paid/premium UI packages.
- Trace SLA scheduler/report/portal/domain flows with tenant-safe cache context; page cross-tenant branding/scope or clock corruption and scrub tenant/domain/customer values.

## Code-principle gate

- [ ] SRP: site-scope resolution, SLA policy/clock, rollups, branding, domain verification and certificate operations remain separate.
- [ ] OCP: SLA calendars/policies and branding token providers extend typed strategies without core tenant-specific branches.
- [ ] LSP/ISP/DIP: DNS/certificate/cache/calendar implementations pass focused contracts; domain modules own ports.
- [ ] DRY/KISS/YAGNI: one site scope/SLA/branding rule set drives every surface; native white-label apps remain deferred.
- [ ] Fail Fast: grant/policy/version/branding/hostname/ownership checks precede disclosure, clock mutation or domain activation.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `site_grants_changed`, `sla_instance_started/paused/resumed/breached/recalculated`, `branding_saved`, `domain_verified/certificate_*`; safe IDs only |
| Audit | grant diffs, policy versions, clock events/recalculation reason, branding/domain changes, god context |
| Sentry | SLA scheduler/report/portal/domain traces; tenant-safe cache context; page on cross-tenant branding/scope or clock corruption |
| Metrics/alerts | SLA timer lag/breaches/recalc, report latency, domain verify/cert expiry, cache hit/key isolation, portal errors; alert on missed clocks/cert expiry |

## Test, integration, and LambdaTest checklist

- [ ] Unit/property tests cover site grants, SLA calendar/timezone/DST/holiday/pause/event ordering and branding sanitization.
- [ ] Matrix-test contacts with one/many/no sites across portal requests, contracts, histories, invoices, tracking, dashboards and exports.
- [ ] Reconcile SLA instances/reports against independent clock fixtures; retry/concurrent scheduler never double-breaches.
- [ ] Attack branding injection, SVG/script, malicious CSS/URLs, host header/domain takeover, cache poisoning and tenant asset leakage.
- [ ] E2E multi-site portal → request/task/contract/invoice/tracking rollup and staff SLA drill-down/export/email branding.
- [ ] LambdaTest web/portal: browser and Android/iOS mobile-web matrix for multiple themes, long/RTL terms, custom domain/TLS, responsive/print and WCAG.
- [ ] LambdaTest native: verify tenant branding/terminology and multi-site-linked task context where app surfaces it; otherwise record scoped assessment.
- [ ] Load large-customer site/task/SLA rollups and concurrent portal users; record p95, query plans, cache correctness and cost.

## Growth RC sign-off

- [ ] Publish SLA formula/calendar policy, site-scope model, branding/domain security guide, certificate and recalculation runbooks.
- [ ] CI gates SLA property/reconciliation, portal scope/RLS, injection/domain security, full cross-feature E2E, accessibility and performance.
- [ ] Production isolated tenants exercise two brands/domains concurrently and prove no cache/data bleed.
- [ ] Attach RC manifest, LambdaTest/Sentry/security/reconciliation evidence and QA/Product candidate sign-off; Sprint 24 is blocked until complete.
