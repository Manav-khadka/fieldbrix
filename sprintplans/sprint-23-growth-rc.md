# Sprint 23 — Multi-Site SLA and White-Label Portal

**Goal:** Support larger customers across sites while preserving branding and access boundaries.

**Prerequisite:** Sprint 22 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan multi-site, SLA, branding, and release-candidate tests | QA | 3 | Sprint 22 sign-off |
| Implement site/contact scopes, SLA clocks, breaches, and rollups | Backend | 13 | Contracts, tasks, and portal |
| Build dashboards, histories, SLA reports, drill-downs, and exports | Web | 13 | Reporting APIs |
| Implement themes, logos, terminology, email branding, and domains | Web/Backend/DevOps | 8 | Portal and SMTP |
| Test navigation, SLA results, branding, and contact access | QA | 5 | Implementations complete |
| Integration-test portal–contracts–tasks–invoices–tracking | QA | 5 | Implementations complete |
| Regression-test dashboards, PDFs, SMTP, RBAC, and god mode | QA | 3 | Functional tests complete |
| Test scale, timezones, accessibility, and branding injection | Security/QA | 3 | Release candidate |
| Correct release-candidate defects and re-test | Dev+QA | 8 | Test findings |
| Growth candidate QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity  
**Milestone:** Growth release candidate

## Dependency and Sentry gate

- Reuse approved charts, branding tools, tables and portal adapters; the RC contains no tenant-specific library forks or paid/premium UI package.
- Trace SLA/report/portal/domain behavior with tenant-safe cache context and page on cross-tenant branding/scope or clock corruption.

## Acceptance criteria

### Functional

- Large customers access authorized sites, assets, contracts, visits, invoices, and SLA rollups through a tenant-branded portal.
- Super Admin can directly access every tenant/site regardless of customer or workforce scopes, subject to god-mode session controls.

### Test coverage required for sign-off

- Contact/site scoping, timezone SLA calculations, large rollups, exports, responsive browsers, accessibility, branding safety, customer isolation, SMTP branding, and audited god-mode access pass.
