# Sprint 09 — Workflow Governance and Templates

Source: [Sprint plan](../sprintplans/sprint-09-workflow-governance.md) · Prerequisite: Sprint 08 QA sign-off · Status: `IN PROGRESS` · Target: 64 points

## Outcome and immutable model

Admins govern DRAFT → PUBLISHED → ARCHIVED workflow lifecycles, duplicate templates and inspect history without mutating active/historical tasks. A published version is an immutable snapshot containing schema, fields, rules, registry versions, reporting settings and content hash. New tasks resolve the current published version once and remain pinned.

## API contracts

| Method | Path | Permission | Contract highlights |
|---|---|---|---|
| GET | `/workflows/:id/versions` | `workflows.view` | ordered versions and change summaries |
| POST | `/workflows/:id/publish` | `workflows.publish` | draft revision, notes, idempotency → immutable version |
| POST | `/workflows/:id/duplicate` | `workflows.create` | source/version/name/idempotency → independent draft |
| POST | `/workflows/:id/archive` | `workflows.archive` | reason/idempotency; preserves versions/tasks |
| GET | `/workflow-versions/:versionId` | `workflows.view` | immutable snapshot and hash |
| GET | `/platform/workflow-templates` | authorized tenant/platform | catalogue filtered by applicability |
| POST | `/platform/workflow-templates/:id/instantiate` | `workflows.create` | tenant-local copy; no future linkage |
| POST/PATCH | `/platform/workflow-templates[/:id]` | Platform template manage | versioned platform template; god/platform only |

## Implementation checklist

- [x] Add immutable version tables/content hash and DB guards preventing update/delete of published snapshots. (Verified: `workflow_versions`, SHA-256 content hash, immutable trigger, and migration execution.)
- [x] Publish in one transaction: validate, lock draft/revision, materialize normalized snapshot, increment version, set current pointer, audit/outbox. (Verified end-to-end after a fix: the transaction/lock/snapshot/pointer/outbox logic in `WorkflowGovernanceRepository.publish` was correctly designed, but `POST /workflows/:id/publish` 500'd on every real call — the snapshot parameter was cast to both `::bytea` (for the content hash) and `::jsonb` in the same statement using the same placeholder, and Postgres unifies one inferred type per positional parameter, so `cannot cast type bytea to jsonb` fired every time. Fixed by binding the JSON text as two separate parameters. Confirmed via `test/workflow-lifecycle.e2e-spec.ts` (real Postgres, full HTTP path) — a prior "verified by reading the code" pass had missed this because it was never exercised against a live database.)
- [x] Reject concurrent/stale/double publish deterministically; idempotent replay returns original version. (Verified: the `FOR UPDATE ... AND revision = $3` predicate returns zero rows — and thus `STALE_WORKFLOW_REVISION` — on any concurrent/stale/double publish attempt; the controller wraps the call in `IdempotencyService.getOrCreateAsync` like every other mutation in this codebase, so a replayed idempotency key returns the cached original response.)
- [x] Make archive block new assignment while preserving view/report execution of pinned versions. (Verified — fixed during this review: `TaskRepository.create` now joins `workflow_versions` to `workflow_drafts` and rejects `WORKFLOW_ARCHIVED` when the version's source workflow has been archived, while `workflow_versions` rows themselves are never touched by archive, so a task already pinned to that version keeps rendering. Covered by `test/workflow-lifecycle.e2e-spec.ts`.)
- [x] Duplicate produces new IDs and rewrites every internal reference/rule; never shares mutable children. (Verified — fixed during this review: `WorkflowDraftService.duplicate` previously copied only `name`/`description` into an empty draft, silently dropping the schema; now deep-copies `sections`/`fields`/`rules` with fresh UUIDs and rewritten `field.sectionId` references. Covered by a unit test (`workflow-draft.service.duplicate.spec.ts`) and an HTTP-level e2e test confirming the duplicated draft actually contains the copied section/field. Separately, `POST /workflows/:id/archive` — not `/duplicate` — had a second, dead route registered on `WorkflowDraftController` colliding with the real handler on `WorkflowGovernanceController`; removed, see the note below.)
- [x] `GET /workflow-versions/:versionId` and `GET /workflows/:id/versions` (Verified — fixed during this review: both queries selected a `created_at` column that does not exist on `workflow_versions` — the table only has `published_at` — so both endpoints 500'd on every call. `getVersion`/`versions` now select only real columns; `published_at` is the correct, sole creation timestamp for an immutable version. Confirmed via `test/workflow-lifecycle.e2e-spec.ts`.)
- [ ] Build catalogue/version timeline/diff/publish/archive/template UI with impact summary and accessible confirmation. Partial: `routes/workflows/{list,builder,versions}.tsx` exist and the builder has a working publish button; there is no version diff view, no archive UI, no template catalogue/instantiate UI, and no confirmation-dialog pattern for destructive actions.
- [ ] Define platform template ownership and god-mode behavior separately from tenant role grants. Not started: only `GET /platform/workflow-templates` (list) and `POST .../:id/instantiate` exist; the contract's `POST/PATCH /platform/workflow-templates[/:id]` authoring endpoints (god/platform-only template management) are not implemented, and `workflow_templates` has no seed data. Fixed a P0 in the existing list endpoint during this review: it selected a `field_count` column that doesn't exist on `workflow_templates` and silently swallowed the resulting error with `.catch(() => [])`, so the catalogue always returned an empty array while masking the real defect. Now derives the field count from `jsonb_array_length(schema->'fields')` and no longer hides errors; confirmed working (empty catalogue, no error) via a direct service call and `test/workflow-lifecycle.e2e-spec.ts`.
- [x] Add task-version foreign-key contract and resolver service for Sprint 10. (Verified: task creation validates published version ownership and the task/workflow-version FK is declared in the security migration.)

## Dependency and Sentry implementation

- Pin renderer/editor dependency hashes in publish/release evidence and prove an upgrade cannot mutate published snapshots or historical task rendering.
- Trace publish/diff/render operations; create immediate issues for immutability/hash failure and treat stale conflicts as expected metrics with no draft contents attached.

## Code-principle gate

- [ ] SRP: lifecycle policy, snapshot builder/hash, version resolver, duplication mapper and template catalogue remain separate.
- [ ] OCP: new snapshot/template versions extend versioned serializers/migrators without mutating published representations.
- [ ] LSP/ISP/DIP: tenant/platform template sources and version stores obey focused contracts; governance domain owns ports.
- [ ] DRY/KISS/YAGNI: one lifecycle/version resolver is authoritative; approval workflow not required by scope is not invented.
- [ ] Fail Fast: revision, validity, authorization and hash checks complete before atomic publish/archive/duplicate mutations.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `workflow_publish_started/completed/conflict`, `workflow_archived/duplicated`, `template_instantiated`, `snapshot_hash_mismatch` |
| Audit | lifecycle transitions, publish notes/hash/version, archive reason, template source and complete immutable change evidence |
| Sentry | publish transaction/diff/render spans; immediate issue for immutability/hash failure; expected stale conflicts are metrics |
| Metrics/alerts | publish latency/failure/conflict, active versions, template use, hash verification; page on attempted snapshot mutation/hash mismatch |

## Test, integration, and LambdaTest checklist

- [ ] Unit-test lifecycle graph, deep-copy reference rewrite, snapshot normalization/hash, version resolver and archive rules.
- [ ] Concurrency-test two publishers, replayed key, stale revision, failed transaction and sequence allocation.
- [ ] DB tests attempt direct snapshot update/delete; constraints/triggers reject it and audit alert fires.
- [ ] E2E create/rules → publish v1 → create draft changes → publish v2 → verify pinned fixture task remains v1 → archive.
- [ ] Template tests cover tenant copy isolation, platform permissions, god mode, deleted source and rule behavior after copy.
- [ ] LambdaTest web: version diff, publish, catalogue, duplicate/archive across browser matrix; keyboard confirmation and WCAG scan.
- [ ] LambdaTest mobile: shared snapshot renderer fixture on Android/iOS; no full task UI, assessment signed.
- [ ] Benchmark publish/diff for maximum workflow and record transaction locks/query plans.

## Delivery and sign-off

- [ ] Publish lifecycle/versioning ADR, snapshot JSON schema, hash algorithm, task pinning contract and recovery procedure.
- [ ] CI gates immutability DB tests, publish concurrency, cross-runtime snapshot fixtures, web E2E and security matrix.
- [ ] Production test-tenant smoke publishes two versions and proves archived/history access under tenant role and god mode.
- [ ] Attach hashes, audit, Sentry/LambdaTest evidence and QA sign-off; Sprint 10 is blocked until complete.
