# Sprint 13 — Full Mobile Execution and Evidence

**Goal:** Enable real configurable field work with location, targets, evidence, and validation.

**Prerequisite:** Sprint 12 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan execution, GPS, target, evidence, and validation tests | QA/Mobile | 3 | Sprint 12 sign-off |
| Implement check-in/out, radius exceptions, scans, searches, and mismatches | Mobile/Backend | 13 | Sprint 12 sign-off |
| Implement dynamic sections, rules, autosave, pause, and completion validation | Mobile | 13 | Sprints 8 and 12 sign-offs |
| Implement photographs, files, parts, registration requests, and metadata | Mobile/Backend | 8 | Storage and master data |
| Test all fields and error states | QA | 5 | Implementations complete |
| Integration-test runtime, GPS, targets, parts, storage, and tasks | QA | 5 | Implementations complete |
| Regression-test offline skeleton and assignments | QA | 3 | Functional tests complete |
| Test accessibility, low data, storage, GPS, and device performance | QA | 3 | Execution complete |
| Correct execution defects and re-test | Mobile+QA | 8 | Test findings |
| Mobile-execution QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- React catalog additions are `N/A`; mobile camera/location/evidence packages must pass stable-version, advisory, device and storage-pressure checks.
- Flutter Sentry captures native/systemic execution failures and scrubbed outcome codes only—never answers, evidence paths, coordinates or customer/site details.

## Acceptance criteria

### Functional

- Workers check in/out, identify or register targets, execute dynamic workflows section by section, capture required evidence and parts, pause/resume, and receive direct links to invalid fields.
- Workers review complaint, target/recent history, access/parking/working-hour/safety instructions and reference attachments; they can navigate/contact, accept, report unable or request reassignment.
- GPS records time, accuracy/confidence and site distance. Outside radius, unavailable location and late arrival follow explicit reason/arrival-proof/review policy without collecting continuous MVP location.
- Target match continues, another target at the same site warns/selects per policy, another-site target blocks, unreadable code allows controlled manual search, and unregistered target creates an approval request rather than a live record.
- Assistants may add permitted evidence, but only the responsible worker/team lead can finally submit.
- Parts capture quantity/unit, optional ad-hoc identity and old-part-returned status; evidence records camera/gallery/file source, checksum, capture time/location, count/category/note and server validation.

### Test coverage required for sign-off

- Every field/property type, safety rule, GPS failure/late/radius exception, same-site/other-site/manual/unregistered scan path, task reference attachment, old-part return, assistant/lead rule, storage warning, image/file policy, pause/restart, sensitive-field masking and unauthorized-task path passes.
