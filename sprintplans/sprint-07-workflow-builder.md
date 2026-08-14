# Sprint 7 — Workflow Builder Foundation

**Goal:** Let admins construct and preview reusable multi-section workflows.

**Prerequisite:** Sprint 6 QA sign-off  
**Capacity:** 64 story points

| Task | Type | Points | Dependencies |
|---|---:|---:|---|
| Write workflow CRUD, section, field, and preview tests | QA | 3 | Sprint 6 sign-off |
| Implement workflow, section, field, option, ordering, and configuration APIs | Backend | 13 | Sprint 6 sign-off |
| Build visual workflow editor and field-property panels | Web | 13 | Workflow APIs |
| Build preview renderer and shared schema contracts | Backend/Web | 8 | Builder foundation |
| Test creation, ordering, validation, saving, and preview | QA | 5 | Implementations complete |
| Integration-test persistence, permissions, and god-mode access | QA | 5 | Implementations complete |
| Regression-test lookups and terminology | QA | 3 | Functional tests complete |
| Test large workflows, invalid configurations, accessibility, and browsers | QA | 3 | Builder complete |
| Correct builder defects and re-test | Dev+QA | 8 | Test findings |
| Workflow-foundation QA sign-off | QA | 3 | All checks pass |

**Feature subtotal:** 64 points  
**Sprint total:** 64 / 64; no unallocated capacity

## Dependency and Sentry gate

- Own dnd-kit, XYFlow, Tiptap and form/schema adapters for the workflow builder, with keyboard/list alternatives, sanitized rich text and no paid editor/plugin dependency.
- Trace editor route/render/save/preview failures through the React boundary; scrub field help text, customer data and draft values.

## Acceptance criteria

### Functional

- Admins create, arrange, save, and preview multi-section workflows and supported basic field properties.
- Workflow identity/settings include code, description, sector/service category, applicable target categories or no-target, estimate, signature/approval policy, pause/follow-up/customer-unavailable behavior and reporting settings.
- The registry covers section, instruction, text, large text, number, yes/no, single/multiple choice, date, time and date-time foundations; advanced GPS/image/file/scan/lookup/signature/repeat/calculated behavior is completed in Sprint 08. OTP is excluded.
- Role permissions govern builder actions while god mode can inspect or modify any tenant workflow.

### Test coverage required for sign-off

- Invalid properties, reordered sections, unsaved edits, lookup filters, role restrictions, god access, keyboard operation, browser compatibility, and large-form responsiveness pass.
