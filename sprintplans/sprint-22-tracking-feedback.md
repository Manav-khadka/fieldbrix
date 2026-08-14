# Sprint 22 — Visit Tracking, Ratings, and Escalations

**Goal:** Give customers safe visit-day visibility and a post-service quality channel.

**Prerequisite:** Sprint 21 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan tracking, privacy, feedback, and escalation tests | QA/Security | 3 | Sprint 21 sign-off |
| Implement location sessions, retention, ingestion, and ETA feed | Backend/Mobile | 13 | Mobile and portal foundations |
| Build expiring tracking view and authenticated visit history | Web | 13 | Tracking APIs |
| Implement ratings, escalations, queues, and email notifications | Backend/Web | 8 | Approved tasks |
| Test links, location states, feedback, and escalation | QA | 5 | Implementations complete |
| Integration-test mobile–tracking–task–supervisor flow | QA | 5 | Implementations complete |
| Regression-test GPS evidence, portal isolation, and notifications | QA | 3 | Functional tests complete |
| Test token guessing, expiry, stale data, retention, and battery | Security/QA | 3 | Tracking complete |
| Correct tracking defects and re-test | Dev+QA | 8 | Test findings |
| Tracking QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Own MapLibre GL/react-map-gl for consented task-bound visit tracking only; route optimization, traffic recommendations, nearest-tech selection, paid maps and off-duty tracking remain prohibited.
- Trace ingestion/map/portal/escalation with scrubbed URLs, referrers and location; expected expired tokens are metrics, not issues.

## Acceptance criteria

### Functional

- Customers see only an active visit through an expiring no-login link and authenticated visit history through the portal.
- Customers submit ratings and escalations that enter the appropriate supervisor queue.
- Super Admin can inspect any tracking incident only through a reasoned, audited god session.

### Test coverage required for sign-off

- Link expiry/revocation, token guessing, consent denial, stale/offline location, customer isolation, retention, device battery impact, escalation routing, and god-mode access pass.
