# Sprint 07 — Workflow Builder Foundation

Source: [Sprint plan](../sprintplans/sprint-07-workflow-builder.md) · Prerequisite: Sprint 06 QA sign-off · Status: `IN PROGRESS` · Target: 64 points

## Outcome and data model

Admins create, order, save and preview reusable draft workflows. Model workflow drafts, sections, fields, options, validations, lookup bindings and revisions with stable IDs and explicit ordering. Advanced conditional rules and publication are Sprints 08–09.

## API contracts

| Method | Path | Permission | Contract highlights |
|---|---|---|---|
| GET/POST | `/workflows` | `workflows.view/create` | catalogue or empty draft create |
| GET/PATCH | `/workflows/:id` | `workflows.view/edit` | aggregate draft and optimistic revision |
| POST | `/workflows/:id/sections` | `workflows.edit` | section + position/idempotency |
| PATCH/DELETE | `/workflows/:id/sections/:sectionId` | `workflows.edit` | edit/archive section; revision required |
| POST | `/workflows/:id/fields` | `workflows.edit` | typed field config/idempotency |
| PATCH/DELETE | `/workflows/:id/fields/:fieldId` | `workflows.edit` | validate field-specific properties |
| PUT | `/workflows/:id/order` | `workflows.edit` | full section/field order + revision/idempotency |
| POST | `/workflows/:id/validate` | `workflows.edit` | errors/warnings by stable path |
| GET | `/workflows/:id/preview` | `workflows.view` | runtime schema without persisting answers |

## Implementation checklist

- [ ] Define supported foundational field types, constraints, option storage, lookup filters, defaults and serialization versions.
- [ ] Model workflow code/description/industry/category, target applicability/no-target, estimate, signature and approval policy, pause/follow-up/unavailable behavior and reporting settings.
- [ ] Register section, instruction, text, large text, number, boolean, single/multiple choice, date, time and datetime foundations; define Sprint 08 extension contracts for GPS, image, file, scanner, lookup, signature, repeatable group and calculated. Do not register OTP.
- [x] Keep aggregate writes transactional; reject stale revisions with context and never silently overwrite concurrent changes. (Verified: workflow repository revision predicates and PostgreSQL transaction/lock path.)
- [ ] Validate unique keys, positions, label/help limits, option duplicates, field configuration and references server-side.
- [ ] Build React drag/reorder editor, palette, section canvas, field properties, autosave state, undo warning and unsaved-navigation guard.
- [x] Build preview from the shared runtime schema/component registry, not a second handwritten interpretation. (Verified: preview reads the persisted workflow schema rather than accepting answers or maintaining a separate preview model.)
- [ ] Connect customer/site/target/part lookups through permission- and scope-aware APIs; preview cannot expand user access.
- [ ] Add accessible keyboard reorder alternative, focus management, labels/descriptions, error summary and responsive editor boundaries.
- [ ] Record workflow aggregate domain events and complete audit diffs without storing sensitive preview answers.

## Dependency and Sentry implementation

- Wrap dnd-kit, XYFlow and Tiptap behind builder ports; provide keyboard/list alternatives, sanitize rich text/link/image extensions and reject paid editor/graph plugins.
- Add React error/recovery boundaries and route/render/save/preview spans; group by safe field type/version and scrub help text, labels, draft values and lookup data.

## Code-principle gate

- [ ] SRP: workflow aggregate, field validators, editor state, lookup service and renderer have distinct responsibilities.
- [ ] OCP: new field types implement/register schema, validator, editor and renderer contracts without editing central conditional chains.
- [ ] LSP/ISP/DIP: preview/runtime renderers and lookup adapters honor focused shared contracts; workflow domain imports no UI/infrastructure code.
- [ ] DRY/KISS/YAGNI: one field/schema definition drives OpenAPI/editor/preview; conditional/governance features remain in their scheduled sprints.
- [ ] Fail Fast: unknown/invalid fields, stale revision and forbidden lookup fail before aggregate persistence.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `workflow_created/saved/validated`, `section/field_*`, `workflow_revision_conflict`, `preview_rendered`; workflow/revision/count/duration only |
| Audit | aggregate/section/field before-after diffs, reorder summary and actor; god session context when applicable |
| Sentry | editor route/render/save spans, API validation spans, React error boundary; group schema-render bugs by field type/version |
| Metrics/alerts | save/validation/preview latency, conflict/error rate, workflow size, autosave failure; alert on elevated save failure or renderer crash |

## Test, integration, and LambdaTest checklist

- [ ] Unit-test every field validator/serializer, aggregate ordering, revision conflict and lookup scope to ≥80%.
- [ ] Endpoint tests cover happy path plus invalid config, stale revision, forbidden lookup, archived record and cross-tenant workflow.
- [ ] Contract-test that editor and preview consume the same schema/version and generated types.
- [ ] E2E create multi-section workflow → add all field types/options → reorder → save/reload → validate → preview.
- [ ] Test 200-field workflow, long/Unicode labels, duplicate keys, invalid options, unsaved edits, concurrent tabs and network retry/idempotency.
- [ ] LambdaTest web: pointer and keyboard editing in Chrome/Edge/Firefox/Safari; responsive tablet preview; WCAG scan, zoom 200%, screen-reader names and focus order.
- [ ] LambdaTest mobile: `N/A—runtime app not yet consuming builder`; QA records schema compatibility assessment.
- [ ] Performance budget: save/validate p95 and preview render target for maximum supported workflow; capture React profile/query plans.

## Delivery and sign-off

- [ ] Publish field registry/schema, validation/error catalogue, editor state model, compatibility policy and support runbook.
- [ ] CI gates schema/contract drift, field unit matrix, API E2E, component/Playwright, accessibility and bundle/performance checks.
- [ ] Production test-tenant smoke creates and previews a workflow under tenant role and audited god mode.
- [ ] Attach OpenAPI, screenshots/test artifacts, Sentry traces, LambdaTest build and QA sign-off; Sprint 08 is blocked until complete.
