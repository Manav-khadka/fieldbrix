# Sprint 22 — Visit Tracking, Ratings, and Escalations

Source: [Sprint plan](../sprintplans/sprint-22-tracking-feedback.md) · Prerequisite: Sprint 21 QA sign-off; portal/mobile/review signed off · Status: `NOT STARTED` · Target: 64 points

## Outcome and privacy model

Customers can view an active visit through an expiring, unguessable link or authenticated history and submit post-service feedback. Tracking is task-bound, time-limited, consent/policy controlled and retained only for the approved period. It must never expose off-duty or another visit’s location. Ratings/escalations create accountable queues and email notifications.

## API contracts

| Method | Path | Access/permission | Contract highlights |
|---|---|---|---|
| POST | `/mobile/tasks/:id/tracking-sessions` | `tasks.track` own | consent/state/idempotency → session policy |
| POST | `/mobile/tracking-sessions/:id/locations` | active device/session | bounded batch/time/accuracy/idempotency |
| POST | `/mobile/tracking-sessions/:id/stop` | active device/session | reason/idempotency |
| POST | `/tracking-links` | `tracking.links.create` + scope | task/expiry/idempotency → opaque link |
| GET | `/public/tracking/:token` | Expiring token/rate-limited | minimal visit/ETA/location freshness; no envelope secrets |
| GET | `/portal/visits/:id/tracking` | Portal scoped | authenticated active/history-safe view |
| POST | `/portal/visits/:id/feedback` | Portal scoped | rating/comment/category/idempotency |
| GET/PATCH | `/feedback-escalations[/:id]` | `feedback.escalations.view/manage` + scope | queue/assign/resolve/reason/revision |

## Implementation checklist

- [ ] Model tracking session, consent/policy, location samples, derived public state/ETA, opaque token hash/expiry/revocation, feedback and escalation history.
- [ ] Start only for assigned active visit; stop automatically on checkout/cancel/timeout/duty end; reject location outside active session.
- [ ] Minimize frequency/precision and retain raw samples per policy; public response exposes only approved precision and freshness.
- [ ] Generate high-entropy single-purpose tokens, store hashes, rate limit, revoke/reissue and prevent token leakage in URL logs/referrers/analytics.
- [ ] Ingest batches idempotently, tolerate offline/stale/out-of-order samples and mark stale rather than presenting false live data.
- [ ] Put map/ETA provider behind adapter; distinguish provider estimate from guaranteed arrival and handle quota/outage.
- [ ] Build responsive tracking view and authenticated visit history; no worker contact/identity beyond approved display.
- [ ] Allow one feedback submission per visit policy; low rating/category creates escalation/assignment and tenant SMTP notification idempotently.

## Dependency and Sentry implementation

- Isolate MapLibre GL/react-map-gl behind the visit-map adapter for consented task-bound tracking. Prohibit paid map SDKs, route optimization, traffic recommendations, nearest-tech selection and off-duty tracking.
- Trace mobile ingestion/map/portal/escalation with scrubbed URLs/referrers/location and bounded retention. Expected expired tracking tokens remain metrics, not issues.

## Code-principle gate

- [ ] SRP: tracking lifecycle, ingestion, public projection/token, ETA provider, retention, feedback and escalation remain separate.
- [ ] OCP: map/ETA and escalation handlers extend adapters/policies without altering privacy-critical session logic.
- [ ] LSP/ISP/DIP: map, clock, location and notification providers pass focused contracts; tracking domain owns ports.
- [ ] DRY/KISS/YAGNI: one consent/precision/retention policy drives all surfaces; continuous/off-duty tracking is not built.
- [ ] Fail Fast: assignment/session/consent/token/freshness/scope checks precede ingestion or disclosure.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `tracking_started/stopped`, `location_batch_ingested/rejected`, `tracking_link_created/expired/accessed`, `feedback_created/escalated/resolved`; no token/coordinates/comment |
| Audit | tracking policy/session transitions, link issuance/revocation, feedback/escalation decisions and god access; raw reads follow privacy policy |
| Sentry | mobile ingestion/map/portal/escalation traces; scrub URLs/referrer/location; expected expired tokens are metrics, not issues |
| Metrics/alerts | active sessions, ingestion lag/drop, stale state, token probes/429, provider latency/quota, battery/network, feedback/escalation age; page on off-duty leak/isolation breach |

## Test, integration, and LambdaTest checklist

- [ ] Unit/property tests cover session lifecycle, token entropy/hash/expiry, sample ordering/freshness, retention and escalation rules.
- [ ] Attempt guessed/replayed/expired/revoked tokens, alternate task/customer/tenant, referrer/log leakage and access after checkout.
- [ ] E2E mobile tracking → public/portal view → stale/offline/reconnect → checkout/expiry → feedback → escalation/email/resolution.
- [ ] Test consent denied, GPS unavailable/mock, no samples, out-of-order batch, task cancel/reassign, provider outage/quota and DST/timezone display.
- [ ] Retention job deletes/anonymizes raw samples as specified while preserving minimal audit; deletion is tenant-safe and observable.
- [ ] LambdaTest web: tracking/portal/escalation in browser/mobile-web matrix, geolocation states, responsive map, keyboard/WCAG and privacy headers.
- [ ] LambdaTest mobile: real Android/iPhone foreground/background/location permissions, moving geolocation, offline batch, battery observation and auto-stop.
- [ ] Load location ingestion and public polling across tenants; prove rate/fairness, p95 and cost budget.

## Delivery and sign-off

- [ ] Publish tracking consent/precision/retention/token policy, provider adapter/SLA, escalation rules and privacy-incident/runbook.
- [ ] CI gates lifecycle/token/security/retention tests, mobile/web E2E, accessibility, provider mocks and load threshold.
- [ ] Production test visit proves automatic stop/expiry, redaction, feedback escalation and deletion job.
- [ ] Attach privacy/security report, LambdaTest battery/device results, Sentry/alerts and QA sign-off; Sprint 23 is blocked until complete.
