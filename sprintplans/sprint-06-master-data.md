# Sprint 6 — Master Records and Spreadsheet Imports

**Goal:** Make customer, site, target, and parts data reliable enough to drive field work.

**Prerequisite:** Sprint 5 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Plan CRUD, hierarchy, duplicate, scan, and import tests | QA | 3 | Sprint 5 sign-off |
| Implement customers, sites, service targets, parts, histories, and QR identities | Backend | 13 | Sprint 5 sign-off |
| Implement user/customer/site/target/parts templates, previews, validation, duplicate/update rules, and row results | Backend | 13 | Master-record APIs |
| Build administration, filtering, history, import, and rejected-row screens | Web | 8 | APIs available |
| Test CRUD, optional targets, search, scans, and imports | QA | 5 | Implementations complete |
| Integration-test records with permissions, god mode, terminology, and audit | QA | 5 | Implementations complete |
| Regression-test company settings and user/team scopes | QA | 3 | Functional tests complete |
| Test large files, spreadsheet injection, duplicates, and tenant isolation | Security/QA | 3 | Imports complete |
| Correct master-data/import defects and re-test | Dev+QA | 8 | Test findings |
| Master-data QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Own TanStack Table/Virtual, dnd-kit, Dropzone, QR/ZXing, exact-pinned `react-data-grid@7.0.0-beta.61` and official checksum-reviewed SheetJS `0.20.3`; the grid beta is isolated and excluded from automatic updates.
- Test React 19/Vite 8, keyboard/screen-reader/200%-zoom/large-preview behavior plus spreadsheet injection and bounded parsing; Sentry captures systemic import failures, never row values or files.

## Acceptance criteria

### Functional

- Authorized admins and Super Admin manage customers, sites, optional targets, and parts manually or by validated spreadsheet.
- Records cover the DOCX identity/contact/address/instruction/GPS/geofence/equipment/warranty/condition/evidence/history fields while companies may hide irrelevant target fields without creating custom master modules.
- Import preview separates valid, warning, and rejected rows and provides downloadable correction output.
- User, customer, site, target and parts imports record source checksum, importer, mapping/update mode, row provenance and result summary; task import remains Sprint 11.

### Test coverage required for sign-off

- Optional targets, dependent filtered lookups, QR identities, soft archive/history, case-insensitive codes, fuzzy search, duplicate/update behavior, partial success, unsafe spreadsheets, permissions, god mode, composite tenant foreign keys and RLS isolation pass.
