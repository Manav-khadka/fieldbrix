# Sprint 08 — Advanced Fields and Conditional Rules

Source: [Sprint plan](../sprintplans/sprint-08-rule-engine.md) · Prerequisite: Sprint 07 QA sign-off · Status: `IN PROGRESS` · Target: 64 points

## Outcome and engine contract

Admins configure advanced fields, repeatable groups, calculations, scans/evidence and deterministic rules controlling visibility, required state, proof, warnings, failure, safety stop, follow-up and submission. One versioned pure evaluator runs against the same normalized input in preview, API validation and Flutter runtime.

## API contracts

| Method | Path | Permission | Contract highlights |
|---|---|---|---|
| GET | `/workflow-field-types` | `workflows.view` | versioned advanced field/action/operator registry |
| POST/PATCH | `/workflows/:id/rules[/:ruleId]` | `workflows.edit` | expression/action/priority/idempotency + revision |
| PUT | `/workflows/:id/rules/order` | `workflows.edit` | deterministic precedence and revision |
| POST | `/workflows/:id/rules/validate` | `workflows.edit` | cycle/unreachable/conflict diagnostics |
| POST | `/workflows/:id/evaluate` | `workflows.view` | schema version + answers/context → outcomes/explanations; no persistence |
| POST | `/workflows/:id/simulations` | `workflows.edit` | named test vector/idempotency → expected outcomes |

## Implementation checklist

- [x] Specify typed expression AST, operators, value coercion/null semantics, action priority, stop behavior and deterministic tie-breaking. (Verified: side-effect-free typed rule engine with deterministic priority/id ordering and safety-stop precedence.)
- [ ] Build evaluator as side-effect-free shared package with fixtures portable to TypeScript and Dart; reject unknown schema/operator versions.
- [ ] Add repeatable groups with stable row IDs, calculation dependency graph, scan/evidence metadata and explicit rounding/unit rules.
- [ ] Extend every field schema with identity/help, read-only/hidden/default/worker-edit, validation, logic, evidence source/count/reason/time/location, report/dashboard/export/exception inclusion and sensitive/supervisor-only visibility metadata.
- [ ] Implement the full DOCX operator/action registry including enable/disable, fixed default, note/photo/signature requirement, supervisor alert/review and follow-up recommendation; OTP actions remain invalid.
- [ ] Detect direct/indirect cycles, references to archived/hidden fields, unreachable branches, contradictory requirements and unsafe safety-stop overrides.
- [ ] Make hidden fields excluded from required/submission checks unless a documented rule explicitly retains their value; clear/retain behavior is versioned.
- [ ] Build rule editor, condition groups, action config, priority, live branch preview, cycle/conflict warnings and human-readable explanations.
- [ ] Persist named simulation vectors with workflow draft; avoid production PII in fixtures.
- [ ] Define safety event/audit contract now for mobile consumption in Sprint 13.

## Dependency and Sentry implementation

- Reuse the builder/schema adapters; dependency upgrades must pass identical web/API/mobile truth tables, cycles, accessibility and performance tests without adding a second rules framework.
- Instrument evaluator spans with engine/schema version and rule count only. Capture divergence/crash; expected outcomes are metrics and sensitive/hidden answers/evidence are prohibited.

## Code-principle gate

- [ ] SRP: AST parsing, validation, evaluation, action resolution, diagnostics and UI editing remain independently testable.
- [ ] OCP: operators/actions/functions extend registries with typed handlers; evaluator core does not grow feature-specific switches.
- [ ] LSP/ISP/DIP: TypeScript and Dart evaluators satisfy the same focused fixture contract and cannot change caller-visible semantics.
- [ ] DRY/KISS/YAGNI: one precedence/coercion specification drives all runtimes; no general scripting language or unused operator is added.
- [ ] Fail Fast: cycles, unknown references/versions, unsafe depth and conflicting safety behavior reject before save/evaluation side effects.
- [ ] Demeter/Explicit/Early Return: use only direct collaborators; name and type states, permissions, units, versions and side effects; reject failures early with a flat successful path.

## Logs, Sentry, audit, and metrics

| Signal | Requirements |
|---|---|
| Logs | `rule_created/changed/validated/evaluated`, `rule_cycle_detected`, `safety_stop_evaluated`; schema/rule IDs, outcome codes, duration—never answer/evidence values |
| Audit | expression/action/priority diffs and simulation changes; safety configuration changes are high-sensitivity |
| Sentry | evaluator spans with engine/schema version and rule count; capture engine divergence/crash, not expected business outcomes |
| Metrics/alerts | evaluation p50/p95, rules per workflow, validation errors by code, cross-runtime fixture divergence, safety-stop count; page on divergent evaluation |

## Test, integration, and LambdaTest checklist

- [ ] Build exhaustive truth tables for each operator/action, null/type boundary, nested group, repeatable row and calculation rounding case.
- [ ] Property/fuzz-test AST parser/evaluator for determinism, termination and no mutation; enforce evaluation time/depth limits.
- [ ] Golden contract fixtures must produce byte-equivalent normalized outcomes in backend, web preview and Dart evaluator.
- [ ] Response-masking tests prove sensitive and supervisor-only answers/evidence never enter unauthorized API responses, exports, logs, Sentry or worker caches.
- [ ] API tests cover valid rules plus cycles, unknown references, stale revisions, unreachable branches, unauthorized edits and schema-version mismatch.
- [ ] E2E build conditions → simulate branches → reload → preview visible/required/evidence/warning/failure/safety behavior.
- [ ] Test hidden-required interactions, conflicting actions, equal priority, safety bypass attempt, very large rule graph and malformed calculation.
- [ ] LambdaTest web: rule builder across browser matrix, keyboard group editing, explanatory errors, 200% zoom and WCAG scan.
- [ ] LambdaTest mobile: `N/A—full runtime arrives Sprint 13`; run shared Dart fixture suite on Android/iOS build and record evidence.
- [ ] Performance target: maximum supported rule graph evaluates within documented UI/server budget; fail CI regression threshold.

## Delivery and sign-off

- [ ] Publish evaluator specification, AST JSON schema, precedence table, supported functions/operators, safety policy and compatibility/versioning guide.
- [ ] CI gates cross-runtime fixtures, property tests, API E2E, React tests, accessibility and evaluator benchmark.
- [ ] Production test tenant demonstrates every action class and audited god-mode configuration without runtime divergence.
- [ ] Attach truth tables, benchmarks, Sentry trace, LambdaTest build and QA sign-off; Sprint 09 is blocked until complete.
