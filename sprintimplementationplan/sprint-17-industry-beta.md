# Sprint 17 — Industry Templates and Beta Qualification

Source: [Sprint plan](../sprintplans/sprint-17-industry-beta.md) · Prerequisite: Sprint 16 QA sign-off · Status: `NOT STARTED` · Target: 64 points · Milestone: MVP beta-ready

## Outcome and template inventory

Prove the configurable core supports HVAC, Facility Management, Appliance/Water Purifier, and Cleaning/Pest pilots without sector-specific code. Deliver three complete HVAC workflows, nine additional starter workflows, terminology packs, representative data and executable acceptance fixtures. Templates are versioned platform content instantiated into tenant drafts under Sprint 09 governance.

## Content/API contracts

No new general-purpose endpoint is expected. Use `/platform/workflow-templates`, instantiate/publish APIs, master-data imports, task execution/review/report APIs and a controlled fixture loader available only to CI/local/provisioned test tenants.

| Artifact | Required contract |
|---|---|
| Template manifest | stable template key/version/sector, supported language/terminology, required feature registry, content hash and change notes |
| Acceptance vector | initial records/context/answers, expected rules/outcome/evidence/report assertions; contains no customer PII |
| Fixture pack | deterministic tenant/settings/users/roles/records/tasks with cleanup key and schema version |
| Compatibility report | template version × workflow engine version × mobile minimum version × PDF template version |

## Implementation checklist

- [ ] Product and QA approve source requirements, outcomes, safety stops, evidence, exceptions and report content for all 12 workflows.
- [ ] Build three HVAC flows end-to-end: planned service/maintenance, reactive breakdown/repair and commissioning/installation (or approved documented equivalents).
- [ ] Build one starter workflow for each of Facility Management, Home Appliance, ISP/Fiber, Electrical, Plumbing, Pest Control, Medical Equipment, Commercial Cleaning and Water Purifier with no hidden custom code or tenant-specific IDs.
- [ ] Encode all branching through the rule engine; all assets/lookups use registry bindings and importable fixture keys.
- [ ] Create terminology packs with fallback and length constraints; verify changes do not alter API/domain enum keys.
- [ ] Version/sign manifests and store fixture/acceptance hashes so runs are reproducible.
- [ ] Add automated tenant fixture provision/reset and template-instantiation orchestration behind environment safeguards.
- [ ] Feed defects back into shared core; do not patch a template with unsafe duplication if the problem is an engine defect.

## Dependency and Sentry implementation

- Produce a cross-repository SBOM/deprecation/advisory/license audit and prove every sector uses the same approved UI/mobile adapters without template-specific packages or paid plugins.
- Record clean Sentry release health across qualification; tag template key/version and engine/app version only, never fixture answers or evidence.

## Code-principle gate

- [ ] SRP: template content, manifest/version, fixtures, acceptance vectors and qualification orchestration remain separate artifacts.
- [ ] OCP: sectors/templates are added through platform content and registries, never sector-specific core branches.
- [ ] LSP/ISP/DIP: all templates execute through the same workflow/task/mobile/report interfaces and shared acceptance contract.
- [ ] DRY/KISS/YAGNI: shared domain rules live in core definitions while genuinely different sector concepts stay separate; no speculative sector engine is built.
- [ ] Fail Fast: manifest/hash/version/feature compatibility validates before fixture load, instantiation or execution.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs/audit | template publish/instantiate, fixture provision/reset and acceptance run IDs; audit platform/tenant content changes |
| Sentry | Tag template key/version and engine/app version, not fixture answers; zero unhandled issues across qualification runs |
| Metrics | completion/review/report success and duration by template version, rule/evidence failures, device performance; compare sector baselines |
| Alerts | template hash/compatibility mismatch, safety divergence, fixture contamination or beta journey failure |

## Qualification and LambdaTest checklist

- [ ] Execute every branch and documented error/safety path for all 12 templates using versioned acceptance vectors.
- [ ] Trace each HVAC section/condition and every non-HVAC starter journey back to DOCX §§15–16; each expected field, evidence, result, exception and report has an assertion.
- [ ] For each sector run tenant setup → master import → template instantiate/publish → schedule → mobile offline execute → signature → review → PDF/email.
- [ ] Verify dynamic role variants: preset, cloned preset, blank custom role with dashboard grants, multi-role additive user and deny-by-default user.
- [ ] Verify god mode can inspect/correct each sector tenant with reason/audit and cannot be assigned or constrained.
- [ ] Re-run shared core regression: tenant/RLS, roles, workflows/rules/versioning, task states, offline sync, evidence, review, reporting and SMTP.
- [ ] LambdaTest web: four terminology/branding packs across Chrome/Edge/Firefox/Safari and mobile web; visual/accessibility scans and long-label/RTL stress.
- [ ] LambdaTest mobile: at least one complete sector journey per Android/iPhone device class; all 12 on primary Android; offline, camera, GPS, signature and low-memory evidence.
- [ ] Run API/mobile performance with largest template; safety and calculation outputs must match backend/web/mobile fixtures.
- [ ] Record every failure with template/fixture/build/hash; rerun after fixes and link evidence.

## Beta sign-off

- [ ] Publish template catalogue, release notes, compatibility matrix, fixtures, expected outcomes and sector-demo runbooks.
- [ ] CI/nightly creates clean tenants and runs template acceptance with drift/hash validation.
- [ ] Run production isolated-tenant beta rehearsal for all four sectors and verify cleanup/audit.
- [ ] Product signs content; QA signs functional/regression; Security signs isolation/god mode; Mobile signs device/performance.
- [ ] Attach LambdaTest builds, Sentry release health, reports/emails, reconciliation and milestone decision. Sprint 18 is blocked until beta sign-off.
