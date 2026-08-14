# Product and Sprint Traceability

This file proves how the approved FieldBrix roadmap covers the product requirements, schema baseline, and engineering standards. It is a coverage map, not a replacement for the detailed sprint files.

## Source precedence and reconciliation

The source set records product decisions made at different times. Apply them in this order when two sources conflict:

1. Explicit product decisions in [the roadmap](README.md), including dynamic roles, Platform Super Admin god mode, signature-only MVP confirmation, Growth scope, SMTP, and the local/production environment model.
2. Product journeys and acceptance behavior in `Configurable_Field_Service_MVP_Requirements.docx`, except where explicitly superseded below.
3. Data integrity and entity relationships in `fieldbrix-schema.sql` and `fieldbrix-schema-readme.md`, evolved by the approved roadmap deltas.
4. Non-negotiable engineering, API, logging, security, testing, and delivery rules in `ENGINEERING_HANDBOOK.md` and `tech_implementation_guide.md`.
5. Dependency candidates, status and sprint ownership in [`../react-libraries.md`](../react-libraries.md); manifests/lockfiles remain authoritative for installed versions.

| Earlier requirement/baseline | Final roadmap decision | Owning sprint(s) |
|---|---|---|
| Fixed tenant roles and `permission_overrides` | Replace with dynamic roles, additive grants, feature/action/scope permissions and ten cloneable presets | 04 |
| OTP/either customer confirmation | Offline signature, unavailable or refusal only; OTP/SMS/WhatsApp deferred | 03, 08, 13, 15, 18 |
| Phone/PIN workforce login options | ID/email and password; secure reset and session/device revocation | 03 |
| Customer portal excluded from original MVP | Remains excluded from paid-pilot MVP; added in Growth | 19, 23–24 |
| Invoicing excluded from original MVP | Remains excluded from paid-pilot MVP; immutable/manual-status invoicing added in Growth | 21, 24 |
| Continuous live tracking excluded | MVP uses event-based duty/check-in/out GPS; Growth adds consented, task-bound, time-limited visit tracking—not off-duty tracking | 12–15, 22 |
| Platform support has no invisible editing | Platform Super Admin later receives explicit god mode with tenant context, reason, re-auth, banner, exhaustive audit and dual approval | 04–05, 18, 24 |
| White-label applications excluded | Native white-label apps remain deferred; Growth adds tenant-branded portal/themes/domains only | 23–24 |
| Email optional/later in original MVP | Configurable global/tenant SMTP is required in Sprint 16; task execution never depends on delivery | 16, 18 |

## Product requirements coverage

| ID | Requirement group from DOCX | Sprint coverage | Exit evidence |
|---|---|---|---|
| PR-01 | One horizontal core, configurable sector terminology and no HVAC hard-coding | 05, 07–09, 17 | Four-sector E2E plus all ten sector packs without core forks |
| PR-02 | Company identity, logo, contact, report footer, branches, working days/hours, terminology and task/evidence policies | 05, 16 | Settings persist across web/mobile/report; one company-wide terminology set |
| PR-03 | Dynamic workforce authorization and immutable god mode | 04–05 | Arbitrary blank role, cloned preset, additive roles, dashboard/action/scope grants and god security matrix |
| PR-04 | Users, invitations, branches, teams, supervisors, skills, leads, assistants and historical deactivation | 03, 05, 10, 13 | Deactivated user denied; team lead alone submits unless assistant permission is granted |
| PR-05 | Customer, site, optional service target and parts/material catalogue with history and soft lifecycle | 06 | Manual/import CRUD, filtered lookup, QR identity and history pass |
| PR-06 | Spreadsheet templates/imports for users, customers, sites, targets, parts and tasks | 05–06, 11 | Preview valid/warning/rejected rows, update mode, rejected-row download and importer audit |
| PR-07 | Single task with customer/site/optional target, workflow, complaint, instructions, schedule/due/duration, priority, assignee/team lead and reference attachments | 10 | Create/edit/detail APIs/UI and immutable history |
| PR-08 | Bulk tasks and recurring plans with daily/weekday/weekly/monthly/custom schedules, look-ahead generation, pause/resume/end and occurrence reschedule | 11 | Duplicate-free timezone test matrix and missed/upcoming views |
| PR-09 | Exact task lifecycle; overdue/escalated/unavailable/safety/sync states remain flags | 10–11, 15 | Full allowed/forbidden transition and flag matrix |
| PR-10 | Reassignment/cancellation reasons, old/new notifications, in-progress evidence retention, worker unable/reassignment request and controlled reopen | 10–11, 15 | State, scope, notification and history tests |
| PR-11 | Workflow identity/settings, sections, preview, draft/publish/version/archive/duplicate and active-task pinning | 07, 09 | Published snapshots immutable; old tasks unchanged |
| PR-12 | Complete MVP field catalogue and per-field identity, behavior, validation, logic, evidence, reporting and privacy properties | 07–08 | Field/property matrix passes in builder, preview, backend and mobile |
| PR-13 | Record-selection lookup filtering by current customer/site/target/task and role scope | 06–08, 13 | Cross-tenant/scope and dependent-filter tests |
| PR-14 | Conditional operators/actions, severity precedence, hidden-required behavior, cycle/unreachable diagnostics and explanations | 08 | Cross-runtime truth table and safety-stop tests |
| PR-15 | Mobile login/bootstrap, Start/End Duty, online/offline/sync states, Today/Upcoming/Urgent/Overdue/Completed/Sync Pending filters and history | 12–14 | Low-end real-device and restart/offline journeys |
| PR-16 | Review/accept, navigation/contact, recent history, unable to attend and reassignment request | 10–13 | Mobile/API journey and supervisor notification evidence |
| PR-17 | GPS check-in/out, late/location exceptions, accuracy/confidence, arrival proof and no continuous MVP tracking | 12–15 | Permission/GPS/offline/privacy tests |
| PR-18 | QR/target match, other-site block, manual fallback and target-registration approval | 06, 13, 15 | Device scan matrix plus admin approval/rejection queue |
| PR-19 | One-section-at-a-time execution, instructions/acknowledgement, autosave, pause/resume, evidence, parts and assistant rules | 13–14 | Full workflow/device/chaos tests |
| PR-20 | Customer summary, offline signature, unavailable/refusal, worker declaration, checkout, completion validation and truthful sync | 13–15 | Immutable summary/signature hash and offline submission receipt |
| PR-21 | Supervisor dashboard/exception queue, evidence review, selective correction, approval and linked follow-up | 11, 15–16 | Reject/resubmit/approve and physical-revisit history |
| PR-22 | Operations dashboards and named reports/filters/exports plus branded service-report content | 16 | Independent metric reconciliation, PDF content and export tests |
| PR-23 | Required in-app notification catalogue for workers, supervisors and administrators | 11, 15–16 | Event-to-recipient catalogue contract and delivery/replay tests |
| PR-24 | Audit, sensitive-field masking, immutable submitted evidence/history and explicit exception acceptance | 02, 04, 08–09, 14–16 | DB privilege, API masking, audit-chain and mutation tests |
| PR-25 | Platform tenant lifecycle, plan/module limits, usage, health, template catalogue and logged support notes | 04–05, 09 | Platform console/god-mode/support audit evidence |
| PR-26 | Three HVAC templates and one starter for each of nine additional sectors | 17 | 12 template manifests and every safety branch executed |
| PR-27 | Offline reliability: no answer/evidence/signature loss, restart recovery, compressed upload, visible states, exact-once sync | 12–14 | Chaos, replay, corruption, storage and real-device soak reports |
| PR-28 | Original MVP critical journeys and launch-blocking quality failures | 17–18 | Paid-pilot release record with zero blockers |
| PR-29 | Four design-partner patterns and pilot success measures | 17–18 | HVAC, facility, appliance/purifier and cleaning/pest rehearsal scorecard |
| PR-30 | Complete company web, worker mobile and platform-admin screen inventory | 05–18 | Route/screen inventory and browser/device evidence |
| PR-31 | Growth portal, contracts/entitlements, invoices/credits, tracking/feedback, multi-site/SLA and portal white-labeling | 19–24 | Growth E2E and GA release record |

### DOCX section audit

| DOCX section | Primary sprint owner(s) |
|---:|---|
| §1 Product scope/principles | 05–18, with boundary enforcement in 18 |
| §2 Users/roles/teams | 04–05, 10, 13; later role decision supersedes fixed roles |
| §3 Terminology | 05, 16–18 |
| §4 Universal records | 06, consumed 10–17 |
| §5 End-to-end journey | 05–18 |
| §6 Onboarding/import | 05–09, user/master imports 05–06 |
| §7 Tasks/recurrence | 10–11 |
| §8 Workflow builder/governance | 07–09 |
| §9 Field catalogue/properties | 07–08, runtime 13 |
| §10 Conditional rules | 08, runtime 13–15 |
| §11 Worker mobile journey | 12–15 |
| §12 Supervisor/dispatcher journey | 10–11, 15–16 |
| §13 Customer confirmation | 15; signature decision supersedes OTP |
| §14 Offline/reliability | 12–14 |
| §15 HVAC workflows | 17 |
| §16 Cross-industry packs | 17 |
| §17 Dashboards/reports | 16 |
| §18 Notifications/queues | 11, 15 |
| §19 Audit/privacy/controls | 02, 04, 08–09, 13–16 |
| §20 Platform administration | 04–05, 09 |
| §21 Acceptance/launch blockers | 17–18 |
| §22 Pilot plan/measures | 17–18 |
| §23 Explicit exclusions | 18 MVP boundary; 19–24 approved Growth overrides; remaining deferrals below |
| §24 Screen inventory | 05–18, release route audit in 18 |

## Database baseline coverage and evolution

The 46-table SQL schema is a baseline for the original MVP, not a frozen final schema. Its invariants remain mandatory unless an approved migration below replaces a model.

| Baseline schema area/tables | Owning sprint | Required roadmap delta |
|---|---:|---|
| `users`, `device_installations` | 03 | Add password credentials/history, sessions, reset/lockout; preserve platform identity and device revocation |
| `platform_admins`, `tenants` | 04–05 | Add typed platform capabilities, immutable Super Admin identity, god sessions and dual approvals |
| `tenant_settings`, `branches`, `tenant_users`, `teams`, `team_members` | 04–05 | Replace fixed membership role/overrides with role joins; retain branch/supervisor/team temporal history |
| `customers`, `sites`, `service_targets`, `parts` | 06 | Preserve soft delete, tenant-local `citext` codes, search indexes, histories and optional target semantics |
| `workflows`, versions, sections, fields, options, rules/conditions/actions | 07–09 | Preserve version pinning; remove OTP as selectable MVP field; add feature/privacy/report metadata and immutable snapshot/hash |
| `recurrence_plans`, `tasks`, assignments, links | 10–11 | Add task reference attachments, worker requests, recurrence exceptions/checkpoints and explicit flags as needed |
| `task_runs`, histories, answers/selections/results, evidence, GPS, parts | 12–15 | Preserve normalized answers, evidence checksum/provenance, event GPS and old-part return; add sync receipts/conflict details |
| `otp_challenges` and OTP enum values | 02–03 | Do not expose/deploy as active feature; remove or deprecate through a reviewed migration because OTP is deferred |
| `customer_confirmations`, exceptions, reviews, target-registration requests | 15 | Signature/none paths only; add immutable summary hash, correction revisions and explicit exception decisions |
| `sync_mutations` | 12–14 | Expand statuses/receipts/order/base revision while preserving client mutation ID and payload hash idempotency |
| `import_jobs`, `import_rows` | 06, 11 | Retain row provenance/results; add mappings, preview revision, file checksum and rejected-row artifact |
| `notifications`, `generated_reports`, `audit_logs` | 02, 11, 16 | Add delivery/job attempts and hash-chain audit; preserve immutable reports and separate operational/audit logs |
| Dynamic RBAC/feature registry | 04 | New `roles`, `permissions`, `role_permissions`, `tenant_user_roles`, feature/dashboard registry and capability revision |
| SMTP | 16 | New global/tenant encrypted profiles, verification and delivery/retry records |
| Growth entities | 19–23 | Portal identities/requests; contracts/versions/coverage/allowances; invoices/lines/credits; tracking/feedback; SLA/domain records |

### Database invariants that every owning sprint must test

- Application/entity IDs are UUIDv7 where offline/time-sortable identity is required; mutation/idempotency keys remain client-created UUIDv4.
- Every tenant table uses `(tenant_id, id)` identity and every relationship carries `tenant_id` in its composite foreign key.
- RLS is enabled and forced; `SET LOCAL app.tenant_id` is set per transaction and missing context sees/writes nothing.
- Human codes use case-insensitive uniqueness; searchable names have the approved trigram/index strategy.
- Mutable timestamps use `timestamptz` and trustworthy database-maintained `updated_at`; business scheduling stores instants in UTC and displays tenant/branch timezones.
- Reference history is archived/soft-deleted. Published workflows, submitted runs/evidence, issued financial records and audit logs receive database privilege-level UPDATE/DELETE denial.
- Evidence bytes stay in object storage; metadata records checksum, MIME, size, capture source/time/location and upload state.
- Append-only high-volume tables use BRIN/time indexes and are partitioned only after measured thresholds. PostGIS, task partitioning and read replicas/materialized views require measured need and an ADR—not speculative delivery.

### Complete 46-table ownership inventory

- Sprints 03–05: `users`, `platform_admins`, `tenants`, `tenant_settings`, `branches`, `tenant_users`, `teams`, `team_members`.
- Sprint 06: `customers`, `sites`, `service_targets`, `parts`, plus the shared `import_jobs` and `import_rows` paths for those records/users.
- Sprints 07–09: `workflows`, `workflow_versions`, `workflow_sections`, `workflow_fields`, `workflow_field_options`, `workflow_rules`, `workflow_rule_conditions`, `workflow_rule_actions`.
- Sprints 10–12: `recurrence_plans`, `tasks`, `task_assignments`, `task_links`, `device_installations`, with `import_jobs`, `import_rows` and `notifications` reused for task imports/events.
- Sprints 13–15: `task_runs`, `task_status_history`, `repeat_group_instances`, `task_answers`, `answer_option_selections`, `answer_lookup_selections`, `task_section_results`, `evidence_files`, `gps_events`, `parts_used`, `customer_confirmations`, `task_exceptions`, `task_reviews`, `target_registration_requests`.
- Sprint 14: `sync_mutations` and its expanded receipt/conflict/order contract.
- Sprint 16: `generated_reports`; Sprint 02 establishes and every mutation-owning sprint writes `audit_logs`.
- `otp_challenges` is the one baseline table intentionally not activated: OTP is deferred by the locked product decision and its compatibility/removal migration is owned by Sprints 02–03/08/15.

## Engineering and quality coverage

| Standard | Roadmap enforcement |
|---|---|
| SOLID, DRY, KISS, YAGNI, Fail Fast, Law of Demeter, explicit state/policies and early returns | All implementation sprints; architecture/code-principle gate |
| Controller → Service → Repository → Prisma; ports/adapters and modular monolith | 01–02 foundation and every feature review |
| One API envelope, typed errors/statuses, correlation IDs, no `204`, UUIDv4 mutation idempotency | 02 onward |
| Structured redacted operational logs plus separate append-only audit | 02 onward |
| OpenAPI source of truth and generated Flutter models | 02 onward |
| ≥80% service/repository coverage, endpoint happy path + top three errors, story E2E | Every feature sprint |
| RLS/IDOR/scope/god-mode security matrices | 03–24 |
| React/Flutter component/widget/golden/integration coverage | Surface-owning sprints |
| LambdaTest/TestMu cross-browser and real-device qualification | Every sprint through explicit coverage or signed N/A |
| Production synthetics, Sentry releases, alert/runbook, migration/rollback/restore evidence | 01–24; release campaigns 18 and 24 |
| Latest-compatible-stable dependencies, committed lockfiles, approved open-source licenses, deprecation/advisory review and no paid/premium UI packages | 01–24; release audits 17–18 and 24 |
| React Big Calendar scheduler; exact grid-beta and SheetJS exceptions; MapLibre tracking-only boundary | 06, 11, 17–18, 22, 24 |
| Sentry `fieldbrixxx/{vite-react,nest,flutter,lambdas}` release/scrubbing/source-map/symbol evidence | 01–24 |

## Explicitly deferred after Growth GA

Payroll/automated attendance, route optimization, advanced purchasing/warehouse/cost inventory, payment collection/gateways/reconciliation/dunning, quotes, AI/OCR diagnosis, video/audio/NFC/map drawing/editable grid fields, accounting/integration marketplace, custom master-data modules, automated FieldBrix subscription charging, continuous off-duty location, and native white-label applications remain out of scope. Adding any requires a new approved roadmap and schema/API/privacy review.
