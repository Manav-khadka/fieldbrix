# Sprint 20 — Contracts, Entitlements, and Renewals

Source: [Sprint plan](../sprintplans/sprint-20-contracts.md) · Prerequisite: Sprint 19 QA sign-off; SMTP Sprint 16 signed off · Status: `NOT STARTED` · Target: 64 points

## Outcome and temporal model

Staff and customers see correct contract coverage, allowances, asset/service history and renewals. Contract versions/amendments are effective-dated and immutable once activated. Entitlement evaluation returns an explanation snapshot pinned to task/request time so later amendments do not rewrite historical decisions.

## API contracts

| Method | Path | Permission/scope | Contract highlights |
|---|---|---|---|
| GET/POST | `/contracts` | `contracts.view/create` + scope | list/create draft contract/idempotency |
| GET/PATCH | `/contracts/:id` | `contracts.view/edit` + scope | aggregate/revision; active immutable fields rejected |
| POST | `/contracts/:id/versions` | `contracts.amend` | effective date/coverage/allowances/idempotency |
| POST | `/contracts/:id/activate` | `contracts.activate` | validated draft/revision/idempotency |
| POST | `/contracts/:id/terminate` | `contracts.terminate` | effective date/reason/idempotency |
| POST | `/entitlements/evaluate` | relevant task/request permission | customer/site/target/service/time → result/reasons/version |
| GET | `/customers/:id/service-history` | `contracts.history.view` + scope | contract/task/target timeline |
| GET | `/renewals` | `contracts.renewals.view` + scope | date/status filters and reminder state |
| POST | `/renewals/:contractId/reminders` | `contracts.renewals.send` | template/recipient/idempotency |
| GET | `/portal/contracts` | Portal scoped | safe active coverage/allowance/history |

## Implementation checklist

- [ ] Model contract, immutable version, coverage by customer/site/target/service, allowance counters/rules, amendment, renewal/reminder and evaluation snapshot.
- [ ] Define effective-time inclusivity, timezone, overlapping-contract precedence, termination/lapse and allowance reservation/consumption semantics.
- [ ] Evaluate through a pure service returning covered/not-covered/unknown, reasons, applicable version and remaining allowance.
- [ ] Persist task/request entitlement snapshot and re-evaluate only through explicit authorized action with audit.
- [ ] Implement amendment by new version; never update active historical version. Lock concurrent allowance consumption.
- [ ] Build staff contract/version/coverage/renewal/history UI and safe portal coverage/history views.
- [ ] Integrate evaluation into request conversion, task creation/mobile display and reporting without blocking god-mode corrective action.
- [ ] Schedule reminders idempotently through Sprint 11 and tenant SMTP; lapsed/failed reminder is visible and alerted.

## Dependency and Sentry implementation

- Use the approved tables/forms and the single date-fns/date-fns-tz stack for effective dates, renewals and tenant timezone display; reject `moment`, `dayjs` or another duplicate date library.
- Trace entitlement/allowance transactions and scheduler/email spans using contract version/outcome codes only; capture unexpected overlap/negative allowance without contract/customer contents.

## Code-principle gate

- [ ] SRP: contract aggregate/versioning, entitlement evaluation, allowance accounting, history and renewal scheduling remain separate.
- [ ] OCP: coverage/allowance rule types extend typed policy handlers rather than changing evaluator orchestration.
- [ ] LSP/ISP/DIP: clock, scheduler and mail implementations pass focused contracts; contract domain owns interfaces.
- [ ] DRY/KISS/YAGNI: one temporal/overlap/evaluation policy drives API/UI/mobile; quote/payment features remain absent.
- [ ] Fail Fast: effective date, overlap, scope, version and allowance checks finish before activation/consumption/reminder side effects.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `contract_created/versioned/activated/terminated`, `entitlement_evaluated/overridden`, `allowance_reserved/consumed`, `renewal_reminder_*`; safe IDs/result codes |
| Audit | all terms/coverage/version changes, evaluation/override reason, allowance movements, god context and reminder request/result |
| Sentry | entitlement/allowance transaction and scheduler/email spans; unexpected overlap/negative allowance captured |
| Metrics/alerts | evaluations/results/latency, overlaps, remaining/negative allowances, renewals due/lapsed, reminder failures; page on negative/double consumption |

## Test, integration, and LambdaTest checklist

- [ ] Truth-table unit tests cover date boundaries, overlaps, site/target/service hierarchy, allowances, amendments, termination and timezone.
- [ ] Concurrency-test allowance reservation/consumption/release and replay; never negative or double consumed.
- [ ] Endpoint tests cover invalid effective dates/overlap policy, stale revision, wrong scope, historical mutation and cross-tenant ID.
- [ ] E2E portal request → entitlement → task/mobile display → approved service → allowance/history → renewal email.
- [ ] Verify active task retains pinned entitlement after amendment/lapse and explicit override carries permission/reason/audit.
- [ ] LambdaTest staff/portal web: contract editor, version diff, renewal, coverage/history across browser/mobile-web matrix and WCAG.
- [ ] LambdaTest native: covered/uncovered/unknown/offline cached entitlement on Android/iPhone, then reconcile after amendment.
- [ ] Load large coverage/contract histories and concurrent evaluations; capture p95/query plans/locks.

## Delivery and sign-off

- [ ] Publish temporal/overlap/allowance policy, entitlement result schema, reminder schedule, permissions and correction runbook.
- [ ] CI gates date/property/concurrency tests, RLS/scope, cross-feature E2E, portal/mobile/web accessibility and contract drift.
- [ ] Production test-tenant rehearsal covers amendment, allowance, lapse/reminder and audited god override.
- [ ] Attach reconciliation, email, LambdaTest/Sentry and QA sign-off; Sprint 21 is blocked until complete.
