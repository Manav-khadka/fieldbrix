# Sprint 16 — Reporting, PDFs, and Tenant-Aware SMTP

**Goal:** Turn approved work into dashboards, exports, reports, and reliable email.

**Prerequisite:** Sprint 15 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan dashboard, PDF, SMTP, retry, and permission tests | QA | 3 | Sprint 15 sign-off |
| Implement metrics, filters, histories, reports, and exports | Backend/Web | 13 | Sprint 15 sign-off |
| Implement branded service reports and PDF lifecycle | Backend/Python/Web | 13 | Approved tasks |
| Build global/tenant SMTP configuration, encryption, routing, retry, and alerts | Backend/Web/DevOps | 8 | Sprints 5 and 15 sign-offs |
| Test reports, PDFs, SMTP profiles, and email | QA | 5 | Implementations complete |
| Integration-test approval–PDF–storage–email routing | QA | 5 | Implementations complete |
| Regression-test permissions, terminology, and evidence | QA | 3 | Functional tests complete |
| Test email failure, profile isolation, secret handling, and accessibility | QA/Security | 3 | Reporting complete |
| Correct reporting/SMTP defects and re-test | Dev+QA | 8 | Test findings |
| Reporting QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Own lazy-loaded `react-pdf`, Recharts and only justified Nivo/Tiptap extensions; every visualization has an accessible table/summary and no duplicate chart stack.
- Trace React report/API/PDF/SMTP jobs across boundaries with scrubbed provider responses; report contents, recipient addresses and attachment URLs never enter Sentry.

## Acceptance criteria

### Functional

- Approved work generates branded customer PDFs and reconciled dashboard/report results.
- Dashboards show the complete work-today, exception, people/capacity, service-quality and recurring-work measures from the MVP requirements.
- Reports cover daily completion; open/unassigned/overdue; worker/team productivity; on-time arrival/completion; result/rejection; exceptions and decisions; parts; confirmations; target history; finding category; recurring; and follow-up/repeat visits, filtered by date/branch/customer/site/workflow/work type/worker/team/result/status with spreadsheet export.
- Customer PDFs contain tenant identity/footer, task/customer/site/target, complaint, findings/diagnosis, work/parts, selected measurements/final test, before/after evidence, follow-up, worker/reviewer, confirmation status and check-in/completion times.
- Super Admin configures the global or any tenant SMTP profile without credentials being returned after save.
- Tenant-specific SMTP failure queues retry and raises an alert without silently using the global sender.

### Test coverage required for sign-off

- Every named metric/report/filter/export and PDF content item reconciles to source records; terminology, sensitive/supervisor-only fields, large evidence sets, tenant branding/footer, role/scope/god access, SMTP verification/failure/retry, secret handling and accessibility pass.
