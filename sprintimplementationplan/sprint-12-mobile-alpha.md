# Sprint 12 — Mobile Foundation and Offline Walking Skeleton

Source: [Sprint plan](../sprintplans/sprint-12-mobile-alpha.md) · Prerequisite: Sprint 11 QA sign-off · Status: `NOT STARTED` · Target: 64 points · Milestone: Internal alpha

## Outcome and mobile architecture

A workforce user signs in, sees capability-filtered assigned tasks, downloads one, accepts/starts minimal work offline, restarts the app, reconnects and synchronizes with truthful states. Use Flutter Clean Architecture per feature, Riverpod, go_router, Dio, encrypted Drift/SQLCipher and PowerSync-compatible boundaries. Server APIs remain authoritative.

## API and sync contracts

| Method | Path | Permission/scope | Contract highlights |
|---|---|---|---|
| GET | `/mobile/bootstrap` | Authenticated | profile/capabilities/config/server time/sync checkpoint |
| GET | `/mobile/tasks` | `tasks.view` own/team | delta/page of assigned task summaries and pinned schemas |
| GET | `/mobile/tasks/:id` | `tasks.view` scope | complete offline package/version/checksum |
| POST | `/mobile/tasks/:id/accept` | `tasks.accept` own | device-created idempotency, revision/client time |
| POST | `/mobile/duty-events` | `duty.record` own | START/END, event time/location/accuracy/policy/idempotency; no continuous tracking |
| GET | `/mobile/task-history` | `tasks.history.view` own | worker completed and supervisor-returned tasks, paginated |
| POST | `/sync/mutations` | Authenticated device | ordered batch with mutation IDs/base revisions |
| GET | `/sync/changes` | Authenticated device | cursor/limit → ordered deltas/tombstones/new cursor |

Local tables include server entities, sync cursor, outbox mutation with immutable payload/idempotency/order, conflict record, app configuration and secure session metadata. UI states: local-only, pending, syncing, synced, retryable error, conflict—never “synced” before server acknowledgement.

## Implementation checklist

- [ ] Establish feature/data/domain/presentation folders, Riverpod dependency graph, typed router guards, theme/localization and generated OpenAPI models.
- [ ] Encrypt SQLite with per-installation key in Keychain/Keystore; define schema migrations, logout wipe and corrupted-key recovery.
- [ ] Implement Dio auth refresh mutex, correlation header, envelope/error decoding, retry only for network/transient failures and safe structured debug logging.
- [ ] Implement bootstrap and local-first repositories; views observe Drift, not raw network futures.
- [ ] Persist mutation and domain change atomically before attempting network; preserve device-created UUID-v4 across retries/restart.
- [ ] Implement ordered upload/download, cursor transaction, backoff/jitter, connectivity triggers, manual retry and clear sync diagnostics.
- [ ] Build login, home, duty state, search/task list/detail, accept/minimal execution and sync-state UI from capabilities.
- [ ] Implement Today/Upcoming/Urgent/Overdue/Completed/Sync Pending filters; search task ID/customer/site/target; display offline availability, complaint, access/safety instructions and recent service summary.
- [ ] Record Start/End Duty only when policy requires it, with visible location status/accuracy and audit; explicitly prohibit continuous background tracking in the MVP client.
- [ ] Handle reassignment/deactivation/token expiry while offline with conservative access and reconciliation message.

## Dependency and Sentry implementation

- Mark React catalog additions `N/A`; resolve Flutter dependencies from pub.dev as a compatible stable, non-discontinued/advisory-free set, commit `pubspec.lock` and attach analyze/widget/emulator/real-device evidence.
- Initialize latest-compatible `sentry_flutter` for `fieldbrixxx/flutter` before `runApp`; configure release/dist/environment, bounded offline cache, navigation/HTTP/database/sync spans, scrubber and CI symbol upload. Screenshots and raw payloads are disabled.

## Code-principle gate

- [ ] SRP: presentation, Riverpod state, domain use cases, local repositories, HTTP client and sync engine remain separated per feature.
- [ ] OCP: routes/sync handlers and local entity mappings extend registries without rewriting the mobile shell.
- [ ] LSP/ISP/DIP: local/remote repositories implement focused domain interfaces and pass shared behavior tests; UI never depends on Dio/Drift directly.
- [ ] DRY/KISS/YAGNI: OpenAPI-generated models and one sync-state model are authoritative; full execution/evidence is not prematurely implemented.
- [ ] Fail Fast: incompatible schema/session/capability/storage checks block unsafe execution while preserving local queued work.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Device logs | Structured ring buffer: app/device model/OS/version/correlation/mutation/entity/status/duration; no tokens, PII, full payloads or database keys; opt-in support export |
| API logs/audit | `mobile_bootstrap`, `sync_batch_received/applied/rejected`, `task_accepted/duty_changed`; audit mutations after server acceptance with device/session metadata |
| Sentry | Flutter init before app, release/dist/environment, navigation/error/performance, native symbols/debug files; offline caching enabled; scrub events/breadcrumbs; no screenshot attachments by default |
| Metrics/alerts | bootstrap/task package/sync latency, outbox depth/age, rejection/conflict, crash-free sessions, ANR/startup; alert on sync failure spike or incompatible client |

## Test, integration, and LambdaTest checklist

- [ ] Unit-test providers/repositories/envelope mapping/backoff/cursor/outbox/idempotency and secure-session transitions.
- [ ] Widget/golden tests cover loading/empty/error/offline/pending/synced/conflict/expired/account-disabled states at small and large text.
- [ ] Android emulator and iOS simulator E2E: login → bootstrap → download task → disconnect → accept/start → kill/restart → reconnect → one server mutation.
- [ ] E2E covers duty start/end, every task filter/search, completed/returned history, permission-denied duty/location and no background GPS after duty event completion.
- [ ] Test network partition mid-request, replay 10x, stale assignment, token expiry, DB migration, corrupt cache, storage low/full and server clock offset.
- [ ] Verify capability navigation and API rejection independently; tenant A data is unavailable after switching/logout/user deactivation.
- [ ] LambdaTest real devices: Android 10 with 2GB-class profile, current Samsung/Pixel, current iPhone; portrait/landscape, slow network, airplane mode, restart and secure storage.
- [ ] Run Appium critical path, native accessibility scan, manual screen-reader spot check, camera/location permission baseline and device-log review.
- [ ] Performance budgets: cold/warm start, task list scroll, database query, sync batch memory/battery/network; capture device metrics.

## Delivery and alpha sign-off

- [ ] CI requires `flutter analyze`, unit/widget/golden, generated-model drift, Android integration on every PR and iOS simulator on protected-branch/nightly policy.
- [ ] Publish local schema, sync protocol/state diagram, supported OS/device matrix, privacy/log policy and support recovery runbook.
- [ ] Produce signed internal APK/IPA with immutable release, Sentry symbols, SBOM and controlled distribution.
- [ ] Run production test-tenant alpha without customer data and verify server/device logs share correlation IDs.
- [ ] Attach CI, LambdaTest device builds/videos, Sentry release/crash-free baseline, sync reconciliation and QA/Product alpha sign-off.
