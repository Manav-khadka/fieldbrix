# Sprint 8 — Advanced Fields and Conditional Rules

**Goal:** Enforce dynamic evidence, outcome, and safety behavior consistently across web and mobile.

**Prerequisite:** Sprint 7 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Design rule truth-table and safety test suite | QA | 3 | Sprint 7 sign-off |
| Implement condition operators, actions, precedence, and outcome evaluation | Backend | 13 | Sprint 7 sign-off |
| Implement advanced fields, repeatable groups, calculations, scans, and evidence | Backend/Web | 13 | Workflow foundation |
| Build rule editor, cycle warnings, branch preview, and explanations | Web | 8 | Rule APIs |
| Test every operator, action, severity, and hidden-field behavior | QA | 5 | Implementations complete |
| Integration-test identical results across preview, API, and runtime contracts | QA | 5 | Implementations complete |
| Regression-test workflow CRUD and lookups | QA | 3 | Functional tests complete |
| Test circular rules, safety bypass, unreachable branches, and scale | Security/QA | 3 | Rule engine complete |
| Correct rule defects and repeat truth-table tests | Dev+QA | 8 | Test findings |
| Rule-engine QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Reuse the Sprint 07 builder/schema adapters without a second rules framework; upgrades must preserve cross-runtime truth tables and accessible non-graph editing.
- Tag only engine/schema versions, rule counts and outcome codes; answers, evidence and hidden/supervisor-only values never enter Sentry.

## Acceptance criteria

### Functional

- Conditions control field/section visibility, required state, evidence, messages, outcomes, supervisor review, follow-ups, and submission blocking.
- Every field supports the applicable identity, required/optional/read-only/hidden/default/worker-edit, validation, logic, evidence capture/count/reason/time/location, report/dashboard/export/exception inclusion and sensitive/supervisor-only properties.
- The documented text, number/calculation, choice, date/time, GPS, image/file and scan/selection operators and all actions—including enable/disable, fixed default, note/photo/signature proof, supervisor alert/review and follow-up recommendation—are represented by typed registries.
- Safety stop overrides every less-severe outcome and cannot be bypassed by a client.

### Test coverage required for sign-off

- Every documented operator/action and field property, report/privacy masking, conflict precedence, hidden-required field, circular dependency, unreachable section, large rule set, backend/web/mobile equivalence and safety-stop path passes.
