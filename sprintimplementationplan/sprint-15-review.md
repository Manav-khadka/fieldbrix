# Sprint 15 — Customer Signature and Supervisor Review

Source: [Sprint plan](../sprintplans/sprint-15-review.md) · Prerequisite: Sprint 14 QA sign-off · Status: `NOT STARTED` · Target: 64 points

## Outcome and governance model

Workers present a completion summary, capture offline customer signature or refusal/unavailable declaration, check out and submit. Authorized supervisors inspect immutable evidence, approve, reject selected fields for correction, decide exceptions and create linked follow-up tasks. Corrections append revisions; original submissions/signatures are never overwritten.

## API contracts

| Method | Path | Permission/scope | Contract highlights |
|---|---|---|---|
| POST | `/task-runs/:id/customer-confirmation` | `tasks.execute` own | signer display name/declaration/signature evidence or reason/idempotency |
| POST | `/task-runs/:id/submit` | `tasks.execute` own | completion receipt/confirmation/revision/idempotency |
| GET | `/reviews` | `reviews.view` + scope | filters/age/exception/pagination |
| GET | `/reviews/:taskRunId` | `reviews.view` + scope | immutable submission/evidence/audit timeline |
| POST | `/reviews/:id/approve` | `reviews.approve` + scope | decision note/revision/idempotency |
| POST | `/reviews/:id/reject` | `reviews.reject` + scope | selected field IDs/reasons/revision/idempotency |
| POST | `/reviews/:id/exception-decisions` | `reviews.exceptions.decide` | decision/reason/revision/idempotency |
| POST | `/reviews/:id/follow-ups` | `tasks.create` + review scope | workflow/schedule/reason/idempotency → linked task |
| POST | `/task-runs/:id/corrections` | `tasks.correct` own | allowed field revisions/evidence/idempotency |
| GET | `/target-registration-requests` | `master.targets.review` + scope | pending/decided requests with task/site evidence |
| POST | `/target-registration-requests/:id/decision` | `master.targets.review` + scope | approve/create target or reject, reason/revision/idempotency |

## Implementation checklist

- [ ] Store signature stroke/image as encrypted evidence with checksum, signer declaration, capture time/device and exact summary hash shown before signing.
- [ ] Build the exact customer summary from target/area, complaint, findings/work, parts, result and follow-up; worker declaration records information accuracy, safe work area and customer notification before checkout.
- [ ] Support SIGNED, REFUSED and UNAVAILABLE as explicit outcomes with configured mandatory reason; no customer account/OTP.
- [ ] Freeze submission snapshot/hash and transition once; upload/finalize required evidence before submission receipt.
- [ ] Build review queue/detail with safe evidence viewer, outcome/rule explanations, exception flags, comparison and immutable timeline.
- [ ] Rejection lists exact correctable field paths/reasons; safety/system-generated/identity fields cannot be altered unless policy explicitly allows.
- [ ] Corrections create a new `task_runs` submission attempt/revision linked to the immutable rejected run; approval always references the exact reviewed run/revision/hash.
- [ ] Follow-up task creation uses Sprint 10 service/idempotency and reciprocal links without coupling review transaction to notification delivery.
- [ ] Enforce reviewer separation/authority where policy requires and god-mode actions with reason/banner/audit.
- [ ] Require explicit accepted/resolved/dismissed decisions for GPS, customer-confirmation, safety, target-mismatch, validation, final-test and sync exceptions; decide target-registration requests without allowing workers to create master records directly.

## Dependency and Sentry implementation

- Isolate `signature_pad` behind the authorized web fallback and reuse approved review tables/evidence components; server-generated summary/hash and immutable storage remain authoritative.
- Trace submit/review/evidence-view/correction spans and capture hash/immutable-write failures. Rejection is an expected metric/breadcrumb; signature bytes and evidence never enter events.

## Code-principle gate

- [ ] SRP: confirmation/signature, submission snapshot, review decisions, correction revisions and follow-up creation remain separate.
- [ ] OCP: confirmation outcomes/review decision handlers extend typed policies without altering immutable submission logic.
- [ ] LSP/ISP/DIP: signature/evidence and follow-up task ports preserve focused contracts; review domain owns interfaces.
- [ ] DRY/KISS/YAGNI: one review state/correctable-field policy drives API/UI/tests; customer accounts/OTP remain deferred.
- [ ] Fail Fast: summary hash, evidence, authority, revision and decision checks complete before submission/review side effects.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `confirmation_captured`, `submission_created`, `review_opened/approved/rejected`, `correction_submitted`, `follow_up_created`; never signer name/signature/evidence content |
| Audit | summary/signature hashes, confirmation outcome, submission/revision, selected rejection paths, decisions/reasons, reviewer and god context |
| Sentry | submit/review/evidence-view/correction spans; capture hash mismatch/immutable write; expected rejection is metric/breadcrumb |
| Metrics/alerts | confirmation outcomes, submit/review latency, queue age, rejection/correction cycles, follow-ups, evidence-view failure; page on signature/hash or immutable-history failure |

## Test, integration, and LambdaTest checklist

- [ ] Unit-test summary hash/signature linkage, refusal policy, review state matrix, correctable fields, revisions and follow-up creation.
- [ ] Endpoint tests include unsigned/missing reason, stale revision, unauthorized reviewer, changed evidence/hash, duplicate submission/decision and cross-tenant ID.
- [ ] E2E offline execute → summary → sign/refuse → checkout → sync/submit → review → reject selected fields → correct → approve → follow-up.
- [ ] E2E approves/rejects an unregistered-target request and tests each exception category/decision, worker declaration, summary content/hash and physical-revisit linkage.
- [ ] Attempt direct DB/API mutation of submission/signature and approval of unseen/stale revision; reject and alert.
- [ ] Test evidence access expiry, malformed image, large signature, customer name Unicode, worker/reviewer scope and god review.
- [ ] LambdaTest web: review queue/evidence/approve/reject/follow-up across browsers, responsive tablet, keyboard and WCAG scan.
- [ ] LambdaTest mobile: stylus/finger signature, rotate/background/offline/restart, refusal/unavailable, correction and resubmit on Android/iPhone devices; accessibility scan.
- [ ] Performance: evidence-heavy review load, queue filters and PDF-ready snapshot query; capture p95/query plans.

## Delivery and sign-off

- [ ] Publish review state matrix, confirmation legal/product wording source, signature retention/access policy, correction rules and dispute runbook.
- [ ] CI gates hash/immutability/concurrency, API E2E, mobile/web journeys, evidence security and accessibility.
- [ ] Production test-tenant rehearsal covers all confirmation/review outcomes and reconciles audit/evidence hashes.
- [ ] Attach LambdaTest/Sentry evidence, immutable-history test and QA sign-off; Sprint 16 is blocked until complete.
