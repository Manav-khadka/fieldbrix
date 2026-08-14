# Sprint 21 — Invoices, Credit Notes, and Manual Status

Source: [Sprint plan](../sprintplans/sprint-21-invoicing.md) · Prerequisite: Sprint 20 QA sign-off; reporting/SMTP Sprint 16 signed off · Status: `NOT STARTED` · Target: 64 points

## Outcome and financial invariants

Accounts users create and issue immutable invoices, record manually maintained statuses, issue bounded credit notes, generate PDF/email delivery and expose safe portal views. No payment collection, gateway, reconciliation, dunning or automated SaaS billing. All money is integer minor units; tax/rounding/currency rules are explicit and frozen at issue.

## API contracts

| Method | Path | Permission/scope | Contract highlights |
|---|---|---|---|
| GET/POST | `/invoices` | `billing.invoices.view/create` + scope | list or draft with source/task/contract/idempotency |
| GET/PATCH | `/invoices/:id` | `billing.invoices.view/edit` + scope | edit draft only; optimistic revision |
| POST | `/invoices/:id/issue` | `billing.invoices.issue` | revision/idempotency → immutable number/snapshot |
| POST | `/invoices/:id/status-transitions` | `billing.invoices.status` | manual target/effective date/reference/reason/idempotency |
| POST | `/invoices/:id/credit-notes` | `billing.credit-notes.create` | lines/reason/revision/idempotency |
| GET | `/credit-notes/:id` | `billing.credit-notes.view` + scope | immutable note/status/PDF |
| POST | `/invoices/:id/pdf` | `billing.invoices.send` | idempotent PDF job |
| POST | `/invoices/:id/email` | `billing.invoices.send` | recipients/template/idempotency |
| GET | `/portal/invoices` | Portal scoped | customer/site-authorized issued invoices/credits |
| GET | `/portal/invoices/:id/download` | Portal scoped | short-lived authorized download intent |

## Implementation checklist

- [ ] Model draft/issued invoice, lines/tax totals, per-tenant numbering sequence, immutable issue snapshot, manual status history, credit note/lines and delivery attempts.
- [ ] Define currency, inclusive/exclusive tax, line/document rounding, discount policy and display rules; calculate only server-side in minor units.
- [ ] Allocate invoice number and freeze snapshot atomically at issue; idempotent replay returns same number. Gaps are recorded, never reused.
- [ ] Add DB protection preventing update/delete of issued invoice and credit-note financial fields; corrections use credit note/new invoice.
- [ ] Limit cumulative credited quantity/amount to issued balance under transaction lock; no negative or cross-currency credit.
- [ ] Manual statuses require permission, effective date, reference/reason and audit; never imply verified payment receipt.
- [ ] Build Accounts draft/preview/issue/status/credit/history/delivery UI and portal list/detail/download.
- [ ] Generate immutable invoice/credit PDFs from frozen snapshot and send through tenant-aware SMTP without silent fallback.


## Dependency and Sentry implementation

- Reuse approved tables/forms/date utilities and lazy React PDF; invoice generation/calculation remains server-side and payment/premium financial widgets remain out of scope.
- Trace calculation/number allocation/issue/PDF/email operations and page on immutability or duplicate-number breaches; scrub invoice lines, money/customer/recipient data and document URLs.

## Code-principle gate

- [ ] SRP: calculation, numbering, invoice lifecycle, credit control, PDF/delivery and portal projection remain separate.
- [ ] OCP: tax/rounding/document render policies extend typed strategies without rewriting issue orchestration.
- [ ] LSP/ISP/DIP: number store, renderer and mail adapters satisfy focused contracts; billing domain imports no provider SDK.
- [ ] DRY/KISS/YAGNI: one minor-unit calculation/immutability policy is authoritative; gateways/reconciliation/dunning are not scaffolded.
- [ ] Fail Fast: currency/tax/line/revision/credit/scope checks complete before number allocation, issue, credit or send side effects.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `invoice_created/issued/status_changed`, `credit_note_issued`, `invoice_pdf/email_*`, `number_allocation_conflict`; safe IDs/minor-unit totals/currency, no customer details |
| Audit | draft diffs, issued snapshot hash/number/totals, manual status evidence, credits, PDF/email result and god context |
| Sentry | calculation/number allocation/issue/PDF/email spans; page on immutability or duplicate-number breach; expected validation is metrics |
| Metrics/alerts | issue latency/failure, number allocation retries/gaps, total/credited amounts by currency, PDF/email failure; alert on duplicate number, over-credit, immutable-write attempt |

## Test, integration, and LambdaTest checklist

- [ ] Exhaustive unit/property tests cover tax/rounding/discount/currency boundaries, totals and credit balance.
- [ ] Concurrency-test invoice numbering and credit issuance at target load; unique monotonic allocation and bounded credit.
- [ ] DB/API tests attempt issued mutation/delete, number reuse, stale issue, negative/over credit, duplicate send and cross-tenant access.
- [ ] Reconcile invoices/credits/PDF displayed totals against independent expected fixtures and source approved task/contract.
- [ ] E2E approved task/contract → draft → issue → PDF/email → manual status → credit → portal visibility.
- [ ] Verify portal/site/contact scope, staff dynamic roles/dashboard, god corrective access/audit and no payment UI/API semantics.
- [ ] LambdaTest Accounts/portal: Chrome/Edge/Firefox/Safari plus mobile web; print/PDF/download, locale/currency, keyboard/WCAG and duplicate-submit checks.
- [ ] LambdaTest native: portal is web; workforce app N/A unless invoice link is exposed, assessment signed.
- [ ] Load list/report/number allocation/PDF queue and record query/lock/render budgets.

## Delivery and sign-off

- [ ] Publish calculation/rounding examples, numbering/status/credit policies, immutable schema, tax configuration ownership and correction runbook.
- [ ] CI gates financial property/concurrency/immutability, PDF golden/text extraction, SMTP/portal E2E, RLS/security/accessibility.
- [ ] Production test-tenant rehearsal issues/credits a test invoice, reconciles PDF/portal/audit and forces delivery retry.
- [ ] Finance/Product, QA and Security sign evidence; attach LambdaTest/Sentry/reconciliation. Sprint 22 is blocked until complete.
