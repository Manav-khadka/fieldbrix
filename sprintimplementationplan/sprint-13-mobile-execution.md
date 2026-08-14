# Sprint 13 — Full Mobile Execution and Evidence

Source: [Sprint plan](../sprintplans/sprint-13-mobile-execution.md) · Prerequisite: Sprint 12 QA sign-off; rule engine Sprint 08 signed off · Status: `NOT STARTED` · Target: 64 points

## Outcome and data model

Workers execute pinned dynamic workflows offline, check in/out, scan/select targets and parts, autosave answers, obey safety rules and capture required evidence. Add task runs, section/field responses, location events/exceptions, evidence manifests, part usage and registration requests. Binary evidence is stored separately; local/server metadata carries checksum, capture time, device and workflow-version linkage.

## API contracts

| Method | Path | Permission/scope | Contract highlights |
|---|---|---|---|
| POST | `/mobile/tasks/:id/check-in` | `tasks.execute` own | coordinates/accuracy/method/exception/idempotency |
| POST | `/mobile/tasks/:id/check-out` | `tasks.execute` own | coordinates/time/idempotency |
| POST | `/mobile/task-runs` | `tasks.execute` own | task/version/device/idempotency → run |
| PATCH | `/mobile/task-runs/:runId/responses` | `tasks.execute` own | response mutations/base revision/idempotency |
| POST | `/mobile/task-runs/:runId/validate` | `tasks.execute` own | normalized outcomes, missing proof, safety result |
| POST | `/mobile/task-runs/:runId/complete` | `tasks.execute` own | final manifest/version/idempotency; atomic validation |
| POST | `/evidence/upload-intents` | `evidence.create` own | run/field/MIME/size/checksum/idempotency |
| POST | `/evidence/:id/complete` | `evidence.create` own | object checksum/metadata/idempotency |
| POST | `/part-usage` | `tasks.execute` own | run/part/quantity/idempotency |
| POST | `/registration-requests` | `master.targets.request` | captured target data/evidence/idempotency |

## Implementation checklist

- [ ] Render every foundational/advanced field through registry keyed by snapshot schema version; unknown types block completion safely.
- [ ] Run shared conditional evaluator after relevant local answer changes and again authoritatively at server validation/completion.
- [ ] Persist answers/autosave, rule outcomes, evidence manifest and outbox operations atomically; survive process kill at every screen.
- [ ] Implement GPS accuracy/radius policy, timeout, permission denial, mock-location signal, authorized exception reason and server verification.
- [ ] Record late arrival and outside-radius/unavailable GPS using explicit exception reason/optional arrival proof; show accuracy/confidence and never collect continuous task tracking in MVP.
- [ ] Implement QR/barcode scan and offline search: match continues; different target same site warns/selects per policy; another-site target blocks/notifies; unreadable code permits controlled manual fallback; unregistered target creates approval request.
- [ ] Capture photo/file metadata, strip disallowed EXIF where policy requires, validate MIME/size/checksum, compress without destroying required quality.
- [ ] Show task reference attachments, complaint, latest service summary and access/parking/hours/safety instructions; expose navigate/contact, unable-to-attend and reassignment-request actions through Sprint 10 APIs.
- [ ] Queue evidence before completion; show local/uploaded/failed state and storage estimate; never claim completion while required proof is pending.
- [ ] Implement parts and unknown-target registration without bypassing permissions/master-data approval.
- [ ] Parts record quantity/unit, catalogue or ad-hoc snapshot and old-part-returned. Assistants can add permitted evidence; only responsible worker/lead completes/submits.
- [ ] Ensure pause/restart and section navigation retain data, focus, scroll and error summary; safety stop is prominent and non-bypassable.

## Dependency and Sentry implementation

- Mark React catalog additions `N/A`; camera/location/image/evidence package changes pass stable-version, advisory, supported-OS, low-memory, permission and storage-pressure gates.
- Add scrubbed screen/evaluator/database/upload spans and native crash/OOM capture using field type/outcome code only; answers, evidence paths, coordinates and customer/site data never leave the device in events.

## Code-principle gate

- [ ] SRP: field rendering, rule evaluation, location, scanning, evidence, parts and run completion remain separate features/use cases.
- [ ] OCP: field/evidence/capture types extend registries/strategies without modifying stable execution orchestration.
- [ ] LSP/ISP/DIP: camera/location/file/upload implementations satisfy focused ports and shared contracts; domain/UI do not depend on plugins directly.
- [ ] DRY/KISS/YAGNI: pinned schema/evaluator definitions drive all layers; unsupported/deferred capture intelligence is not added.
- [ ] Fail Fast: permission/version/target/rule/evidence/storage checks run before unsafe capture, upload or completion side effects.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Device/API logs | `check_in/out`, `task_run_started/paused/validated/completed`, `target_scan/mismatch`, `evidence_capture/upload_*`, `safety_stop`; coordinates/answers/files excluded from operational logs |
| Audit | accepted server mutations for location exception, responses, evidence references, parts, safety outcomes and completion; immutable workflow version |
| Sentry | screen/evaluator/database/upload spans and breadcrumbs using field type/outcome code only; native crashes/OOM; scrub evidence paths, coordinates and answers |
| Metrics/alerts | check-in exception, validation failure, autosave latency, evidence size/upload failure, completion failure, crash/ANR, GPS/storage state; page on evidence loss or safety bypass |

## Test, integration, and LambdaTest checklist

- [ ] Unit/widget/golden matrix covers every field type, rule action, calculation, repeatable group, required/evidence state and validation summary.
- [ ] Contract fixtures prove preview/backend/mobile rule equivalence for the pinned workflow version.
- [ ] E2E check-in → target scan → all field types → parts/evidence → pause/restart → validate → complete and server history.
- [ ] Test GPS denied/timeout/inaccurate/outside/mock, invalid/mismatched scan, missing part, storage low/full, corrupt/oversized/wrong-MIME evidence and failed upload.
- [ ] Test late arrival, same-site/other-site/unreadable/unregistered target, reference attachment, old-part return, assistant/lead, sensitive-field masking and unable/reassignment-request paths.
- [ ] Test task cancelled/reassigned/version unavailable while offline; app preserves evidence and prevents false completion.
- [ ] LambdaTest devices: low-memory Android 10, current Samsung/Pixel and iPhone; camera, GPS/geolocation, files, rotation, background/foreground, slow/zero network and battery monitoring.
- [ ] Appium journeys cover happy path plus permission denial and safety stop; native accessibility scan and screen-reader/large-text verification.
- [ ] Performance: 200-field/repeatable workflow, 50 evidence items and full-day autosave; document memory, frame, storage, battery and upload budgets.

## Delivery and sign-off

- [ ] Update OpenAPI/models, local migrations, field-render registry, evidence contract, location/privacy policy and lost-evidence recovery runbook.
- [ ] CI gates cross-runtime fixtures, mobile unit/widget/golden/emulator, API E2E, upload security, accessibility and performance regression.
- [ ] Signed builds execute in production test tenant; correlate device/API/worker telemetry and verify evidence integrity after download.
- [ ] Attach LambdaTest builds/videos, Sentry release, evidence checksums, safety test report and QA sign-off; Sprint 14 is blocked until complete.
