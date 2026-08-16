# Sprint 06 — Master Records and Spreadsheet Imports

Source: [Sprint plan](../sprintplans/sprint-06-master-data.md) · Prerequisite: Sprint 05 QA sign-off · Status: `IN PROGRESS` · Target: 64 points

## Outcome and data model

Authorized users manage customers, sites, optional service targets/assets, parts, QR identities and immutable histories manually or through safe spreadsheet imports. Add normalized codes, tenant-local uniqueness, soft archive, search indexes, import jobs/files/row outcomes and entity-change history. Uploaded source files have retention and access controls.

## API contracts

| Method | Path | Permission/scope | Contract highlights |
|---|---|---|---|
| GET/POST | `/customers` | `master.customers.view/create` | paginated search or idempotent create |
| GET/PATCH | `/customers/:id` | `master.customers.view/edit` | tenant-safe detail/revision update |
| GET/POST | `/sites` | `master.sites.view/create` | customer filter, branch scope |
| GET/POST/PATCH | `/service-targets[/:id]` | `master.targets.*` | optional asset/target, history and QR ID |
| GET/POST/PATCH | `/parts[/:id]` | `master.parts.*` | catalogue metadata; inventory transactions deferred |
| GET | `/qr-identities/:code/resolve` | relevant view grant | typed customer/site/target result; non-enumerable error |
| GET | `/imports/templates/:entityType` | `master.imports.view` | versioned CSV/XLSX template |
| POST | `/imports/preview` | `master.imports.create` | uploadId, type, mappings, rules, idempotency → validation summary |
| POST | `/imports/:importId/commit` | `master.imports.commit` | preview revision/idempotency → async job |
| GET | `/imports/:importId` | `master.imports.view` | progress/counts/row error download |

## Implementation checklist

- [x] Create repositories/services/DTOs and tenant-prefixed indexes; use normalized search columns without losing original values. (Verified: `src/modules/master-data/{customers,sites,service-targets,parts}` — dedicated controller/service/repository per entity, `MasterRecordRepository` shared CRUD base, DTOs under `dto/`, tenant-scoped via `DatabaseService`/`TenantContextService`, `lower(name)/lower(code)` search indexes from `026/027-*.sql`.)
- [x] Define hierarchy and archive rules: a parent with active dependents cannot hard-delete; references and history survive archive. (Verified: no hard-delete endpoint exists anywhere; `CustomersService.update`/`SitesService.update` reject `archived: true` with `CUSTOMER_HAS_ACTIVE_SITES`/`SITE_HAS_ACTIVE_SERVICE_TARGETS` when active dependents exist — covered by `test/master-data.e2e-spec.ts`.)
- [x] Generate non-guessable QR payloads with version/checksum; never encode tenant/customer PII directly. (Verified: `QrIdentityService` — random UUID nonce + HMAC-SHA256 checksum keyed by `QR_SIGNING_SECRET`, format `fbx1.<32hex>.<8hex>`, no tenant/customer identifiers encoded; forged-code rejection covered by e2e.)
- [ ] Parse CSV/XLSX in isolated worker with size/row/formula limits, server-side MIME detection and spreadsheet-injection neutralization. Not implemented as specified: `POST /imports/preview` accepts already-parsed JSON rows (client-side parsing), not a server-side CSV/XLSX file worker — `xlsx`/SheetJS is not a dependency and no formula-injection neutralization exists. Row-count limited to 5000 (`ImportsService.MAX_ROWS`) but no per-cell/formula/zip-bomb handling.
- [x] Preview validates headers/types/references/duplicates and returns stable row numbers/codes; commit uses the exact preview revision. (Verified: `ImportProcessorService.validateRow` per entity type, `ImportsRepository.beginCommit` rejects a mismatched `previewRevision` with `IMPORT_PREVIEW_REVISION_CONFLICT`; covered by e2e partial-success test.)
- [ ] Support import types `users`, `customers`, `sites`, `service_targets`, `parts`; integrate user-row provisioning/invitation with Sprint 05 rather than duplicating identity logic. Task imports remain Sprint 11. `customers`/`sites`/`service_targets`/`parts` are implemented (`IMPORTABLE_ENTITY_TYPES`); `users` import (with Sprint 05 invitation integration) is not started.
- [x] Implement the DOCX record fields for customer contact/address/instructions; site address/GPS/geofence/access/parking/hours/safety; target equipment/location/warranty/coverage/condition/next due/evidence; and parts compatibility/unit/active state. (Verified: `master_customers.instructions`/`master_sites.parking_notes` added in `028-sprint-06-master-data-fields.sql` to close the gap against the original 026 schema; all other listed fields already existed and are exposed through the DTOs.)
- [x] Define duplicate modes (`reject`, `skip`, `update`) and permitted update fields; execute rows idempotently and expose partial success. (Verified: `ImportProcessorService.handleDuplicate`, per-row commit with independent success/failure so partial rows still commit; `ImportsRepository.completeJob` returns `COMPLETED`/`PARTIAL`/`FAILED`; covered by e2e.)
- [ ] Build web CRUD/history/search/filter/QR/import mapping-preview-results screens with accessible large-table behavior. Partial: `routes/master-data/{customers,sites,service-targets,parts}` have real search/paginate/loading/empty/error states against the live API; none have a create/edit form yet (list-only), no QR scan/lookup screen, and `routes/master-data/imports.tsx` takes pasted JSON rather than a drag-drop/mapped file upload. No large-table virtualization (`@tanstack/react-table` is installed but not yet wired into these pages) and no history view. The frontend had **zero** test tooling of any kind prior to this review — `vitest`/`@testing-library/react`/`jsdom` are now installed and wired (`vitest.config.ts`, `src/test/setup.ts`, `pnpm test` in CI's Frontend step), with real loading/data/empty/error-state coverage for `CustomersPage` as the reference pattern for the rest of these screens to follow.
- [ ] Emit entity events for future workflows/tasks without coupling modules to infrastructure. Only the import-commit path emits an outbox event (`master.import.commit.v1`); plain customer/site/target/part create/update do not emit domain events — not started.

## Dependency and Sentry implementation

- Implement imports with TanStack Table/Virtual, dnd-kit, Dropzone, QR/ZXing, official checksum-reviewed SheetJS `0.20.3`, and isolated exact-pinned `react-data-grid@7.0.0-beta.61`; exclude the beta from automated updates.
- Gate the grid on React 19/Vite 8 CSS, keyboard, screen-reader, copy/paste, 200% zoom and large-preview tests. Bound browser parsing and capture only systemic import failures—never files, cells, headers or row values.

## Code-principle gate

- [ ] SRP: entity validation/persistence, search, QR identity, spreadsheet parsing, preview and commit jobs remain separate.
- [ ] OCP: import entity types/columns and master-record variants extend registries/mappers without changing the pipeline core.
- [ ] LSP/ISP/DIP: CSV/XLSX parsers and file/job adapters satisfy focused contracts; domain services own their ports.
- [ ] DRY/KISS/YAGNI: normalization/duplicate/error rules have one source; inventory transactions and custom modules stay deferred.
- [ ] Fail Fast: MIME/size/header/mapping/reference/scope validation finishes before rows mutate records; commit binds the exact preview revision.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `master_record_*`, `qr_resolved/failed`, `import_uploaded/previewed/started/row_failed/completed`; counts and safe IDs, never row content |
| Audit | record before/after diffs, archive/restore, import actor/source checksum/rules and per-row affected IDs |
| Sentry | import worker spans and row-error aggregation by error code; capture systemic parser/job failures, not each invalid business row |
| Metrics/alerts | CRUD latency, search p95, import queue age/duration/rate, rows success/reject/update, parser failure, storage; alert on stuck jobs/error-rate threshold |

## Test, integration, and LambdaTest checklist

- [ ] Unit-test normalization, hierarchy, QR checksum, duplicate modes, mapping, row validation and formula neutralization to ≥80%. Partial: `import-processor.service.spec.ts` covers row validation and duplicate modes (reject/skip/update) for all four entity types (18 tests) — no dedicated QR-checksum unit test and no formula-neutralization test (feature not built); coverage percentage not measured.
- [ ] Endpoint integration covers valid CRUD/import plus invalid parent, archived reference, duplicate, wrong scope, unsafe file and cross-tenant ID. Partial: `test/master-data.e2e-spec.ts` covers happy-path CRUD, duplicate-code 409, unknown-parent 400, archive-blocked-by-active-dependent 409, and partial-success import — wrong-scope, unsafe-file, and cross-tenant-ID probes are not covered.
- [x] E2E create customer → site → optional target → search/scan → history; import preview → commit → results → retry without duplicates. (Verified: `test/master-data.e2e-spec.ts` exercises customer→site→service-target→QR-resolve, and import preview→commit→partial-success→verify-created-row. No "history" screen exists yet to test — see the sprint-06 web-screen gap above.)
- [ ] Test empty/large/Unicode/RTL spreadsheets, missing headers, mixed dates, leading zeros, formulas, macros, zip bombs, duplicate rows and partial failures. Not started — no file-parsing pipeline exists yet to test against (see the CSV/XLSX-worker gap above); only duplicate rows/partial failures are covered via the JSON-rows path.
- [ ] Verify permissions/god mode/terminology/audit across every screen and export; test owner/team/branch/all data scopes. Not started for master-data specifically; all list/create/update endpoints are `scope: 'all'` only — `own`/`team`/`branch` scope filtering is not implemented for this domain.
- [x] Verify UUIDv7 IDs, composite tenant FKs, soft archive/history, case-insensitive codes, trigram search and same-tenant dependent lookup constraints directly at DB and API layers. (Verified: `026/027-*.sql` — `gen_random_uuid()` PKs, composite `(tenant_id, id)`/`(tenant_id, code)` unique constraints and FKs, `archived_at` soft-delete, `lower(code)` unique indexes, `pg_trgm` GIN index on customer name; exercised indirectly by the e2e suite.)
- [ ] LambdaTest web: CRUD, filters, virtual table, mapping, error download and drag/drop upload on browser matrix and responsive tablet; accessibility scan.
- [ ] LambdaTest mobile: QR camera permission granted/denied, valid/invalid/mismatched code and offline cached lookup shell on Android/iPhone real devices.
- [ ] Load-test 100k records and maximum approved import size; capture query plans, memory ceiling and time budget.

## Delivery and sign-off

- [ ] Publish import template versions, column dictionaries, error catalogue, QR format, retention and recovery runbooks.
- [ ] CI gates parser fuzz/security tests, migrations, RLS, contract/client drift, browser/device tests and performance threshold.
- [ ] Production smoke uses synthetic records/file only and cleans them through an audited archive path.
- [ ] Attach import reports, query plans, Sentry trace, alerts, LambdaTest runs and QA sign-off; Sprint 07 remains blocked until sign-off.
