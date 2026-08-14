# Sprint 21 — Invoices, Credit Notes, and Manual Status

**Goal:** Let Accounts issue immutable invoices without payment-gateway integration.

**Prerequisite:** Sprint 20 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan numbering, tax, immutability, status, and email tests | QA | 3 | Sprint 20 sign-off |
| Implement invoice, line, tax, numbering, and issue lifecycle | Backend | 13 | Contracts and approved tasks |
| Build Accounts UI, manual statuses, credit notes, and portal views | Backend/Web | 13 | Invoice model |
| Implement invoice PDFs, SMTP delivery, history, and retry | Backend/Python | 8 | SMTP platform |
| Test draft, issue, status, credit note, PDF, and portal visibility | QA | 5 | Implementations complete |
| Integration-test task–contract–invoice–SMTP–portal flow | QA | 5 | Implementations complete |
| Regression-test reports, permissions, and histories | QA | 3 | Functional tests complete |
| Test numbering concurrency, immutability, rounding, and isolation | Security/QA | 3 | Invoicing complete |
| Correct invoice defects and re-test calculations | Dev+QA | 8 | Test findings |
| Invoicing QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Reuse approved React PDF, tables, forms and date utilities; invoice generation remains server-side and no payment/premium financial widget is introduced.
- Trace calculation/number/issue/PDF/email operations and page on immutability/duplicate-number breach without invoice, tax, customer or recipient contents.

## Acceptance criteria

### Functional

- Accounts issues branded invoices, records manual status, and corrects issued invoices only through credit notes.
- Invoice PDFs use the selected tenant SMTP profile and are visible to authorized portal users.
- Super Admin has unrestricted corrective access, with every god-mode change recorded.

### Test coverage required for sign-off

- Concurrent numbering, tax rounding, duplicate sends, failed email, immutable issue state, credit-note limits, manual statuses, portal isolation, god-mode audit, and export reconciliation pass.
