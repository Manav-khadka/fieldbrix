# Sprint 06 — Master Records and Spreadsheet Imports

Source: [Sprint plan](../sprintplans/sprint-06-master-data.md) · Prerequisite: Sprint 05 QA sign-off · Status: `NOT STARTED` · Target: 64 points

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

- [ ] Create repositories/services/DTOs and tenant-prefixed indexes; use normalized search columns without losing original values.
- [ ] Define hierarchy and archive rules: a parent with active dependents cannot hard-delete; references and history survive archive.
- [ ] Generate non-guessable QR payloads with version/checksum; never encode tenant/customer PII directly.
- [ ] Parse CSV/XLSX in isolated worker with size/row/formula limits, server-side MIME detection and spreadsheet-injection neutralization.
- [ ] Preview validates headers/types/references/duplicates and returns stable row numbers/codes; commit uses the exact preview revision.
- [ ] Support import types `users`, `customers`, `sites`, `service_targets`, `parts`; integrate user-row provisioning/invitation with Sprint 05 rather than duplicating identity logic. Task imports remain Sprint 11.
- [ ] Implement the DOCX record fields for customer contact/address/instructions; site address/GPS/geofence/access/parking/hours/safety; target equipment/location/warranty/coverage/condition/next due/evidence; and parts compatibility/unit/active state.
- [ ] Define duplicate modes (`reject`, `skip`, `update`) and permitted update fields; execute rows idempotently and expose partial success.
- [ ] Build web CRUD/history/search/filter/QR/import mapping-preview-results screens with accessible large-table behavior.
- [ ] Emit entity events for future workflows/tasks without coupling modules to infrastructure.

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

- [ ] Unit-test normalization, hierarchy, QR checksum, duplicate modes, mapping, row validation and formula neutralization to ≥80%.
- [ ] Endpoint integration covers valid CRUD/import plus invalid parent, archived reference, duplicate, wrong scope, unsafe file and cross-tenant ID.
- [ ] E2E create customer → site → optional target → search/scan → history; import preview → commit → results → retry without duplicates.
- [ ] Test empty/large/Unicode/RTL spreadsheets, missing headers, mixed dates, leading zeros, formulas, macros, zip bombs, duplicate rows and partial failures.
- [ ] Verify permissions/god mode/terminology/audit across every screen and export; test owner/team/branch/all data scopes.
- [ ] Verify UUIDv7 IDs, composite tenant FKs, soft archive/history, case-insensitive codes, trigram search and same-tenant dependent lookup constraints directly at DB and API layers.
- [ ] LambdaTest web: CRUD, filters, virtual table, mapping, error download and drag/drop upload on browser matrix and responsive tablet; accessibility scan.
- [ ] LambdaTest mobile: QR camera permission granted/denied, valid/invalid/mismatched code and offline cached lookup shell on Android/iPhone real devices.
- [ ] Load-test 100k records and maximum approved import size; capture query plans, memory ceiling and time budget.

## Delivery and sign-off

- [ ] Publish import template versions, column dictionaries, error catalogue, QR format, retention and recovery runbooks.
- [ ] CI gates parser fuzz/security tests, migrations, RLS, contract/client drift, browser/device tests and performance threshold.
- [ ] Production smoke uses synthetic records/file only and cleans them through an audited archive path.
- [ ] Attach import reports, query plans, Sentry trace, alerts, LambdaTest runs and QA sign-off; Sprint 07 remains blocked until sign-off.
