# Sprint 14 — Offline Sync and Conflict Hardening

Source: [Sprint plan](../sprintplans/sprint-14-offline-sync.md) · Prerequisite: Sprint 13 QA sign-off · Status: `NOT STARTED` · Target: 64 points

## Outcome and protocol invariants

No accepted field work is lost or duplicated across flaky connectivity, restarts, clock skew, partial media, concurrent dispatch changes or replay. Server time/order is authoritative; mutation identity remains device-generated and immutable; completion becomes committed only when all required records and evidence checksums are accepted atomically.

## Sync and conflict contracts

| Method | Path | Contract highlights |
|---|---|---|
| POST | `/sync/mutations` | ordered batch `{mutationId,sequence,entity,operation,baseRevision,payloadHash,clientTime}`; per-item APPLIED/REPLAYED/RETRY/CONFLICT/REJECTED |
| GET | `/sync/changes` | opaque cursor, bounded page, ordered upserts/tombstones/serverTime/new cursor; cursor advances transactionally |
| POST | `/sync/reconcile` | local entity revisions/hashes → authoritative actions without full payload leakage |
| POST | `/evidence/:id/parts` | content-range/part checksum/idempotency → resumable upload part |
| POST | `/evidence/:id/finalize` | manifest/checksum/idempotency → verified object or typed mismatch |
| POST | `/mobile/task-runs/:id/commit` | final run/evidence manifest/base task revision/idempotency → committed or explicit conflict |

Conflict policy: server cancellation/reassignment blocks new execution; already-captured unsynced work is quarantined and reviewable, not deleted. Commutative field updates may merge only under documented rules; safety, assignment, status, evidence and completion conflicts require server decision or supervisor review.

## Implementation checklist

- [ ] Specify protocol versions, ordering, maximum batch/page, response codes, retryability and backward-compatible client support window.
- [ ] Serialize outbox writer; preserve per-run dependencies; independently retry unrelated entities without reordering dependent mutations.
- [ ] Store server receipts and replay cached results; mutation ID + payload hash mismatch is a security/domain error.
- [ ] Apply downloaded page and cursor in one local transaction; handle tombstones without deleting unsynced dependent evidence.
- [ ] Implement conflict records with local/server revisions, reason code, user-safe remediation and support correlation.
- [ ] Implement multipart/resumable media state/checksums, signed URL renewal, orphan cleanup and finalize-before-run-commit.
- [ ] On constrained networks upload compressed previews/smallest acceptable evidence first while retaining and eventually verifying the policy-required original; ordering never lets a preview satisfy an original-proof requirement.
- [ ] Implement atomic server completion transaction and post-commit receipt; UI remains pending until receipt is persisted locally.
- [ ] Reconcile server time offset, never order by device wall clock, and show trustworthy last-sync/outbox state.
- [ ] Add corruption detection, encrypted export for authorized support and storage-pressure policy that never evicts unsynced work.

## Dependency and Sentry implementation

- Mark React catalog additions `N/A`; database/connectivity/HTTP/sync upgrades run migration, replay, restart, corruption, storage-full, battery and full-day offline contract suites.
- Connect distributed device→API→DB/S3 spans with bounded encrypted offline events. Attach only consented scrubbed diagnostics; queued mutations, answers, evidence and coordinates are prohibited.

## Code-principle gate

- [ ] SRP: outbox ordering, delta apply, conflict resolution, media transfer, reconciliation and run commit remain separate components.
- [ ] OCP: mutation/entity/conflict handlers extend typed registries without changing protocol orchestration.
- [ ] LSP/ISP/DIP: transport/storage/clock/network implementations obey focused ports and deterministic shared protocol tests.
- [ ] DRY/KISS/YAGNI: one protocol/status/conflict catalogue is authoritative; no speculative distributed merge engine is introduced.
- [ ] Fail Fast: version/hash/order/base-revision/auth checks reject before application; required media finalizes before atomic completion.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `sync_batch_started/completed`, `mutation_applied/replayed/conflict/rejected`, `cursor_advanced`, `media_part/finalize`, `run_commit`; safe IDs/hash prefix/status/duration only |
| Audit | accepted domain mutations and conflict decisions; rejected/replay receipts remain operational/security records; completion receipt is immutable |
| Sentry | distributed spans device → API → DB/S3; fingerprint protocol/corruption failures; attach bounded scrubbed sync diagnostics only with consent |
| Metrics/alerts | outbox age/depth, apply/replay/conflict/reject, cursor lag, media retry/finalize, false-completion invariant, crash/ANR; page on data-loss/hash/atomicity breach |

## Chaos, integration, and LambdaTest checklist

- [ ] Replay identical mutation/batch 10x and concurrently; one side effect/audit/event and stable receipt.
- [ ] Partition network before request, mid-body, after server commit/before response and during cursor apply; restart at every point.
- [ ] Complete offline while dispatcher cancels/reassigns/edits; verify documented quarantine/conflict and no silent overwrite.
- [ ] Test ±5 minutes and one-day clock skew, DST, duplicate device sequence, expired auth/presigned URL and server deploy during sync.
- [ ] Test storage full, DB corruption simulation, app upgrade/local migration, checksum mismatch, missing media part, orphan cleanup and 1GB evidence queue policy.
- [ ] Reconcile answers, GPS events, image/file/signature metadata and final submission after app process kill and device restart at every outbox/media state.
- [ ] Soak one simulated full workday with repeated connectivity changes; reconcile local/server entity counts, hashes, audit and receipts.
- [ ] LambdaTest real-device network shaping: airplane mode, 2G/high latency/packet loss, background kill/relaunch and OS storage pressure on Android/iPhone matrix.
- [ ] Appium asserts UI never displays synced/completed prematurely; collect device/API traces under one correlation family.
- [ ] Load concurrent device batches per tenant and across tenants; prove fairness/rate limit and p95 budget.

## Delivery and sign-off

- [ ] Publish protocol/conflict matrix, compatibility policy, sequence diagrams, reconciliation query and incident/data-recovery runbook.
- [ ] CI gates deterministic chaos suite, property/replay/concurrency tests, migration upgrade, emulator journeys and nightly real-device soak.
- [ ] Run production test-tenant offline rehearsal and automated reconciliation; inject one failure and verify alerts/Sentry/runbook.
- [ ] Attach chaos report, receipts/hashes, LambdaTest build, Sentry trace and QA/Security sign-off; Sprint 15 is blocked until complete.
