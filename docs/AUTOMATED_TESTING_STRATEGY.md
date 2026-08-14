i ha

# Fieldbrix — Automated Platform Testing

### Two phases: fast feedback while building, continuous verification once it's live — minimum human effort, minimum AI-agent involvement in either

### Version 1.0 · August 2026

---

## HOW TO READ THIS DOCUMENT

Backend-agnostic — applies identically whether the API is NestJS (`ENGINEERING_HANDBOOK.md`) or
FastAPI (`fastapi/ENGINEERING_HANDBOOK_FASTAPI.md`). Two distinct phases, both automated, both
designed to need neither a human clicking through the app nor an AI agent judging whether
something "looks right":

```
PHASE 1 — DURING DEVELOPMENT           PHASE 2 — AFTER DEVELOPMENT
Every commit / every PR                Once a feature is live in staging/prod
Fast (seconds–minutes)                 Continuous (every few minutes, forever)
Catches: agent-introduced regressions  Catches: the world changing underneath
before merge                           a build that was correct when it shipped
Mobile: emulator in CI                 Mobile: real devices, nightly, Device Farm
```

Phase 2 is what `AUTOMATED_TESTING_STRATEGY.md` originally covered — Lambda-based synthetic
monitoring of the deployed platform. It's still here (§4). Phase 1 — testing the mobile app (and
everything else) *while it's being built*, automatically, on every change — is §3, and it's the
one that matters right now.

---

## 1. The Problem This Solves

Part K/14 (Testing Standards, both handbooks) already mandates unit/integration tests alongside
every service method. That covers backend logic. It does not cover "does the mobile app actually
still work end-to-end" — login, create a task, go offline, queue a mutation, come back online,
confirm it synced. That class of bug (a widget rename breaks a `find.byKey` somewhere three
screens away, an offline-queue edge case regresses) is exactly the kind an AI agent introduces
silently while iterating fast, and exactly the kind nobody notices until a human happens to click
through that specific path by hand — which, per your workflow, isn't reliably happening, and
shouldn't need to.

The fix: the mobile app (and web, and backend) gets tested automatically on every change, the
same way `mypy`/`tsc`/`ruff` already gate the backend — via CI, via emulator, via deterministic
assertions. No human opens an emulator. No AI agent is asked "does this look right."

---

## 2. Why Not AI Agents for the Verification Loop

Applies to both phases:

```
Cost        : an agent invocation costs real tokens every run. A CI job or a scheduled
              Lambda costs fractions of a cent.
Determinism : "assert find.text('Task created') is visible" is unambiguous. An LLM
              judging a screenshot is not — inconsistent pass/fail across runs.
Latency     : a scripted assertion runs in seconds. An agent loop takes much longer,
              multiplied across every scenario, every run.
Attended-ness: CI triggers on push, automatically. A cron-triggered Lambda needs no
              invoker. An agent needs something to invoke it.
```

**Rule of thumb:** if a check has a pass/fail condition you can write as an `assert` or a widget
finder, it belongs in a test, not a prompt. The one place an agent belongs in this loop is *after*
a scripted check has already flagged a failure — triaging root cause, not detecting it.
Running the tests itself is fine for an agent to do as part of its own edit loop (that's
mechanical execution, not judgment) — deciding by eye whether output "looks correct" is not.

---

## 3. Phase 1 — During Development: Fast Feedback On Every Change

### 3.0 Dependency, license and observability gates

Every frontend, backend and Flutter PR runs the ecosystem's frozen-lockfile install, deprecation/discontinuation check, vulnerability audit, approved open-source license check, lint/type/analyze, unit/integration tests and production build. The dependency owner records the latest stable registry release, chosen compatible version, peer/runtime compatibility and migration notes.

Weekly Dependabot PRs target the three application repositories. They never auto-merge major versions or prereleases. `react-data-grid@7.0.0-beta.61` is excluded from automatic updates; it is the sole approved prerelease and requires its dedicated React 19/Vite 8/keyboard/screen-reader/large-grid suite. Paid, proprietary, trial or premium-only frontend runtime packages fail the license gate.

Sentry verification is deterministic: a disposable test event must arrive in the expected `fieldbrixxx` project with matching release/environment, usable source maps or symbols and no credential, PII, request body, evidence, precise location or presigned URL. Replay stays disabled until a scripted masking campaign is approved. See [`../sentry/`](../sentry/) and the canonical [`../react-libraries.md`](../react-libraries.md).

### 3.1 The Local Loop (seconds, no emulator)

Every change the agent (or you) makes to `mobile/` ends with:

```bash
flutter analyze && flutter test
```

`flutter test` runs unit + widget tests against the Dart VM — no emulator, no device, typically
seconds even for a large suite. This is mobile's equivalent of the `mypy --strict`/`tsc --noEmit`
gate already P0 in both backend standards docs, and should be treated with the same weight:
Claude Code / Codex run this themselves after every edit, before considering a change done, the
same way they'd run a type checker. This alone catches the majority of regressions — wrong prop
passed to a widget, a provider override left dangling, a broken `AsyncValue.when` branch — before
anything ever needs a screen.

### 3.2 Golden (Screenshot) Tests — visual regressions, zero eyeballing

```bash
flutter test --update-goldens   # generate/update baseline images (reviewed like any diff)
flutter test                     # subsequent runs pixel-diff against the baseline, fail on drift
```

Catches layout breaks, color/theme regressions, and widget-tree changes that alter rendering —
automatically, in the same fast local loop as §3.1. Nobody looks at a screenshot to decide if it
"looks right"; the pixel diff decides. New goldens get reviewed once, like a code diff, when a
UI change is intentional.

### 3.3 PR-Gated Emulator Integration Tests — the actual "does the app work" check

This is the mechanism that tests the mobile app *as an app* — real navigation, real PowerSync
sync, real offline-queue behavior — automatically, on every PR, with no human touching a device:

```yaml
# .github/workflows/mobile-integration.yml
jobs:
  android-integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 30
          script: flutter test integration_test/app_test.dart
```

`reactivecircus/android-emulator-runner` boots a real Android emulator inside the GitHub Actions
runner, headless, no manual setup. The existing `integration_test/` suite (golden paths: login,
create task, offline queue → reconnect → sync, checklist completion — same scenarios the offline
chaos-test list in Part K2/14.2 already names) runs against it. A regression fails the PR check
the same way a failing backend test would. iOS gets the equivalent on a macOS runner
(`xcodebuild test -destination 'platform=iOS Simulator,name=iPhone 15'`).

This is the layer to prioritize first — it's the direct answer to "test the mobile app during
development, minimum human effort": once wired, it runs on every PR forever, unattended.

### 3.4 Maestro — lower-effort alternative/complement for new flows

```yaml
# .maestro/create-task.yaml
appId: com.fieldbrix.app
---
- launchApp
- tapOn: "Login"
- inputText: "9876543210"
- tapOn: "Send OTP"
- tapOn: "Create Task"
- assertVisible: "Task created"
```

Maestro (mobile.dev) drives the app via declarative YAML flows instead of Dart widget-finder
code — no compile step, trivial for an agent to write or extend when a new scenario is needed,
runs against the same CI emulator as §3.3. Worth adopting alongside `integration_test/` specifically
because it lowers the cost of adding the *next* scenario, which is where "minimum effort" actually
gets tested over time — not the first ten flows, the fiftieth.

### 3.5 Backend and Web, Same Pattern (already specified, cross-referenced here)

Backend: `pytest`/Jest on every push, already P0 in Part K/14 of both handbooks — no new work.
Web: add fast component-level tests (Vitest + Testing Library) to the same local/PR-gated tier
for the same reason mobile gets widget tests — full Playwright E2E (§4.3, Phase 2) is the right
tool for the deployed app, not for every commit; it's slower and belongs after merge, not before.

---

## 4. Phase 2 — After Development: Continuous Production Verification

Once a feature has shipped and Phase 1 already caught the regressions that mattered before merge,
this layer catches a different problem: the world changing underneath a build that was correct
when it shipped — RDS out of connections, PowerSync stopped replicating, the WhatsApp BSP
integration silently failing, a bucket policy edit breaking presigned URLs. None of that shows up
in a PR check. This is the "after development, we'll see" layer — still worth having, just not
the one blocking you right now.

### 4.1 Architecture

```
EventBridge (cron rules)
    │  every 5–15 min           every night          on every deploy
    ▼                           ▼                     ▼
synthetic-api-test Lambda   device-farm-trigger    smoke-test Lambda
    │                       Lambda                     │
    ▼                           ▼                     ▼
hits staging/prod API      kicks off AWS Device    hits staging right
asserts envelope shape,    Farm run against real   after deploy, before
status codes, latency      Android/iOS devices     traffic is trusted
    │                           │                     │
    └───────────────┬───────────┴─────────────────────┘
                     ▼
        failure? → same Notifications Lambda Fieldbrix
                    already has (Part 12) → WhatsApp/Slack/
                    email to on-call, auto-create ticket
```

Every piece already exists in Fieldbrix's infra (Part 1/12 of both handbooks): EventBridge,
Lambda, the Notifications Lambda's dispatch. This is new scheduling and assertions on top of
infrastructure already paid for.

### 4.2 Backend API — synthetic scenario testing

```python
# lambdas/synthetic_test/handler.py
import httpx, boto3, os

BASE_URL = os.environ["TARGET_BASE_URL"]
sns = boto3.client("sns")

SCENARIOS = [
    ("health",      "GET",  "/health",     None, 200),
    ("login",       "POST", "/auth/login", {"phone": "...", "otp": "..."}, 200),
    ("list_tasks",  "GET",  "/tasks",      None, 200),
    ("create_task", "POST", "/tasks",      {"...": "...", "idempotencyKey": "..."}, 201),
]

def handler(event, context):
    failures = []
    token = _login_test_account()
    for name, method, path, body, expected in SCENARIOS:
        try:
            resp = httpx.request(method, f"{BASE_URL}{path}", json=body,
                                  headers={"Authorization": f"Bearer {token}"}, timeout=10)
            assert resp.status_code == expected, f"got {resp.status_code}"
            envelope = resp.json()
            assert "success" in envelope and "meta" in envelope, "envelope shape broken"
        except Exception as e:
            failures.append(f"{name}: {e}")

    if failures:
        sns.publish(TopicArn=os.environ["ALERT_TOPIC_ARN"],
                     Message=f"{len(failures)} synthetic check(s) failed:\n" + "\n".join(failures))
        raise RuntimeError(failures)
    return {"passed": len(SCENARIOS)}
```

Deployed exactly like the other four Lambdas (Part 1 CI/CD: zip → `aws lambda update`).

### 4.3 Web — headless browser E2E, on a schedule

Lambda container images (up to 10GB) fit headless Chromium (`@sparticuz/chromium`) driving
Playwright. Scheduled every 30 min against staging: log in, open the dispatch board, drag a task,
confirm it landed. Screenshot + trace to S3 on failure, linked in the alert.

### 4.4 Mobile — AWS Device Farm, nightly, real devices

```
EventBridge (nightly) → trigger-device-farm-run Lambda
    → Device Farm: ScheduleRun API, the SAME integration_test/ suite from §3.3,
      now against a device pool of real low-end Android models
      (matches the min-device bar in Part 10 of both handbooks)
    → results → Notifications Lambda
```

Reuses the exact test suite Phase 1 already runs on an emulator — no separate test code to
maintain. **Bonus:** Device Farm supports network-condition profiles (packet loss, latency,
bandwidth caps) — the direct way to exercise the offline/sync chaos scenarios (Part K2/14.2)
against a real device automatically, instead of only as a manual QA checklist.

### 4.5 Async pipeline

A scheduled job publishes a test message to each SQS queue (a real PDF job for a fixture task, a
test notification to a sandbox number) and checks the expected side effect landed — a file in S3,
a logged notification — within a timeout.

### 4.6 Smoke test on deploy

Add one step to the existing deploy pipeline: invoke §4.2's Lambda synchronously right after
restart, before considering the deploy successful. A bad deploy fails immediately instead of
waiting for the next scheduled run.

---

## 5. Where an AI Agent Still Belongs

- **Executing tests is fine** — the agent running `flutter test` or `pytest` itself, in its own
  edit loop, is mechanical execution against a deterministic pass/fail, exactly like running a
  type checker. Encouraged in both phases.
- **Writing a new scenario once** (a new `integration_test/` case or Maestro flow when a feature
  ships) — draft by agent, reviewed by human, becomes a permanent scripted check from then on.
- **Triaging a flagged failure** — after §3.3 or §4.2 already caught something, handing the
  failure (log, screenshot, Device Farm trace) to an agent to summarize likely root cause is a
  good use of judgment-based reasoning.
- **Never** deciding by inspection whether a test passed. If that's happening, the check isn't
  finished yet — the assertion needs to be made concrete.

---

## 6. Cost

```
Phase 1 (during development)
  flutter test / golden tests      : free, runs on the dev/agent machine or a normal CI runner
  Android emulator CI job           : normal Linux runner-minutes, ~5-8 min per run (emulator boot)
  iOS simulator CI job              : macOS runners are billed ~10x Linux runner-minutes on GitHub
                                       Actions — real cost, keep this job scoped to golden paths,
                                       not the full suite, if it needs to run on every PR
  Maestro flows                     : free, runs on the same emulator job

Phase 2 (after development)
  Synthetic API / OpenAPI-diff Lambda : within Lambda free tier at every-5-15-min frequency
  Headless-browser Lambda             : still free-tier-scale at every-30-min frequency
  Device Farm nightly                 : priced per device-minute — the one real cost; nightly,
                                         not continuous, keeps it near-zero
```

Phase 1 is essentially free (reuses CI minutes already being spent on backend/web checks, plus
one emulator job). Phase 2's only non-trivial cost is Device Farm, and only because it runs
against real hardware.

---

## 7. Rollout (Minimum Effort, in Order)

```
1. §3.1 local loop        — flutter analyze && flutter test after every mobile change.
                             Zero setup beyond adding it to the agent's own edit checklist.
2. §3.3 PR-gated emulator  — one GitHub Actions workflow file. This is the one that actually
   integration tests        answers "test the mobile app during development" — do this next.
3. §3.2 golden tests       — add once the app has stable-enough UI to baseline against.
4. §3.4 Maestro            — add as new scenarios come up; lowers cost of every scenario after.
5. §4.2 + §4.6             — synthetic API Lambda + deploy-time smoke test, once something is
                             actually deployed and staying deployed.
6. §4.3 → §4.4             — web E2E, then Device Farm nightly, once the app is stable in
                             staging and worth monitoring continuously rather than per-change.
```

Steps 1–2 are the ones worth doing today. Everything from step 5 onward is deliberately the
"after development, we'll see" layer.

---

*Document owner: CTO.
Companion to Part K (`tech_implementation_guide.md`) / Part 14 (`ENGINEERING_HANDBOOK.md` and
`fastapi/ENGINEERING_HANDBOOK_FASTAPI.md`) — those specify what a test must cover; this specifies
when and how it runs, unattended, in both phases.
This file lives at `/docs/automated_testing_strategy.md` in the monorepo root.
Last updated: August 2026.*
