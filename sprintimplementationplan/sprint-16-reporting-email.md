# Sprint 16 — Reporting, PDFs, and Tenant-Aware SMTP

Source: [Sprint plan](../sprintplans/sprint-16-reporting-email.md) · Prerequisite: Sprint 15 QA sign-off; administration Sprint 05 signed off · Status: `NOT STARTED` · Target: 64 points

## Outcome and failure policy

Approved work produces permission-aware dashboards, histories, exports, branded immutable service-report PDFs and reliable email. Platform Super Admin manages a global SMTP profile and optional tenant profiles; tenant profile overrides global. Saved credentials are encrypted and write-only. A failing tenant profile fails closed, retries and alerts—it never silently changes sender identity.

## API contracts

| Method | Path | Permission/scope | Contract highlights |
|---|---|---|---|
| GET | `/reports/task-summary` | `reports.tasks.view` + scope | filter/timezone/grouping; paginated/aggregate reconciliation |
| GET | `/reports/operations` | `reports.operations.view` + scope | dashboard metrics with freshness metadata |
| POST | `/exports` | resource `.export` + scope | report/filter/format/idempotency → async job |
| GET | `/exports/:id` | matching export access | state/expiry/download intent; not raw presigned URL in logs |
| POST | `/service-reports` | `reports.service.create` | approved task/revision/template/idempotency → PDF job |
| GET | `/service-reports/:id` | `reports.service.view` + scope | status/version/hash/download intent |
| GET/PUT | `/platform/smtp-profile` | Platform SMTP manage | non-secret fields; secret accepted but never returned |
| GET/PUT | `/company/smtp-profile` | `company.smtp.view/configure` | tenant override; write-only encrypted password |
| POST | `/smtp-profiles/:scope/verify` | matching configure permission | connection check/idempotency, sanitized result |
| POST | `/smtp-profiles/:scope/test-email` | matching configure permission | approved recipient/idempotency → attempt |
| POST | `/service-reports/:id/email` | `reports.service.send` | recipient/template/idempotency → delivery attempt |

## Implementation checklist

- [ ] Define metric formulas/timezone/filter/scope semantics and reconciliation queries against source records before UI.
- [ ] Operations dashboard implements work-today status counts, exceptions, people/capacity, service quality and upcoming/due/missed recurring measures with documented freshness.
- [ ] Report registry includes daily completion; open/unassigned/overdue; worker/team productivity; on-time arrival/completion; result/rejection; exception/decision; parts; confirmation; target history; finding category; recurring; and follow-up/repeat reports.
- [ ] Every report supports the applicable date/branch/customer/site/workflow/work-type/worker/team/result/status filters and spreadsheet export through one permission/scope query contract.
- [ ] Build reports/exports with deterministic snapshots, row caps, CSV injection prevention, async generation and expiring access.
- [ ] PDF Lambda validates job schema/version, reads an approved immutable snapshot, renders branded HTML with bundled fonts, writes encrypted PDF/checksum and records attempt.
- [ ] Customer PDF snapshot includes logo/contact/footer, task/customer/site/target, complaint, findings/diagnosis, work/parts, selected measurements/final result, before/after evidence, follow-up, worker/reviewer, confirmation status and check-in/completion time; sensitive/supervisor-only fields are excluded by policy.
- [ ] Add global/tenant SMTP profiles with host/port/TLS/from fields, AES-256-GCM credential envelope/key version, verification state and write-only DTOs.
- [ ] Resolve sender once per attempt: active verified tenant profile else global only when no tenant profile exists. Misconfigured/failing tenant override cannot fall back.
- [ ] Implement delivery attempt state, queue retry/backoff, provider response sanitization, terminal failure alert and administrator-visible diagnostics.
- [ ] Build dashboards/filter/export/report history, PDF preview/download and global/tenant SMTP configure/verify/test UI.
- [ ] Apply permissions/scopes to query and export—not just widgets; god mode may configure any tenant under explicit context.

## Dependency and Sentry implementation

- Lazy-load approved `react-pdf`; use Recharts for standard charts and Nivo only with documented need. Add accessible data tables/summaries, sanitizer tests for Tiptap templates and bundle budgets.
- Trace React report/API queries and PDF/SMTP jobs end-to-end; capture systemic renderer/provider failures with scrubbed responses and never send report contents, recipient data or attachment URLs.

## Code-principle gate

- [ ] SRP: metric queries, export snapshots, PDF rendering, SMTP profile resolution, delivery/retry and UI presentation remain separate.
- [ ] OCP: report formats, PDF templates and mail transports extend registries/adapters without rewriting orchestration.
- [ ] LSP/ISP/DIP: local/test/production PDF, storage and SMTP adapters pass focused contract suites; domains own ports.
- [ ] DRY/KISS/YAGNI: one metric/sender-resolution rule is authoritative; SMS/WhatsApp/payment delivery is not added.
- [ ] Fail Fast: scope/filter/snapshot/profile/TLS/recipient validation precedes generation or delivery; tenant-profile failure never falls back.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `report_queried/export_*`, `pdf_job_*`, `smtp_profile_saved/verified`, `email_queued/sent/retry/failed`; recipient masked, credentials/content/presigned URLs excluded |
| Audit | report/export request, SMTP non-secret diff and secret-rotation fact, god context, email sender/recipient masked and delivery result |
| Sentry | React report and API query spans; PDF/SMTP queue distributed traces; capture renderer/systemic SMTP failures with scrubbed provider response |
| Metrics/alerts | dashboard/query/export/PDF latency/failure, queue age/DLQ, email success/retry/failure by profile scope, secret decrypt failure; page on DLQ/fail-closed breach |

## Test, integration, and LambdaTest checklist

- [ ] Unit-test metric formulas, timezones/scopes, export escaping, PDF input/render hash, SMTP resolution and retry state machine.
- [ ] Reconcile dashboards/exports/PDF against seeded source records and independent SQL expected totals.
- [ ] Independently reconcile every named report/filter and assert API, dashboard, spreadsheet and PDF use the same metric/scope definitions.
- [ ] Endpoint tests cover invalid filters, forbidden export, stale report, unsafe filename/formula, wrong SMTP TLS/credentials and secret non-return.
- [ ] E2E approve task → PDF job → storage → tenant-branded download → tenant SMTP email → delivery record.
- [ ] Prove failed tenant profile queues/alerts and never calls global sender; prove global used only when no tenant profile exists.
- [ ] Test secret key rotation, logs/Sentry redaction, duplicate send idempotency, queue replay, renderer timeout/font/large evidence and email header injection.
- [ ] LambdaTest web: dashboards/tables/export/PDF/SMTP forms across browsers, print/download, responsive/keyboard/WCAG and visual branding checks.
- [ ] LambdaTest mobile: open/download service report from app shell where linked; otherwise signed N/A assessment for unchanged journey.
- [ ] Load largest report/export/PDF volume; enforce async timeout/memory and query budgets.

## Delivery and sign-off

- [ ] Publish metric dictionary, PDF template/version policy, SMTP resolution/fail-closed diagram, secret rotation, queue redrive and delivery support runbooks.
- [ ] CI gates formula/reconciliation, PDF golden/text extraction, SMTP fake-server integration, API/web E2E, security/accessibility and Lambda packaging scan.
- [ ] Production test-tenant smoke uses controlled SMTP recipients, validates PDF hash/branding and forces one retry/alert.
- [ ] Attach reconciliation, PDF/email attempts, LambdaTest/Sentry/CloudWatch evidence and QA sign-off; Sprint 17 is blocked until complete.
