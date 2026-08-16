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

- [x] Specify typed expression AST, operators, value coercion/null semantics, action priority, stop behavior and deterministic tie-breaking. Fixed a real precedence bug during this review: `evaluateRules` iterates rules highest-priority-first, but `set_visible`/`set_required` used unconditional object-key assignment — so when two rules conflicted on the same field, the *lowest*-priority rule silently won because it was processed last and overwrote the higher-priority rule's value, exactly backwards from what `priority` is supposed to mean. `warning`/`failure`/`recommend_follow_up` (arrays) and `safety_stop` (one-way OR) were never affected — only the two object-keyed actions. First-write-wins (guarded by `!(fieldKey in outcome.visible)`) now matches the documented DESC-priority order. Proven with a red→green test (`rule-engine.spec.ts` — "higher-priority rule wins a set_visible/set_required conflict").
- [x] Detect contradictory requirements within a single rule. (Verified: `validateRules` now flags a rule whose own actions both show/hide or require/un-require the same field — `CONTRADICTORY_ACTION` — since that's a configuration error regardless of any other rule or evaluation order, unlike a *cross*-rule conflict which priority legitimately resolves at evaluation time. 4 new tests, including one proving cross-rule conflicts are correctly left unflagged.)
- [ ] Build evaluator as side-effect-free shared package with fixtures portable to TypeScript and Dart; reject unknown schema/operator versions. Partial: `rule-engine.ts` is a real, pure, side-effect-free TypeScript evaluator with unit-test coverage (`rules/rule-engine.spec.ts`); it is not extracted into a shared package, has no unknown-schema/operator-version rejection, and no Dart port exists — the mobile app does not consume workflows until Sprint 13, so a Dart evaluator would be unverifiable dead code; deliberately not started.
- [ ] Add repeatable groups with stable row IDs, calculation dependency graph, scan/evidence metadata and explicit rounding/unit rules. `REPEATABLE_GROUP` and `CALCULATION` are registered field types but have no runtime support — not started.
- [ ] Extend every field schema with identity/help, read-only/hidden/default/worker-edit, validation, logic, evidence source/count/reason/time/location, report/dashboard/export/exception inclusion and sensitive/supervisor-only visibility metadata. `CreateFieldDto`/`UpdateFieldDto` only carry `key/type/label/help/required/position/config` (free-form, unvalidated); the full metadata set is not modeled — not started.
- [x] Implement the full DOCX operator/action registry including enable/disable, fixed default, note/photo/signature requirement, supervisor alert/review and follow-up recommendation; OTP actions remain invalid. (Verified: `rule-engine.ts` now implements 9 operators and 15 actions — the original 7 (`set_visible`, `set_required`, `require_evidence`, `warning`, `failure`, `safety_stop`, `recommend_follow_up`) plus `set_enabled` (enable/disable, same priority-conflict resolution as `set_visible`/`set_required`), `set_default` (fixed default value per field), `require_note`/`require_photo`/`require_signature` (type-specific evidence requirements, each its own deduplicated outcome bucket rather than the generic `require_evidence`), and `supervisor_alert`/`supervisor_review` (message-collecting alert vs. a boolean review-required flag). `validateRules`'s self-contradiction check now also covers `set_enabled`. No OTP action exists (correct — explicitly out of scope). Covered by 13 new tests in `rule-engine.spec.ts` (39 total, all passing); full backend suite (116 tests) green.)
- [ ] Detect direct/indirect cycles, references to archived/hidden fields, unreachable branches and unsafe safety-stop overrides. Contradictory requirements are now covered (see above). The rest is deliberately not started rather than guessed at: there is no field-computes-from-another-field relationship yet (`CALCULATION` fields have no formula evaluator — Sprint 08 checklist item above), so there is no real dependency graph for "cycles"/"unreachable branches" to operate on. A "field permanently hidden by an unconditional rule" check was drafted and *rejected* during this review: hidden fields' submitted answers are not currently excluded from evaluation (that gap is tracked separately below), so a condition referencing a hidden field is not actually unreachable given current data flow — shipping that check would have been a false positive blocking legitimate configurations. "Unsafe safety-stop override" has no defined meaning against the current evaluator: `safety_stop` is a one-way OR across all matching rules (nothing can suppress it once any rule sets it), so there is no override path to detect.
- [ ] Make hidden fields excluded from required/submission checks unless a documented rule explicitly retains their value; clear/retain behavior is versioned. Not started — the evaluator returns `visible`/`required` maps but nothing consumes them to exclude hidden fields from submission (task submission/evidence enforcement is Sprint 13 scope).
- [ ] Build rule editor, condition groups, action config, priority, live branch preview, cycle/conflict warnings and human-readable explanations. Partial, was fully not-started: `routes/workflows/rules.tsx` (route `/workflows/:id/rules`, linked from the builder page) now covers condition groups (add/remove field+operator+value rows, AND-only), the full 14-action config form (type-aware field/boolean/text/message inputs matching each action's actual shape), priority as a plain number input (no drag-reorder — `PUT .../rules/order` is wired server-side but the editor doesn't call it), a rules table with delete, a "Validate rules" button surfacing `POST .../rules/validate`'s structural errors (duplicate IDs, unknown fields, `CONTRADICTORY_ACTION` conflicts) verbatim, and a live-preview panel (`POST .../evaluate` against JSON sample answers, full outcome JSON shown). Live-verified end-to-end against the running stack: created a workflow, added a field, added a rule with `warning` + `require_photo` actions via the same payload shape the editor sends, and `/evaluate` returned the correct `warnings`/`requiredPhotos` outcome. Still missing: drag-reorder for priority, cycle detection (not actually applicable to this flat condition/action model — no branching graph exists to cycle), and human-readable rule explanations (errors are shown as raw `code`/`message`, not translated to plain language). Covered by 3 new tests in `rules.test.tsx`.
- [x] Persist named simulation vectors with workflow draft; avoid production PII in fixtures. (Verified: `POST /workflows/:id/simulations` → `WorkflowRuleService.createSimulation` → `workflow_simulations` table (`026-*.sql`); requires a non-empty `name`; no PII-scrubbing logic needed since fixtures are operator-authored test vectors, not production data.)
- [ ] Define safety event/audit contract now for mobile consumption in Sprint 13. Not started — `safety_stop` is evaluated in-process but produces no named event/audit contract for a future mobile consumer.

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
