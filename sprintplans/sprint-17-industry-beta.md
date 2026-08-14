# Sprint 17 — Industry Templates and Beta Qualification

**Goal:** Prove the configurable core supports every documented sector and four pilot patterns.

**Prerequisite:** Sprint 16 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Convert templates into executable acceptance scenarios | QA/Product | 3 | Sprint 16 sign-off |
| Build three complete HVAC workflows | Product/Backend/Web | 13 | Workflow sign-off |
| Build nine additional starter workflows | Product/Web | 13 | Workflow sign-off |
| Build realistic four-sector fixtures and terminology packs | QA/Product | 8 | Templates available |
| Functionally execute every template branch | QA | 5 | Templates complete |
| Run cross-sector create–execute–review–report integrations | QA | 5 | Implementations complete |
| Regression-test shared core behavior | QA | 3 | Functional tests complete |
| Test low-end execution, accessibility, scale, and safety | QA | 3 | Integration tests complete |
| Correct template/core defects and re-test | Dev+QA | 8 | Test findings |
| MVP beta QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity  
**Milestone:** MVP beta-ready

## Dependency and Sentry gate

- Re-run the dependency, deprecation, advisory, license and SBOM audit across web/backend/mobile; prove every sector uses the same approved adapters with no template-specific package forks.
- Qualification runs produce zero new unhandled Sentry issues and tag only template/version identifiers, never fixture answers.

## Acceptance criteria

### Functional

- Three complete HVAC templates and nine documented starter-sector templates run without sector-specific code changes.
- The starter catalogue explicitly covers Facility Management, Home Appliance, ISP/Fiber, Electrical, Plumbing, Pest Control, Medical Equipment, Commercial Cleaning and Water Purifier; HVAC covers breakdown, preventive maintenance and installation/commissioning.
- Terminology, targets, conditions, evidence, results, review, and reports adapt through configuration.

### Test coverage required for sign-off

- Complete E2E pilot suites pass for HVAC, Facility Management, Appliance/Water Purifier, and Cleaning/Pest Control patterns.
- Every documented template condition/safety branch, field/evidence expectation and report is exercised; low-end mobile performance and shared-core regression pass.
