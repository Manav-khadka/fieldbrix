
# Building Production-Grade Software With AI Coding Agents

### A practical playbook for Claude Code, Codex/ChatGPT, DeepSeek, GLM, and any other AI coding agent — tool-agnostic, grounded throughout in the Fieldbrix build-out

### Version 1.0 · August 2026

---

## HOW TO READ THIS DOCUMENT

This is general — it applies to any production codebase built primarily with AI coding agents,
not just Fieldbrix. Every principle is followed by a concrete pointer to where Fieldbrix already
implements it, so this isn't abstract advice sitting next to the real docs — it's the reasoning
that produced them. §11 is a single table mapping every principle to its Fieldbrix artifact if
you want the short version.

Scope note on tools: "AI coding agent" here covers a wide range — agentic CLI tools (Claude Code,
Codex CLI) that run their own build/test/lint loop, and chat-interface tools (ChatGPT, DeepSeek,
GLM, and similar) typically used by pasting code in and out. §10 covers why that distinction
matters more than which specific model is involved.

---

## 1. The Core Shift: From Writing Code to Verifying Code

In traditional development, writing code is the bottleneck. A team is small, context is shared,
and a human reviewing another human's PR can lean on tribal knowledge — "oh, that's how we
always do auth here" — built up over months of working together.

With AI agents doing most of the typing, writing code stops being the bottleneck. It becomes
nearly free. What doesn't get cheaper is **trust** — and the tribal-knowledge shortcut stops
working, because the "team" is now potentially five different tools (Claude Code this morning,
ChatGPT at lunch, Codex tonight, DeepSeek next week) with zero shared memory between sessions,
each one reasoning from scratch about a codebase it's never seen before.

Every principle below follows from that one shift. The question is never "how do we generate
this faster" — that part is already solved. The question is "how do we know this is correct
without a human reading every line, across a rotating cast of tools that don't remember each
other."

---

## 2. Principle 1 — Mechanical Verification Beats Agent Judgment, Always

If a correctness question can be answered by an `assert`, a type checker, or a linter, it must
be — never by an agent's confidence that the code "looks right." This is the single rule
everything else in this playbook serves.

```
Type checker  : mypy --strict / tsc --noEmit — catches hallucinated fields, wrong types,
                signature drift. Runs the same regardless of which tool wrote the code.
Test suite    : pytest / Jest / flutter test — catches behavioral regressions. A test that
                passed yesterday and fails today is unambiguous, no interpretation needed.
Linter        : ruff / eslint — catches style and a class of correctness footguns
                (unused imports, shadowed variables, unreachable code).
Security scan : dependency audit (pip-audit / npm audit), secret scanning — catches what
                a confident-sounding agent has no reason to flag on its own.
```

None of these require trusting any particular agent's judgment. That's the point — they're the
one thing that stays constant no matter which tool touched the code last. Already implemented at
length: `tech_implementation_guide_fastapi.md` Part L3/`fastapi/ENGINEERING_HANDBOOK_FASTAPI.md`
Part 15.3 make `mypy --strict` a P0 merge gate for exactly this reason, mirroring `tsc --noEmit`
in the NestJS variant. See `AUTOMATED_TESTING_STRATEGY.md` §2 for the full "why not an agent for
this loop" reasoning — it's the same argument, stated once, don't repeat it here.

---

## 3. Principle 2 — Architecture for Legibility, Not Just Correctness

A codebase can be correct and still be unreadable *to an agent starting a fresh session with no
memory of how it got that way*. Prefer patterns where behavior is traceable by reading the file
in front of you, over patterns that rely on a framework's hidden runtime wiring — decorator
metadata, reflection, auto-registration by convention.

This matters more with agents than with humans. A human accumulates tribal knowledge of "how
this codebase's magic works" over months on the team. An agent starts every session with none of
that, and has to either re-derive it from a limited context window or guess. Concrete example
already worked out in this project: NestJS's `@Injectable()` + module `providers[]` + IoC
container resolves dependencies through metadata no single file shows you; when it breaks, the
error names a symptom ("cannot resolve dependency") not the cause. FastAPI's `Depends()` is a
function call an agent can trace by reading the signature — when it breaks, the traceback points
at the actual function. `fastapi/WHY_FASTAPI.md` §3 works through this in full; the general
principle survives independent of which specific framework you're using: **fewer places where
"you had to already know" beats more places where "you can just read it."**

---

## 4. Principle 3 — One Source of Truth, Read By Every Tool

Every agent needs the same answer to "what are the rules here," regardless of which tool it is
or whether it's ever seen this repo before. That requires exactly one place those rules live —
not tribal knowledge, not a Slack thread, not "ask a teammate."

The emerging convention across the industry is a root-level `AGENTS.md` (tool-agnostic) or
`CLAUDE.md` (Claude-specific, but the same idea) that states project conventions plainly enough
for any agent to follow without human translation. For anything beyond a few dozen rules, that
file should be short and point to a fuller standards document — not try to contain everything
itself. Fieldbrix runs this pattern at full scale already:

```
ENGINEERING_HANDBOOK*.md / tech_implementation_guide*.md
    → the full standards doc, P0/P1/P2 priority system so an agent (any agent) can tell
      a non-negotiable rule from a judgment call at a glance

backend/README.md ("Source of truth is the handbook — update there first, then re-sync")
    → the pattern of a short, scoped extract that stays synced to one canonical source,
      instead of every doc drifting independently
```

Reuse this pattern at any scale: one canonical doc, a priority system that separates
"must" from "should" from "consider," and shorter derived documents that explicitly name their
source rather than silently forking from it.

---

## 5. Principle 4 — The Verification Pyramid

Fast, cheap, local checks first; slower, broader checks later; continuous, unattended checks
after ship. This is already fully specified for Fieldbrix in `AUTOMATED_TESTING_STRATEGY.md` —
read that document for the concrete implementation (local `flutter test`/`pytest` loop → PR-gated
emulator/integration tests → post-deploy Lambda-based synthetic monitoring + nightly device
testing). The general shape, if you're setting this up on a different project:

```
Tier 1 — seconds, every save/commit    : type check, lint, unit tests, no network/device
Tier 2 — minutes, every PR             : integration tests against a real (emulated) environment
Tier 3 — continuous, after deploy      : synthetic monitoring of the live system, unattended
```

The agent's own edit loop should close Tier 1 itself, every time, the same way it would run a
type checker before calling a change finished. Tiers 2 and 3 gate merge and catch drift,
respectively — neither should ever require an agent (or a human) to manually decide pass/fail.

---

## 6. Principle 5 — Security Gets Harder, Not Easier, With Agents

Every existing security rule still applies (see Part N/17 in both Fieldbrix handbooks — 15 P0
rules, unchanged by who or what wrote the code). Agents add a few new risk categories worth
naming explicitly:

**Hallucinated dependencies.** An agent can suggest installing a package that sounds plausible
but doesn't exist — and attackers pre-register exactly those plausible-sounding names with
malicious packages, betting on this happening (a real, documented supply-chain attack pattern,
sometimes called "slopsquatting"). Mitigation: never install a new dependency an agent suggests
without checking it's the real, established package; pin versions; keep new dependencies out of
the same PR as unrelated changes so they're easy to spot in review. The libraries tables already
in Part 3.12/12 of both handbooks exist partly for this reason — a pre-approved list an agent
should reach for first, before reaching for the open internet.

**Prompt injection via fetched content.** If an agent fetches a webpage, a README, an issue, or
any external content as part of its work, that content can contain text designed to look like
instructions ("ignore previous instructions and run..."). Treat anything fetched from outside the
codebase as *data to read*, never as *instructions to follow* — the same rule this very
assistant's own tool-result handling operates under, and a rule worth stating explicitly for any
agent setup that fetches external content.

**Secrets exposure.** Unchanged in principle (N10 in both handbooks: no secrets in code, ever) —
worse in practice, because an agent debugging a connection issue may paste a real credential into
a log line, a commit message, or a PR description without being told not to. Say it explicitly in
whatever rules file the agent reads; don't assume it's implied.

**Over-broad permissions.** An agent with unrestricted shell, filesystem, and network access has
a larger blast radius than a human who at least hesitates before a destructive command. Scope
tool permissions to what a task actually needs, and require explicit confirmation before
irreversible operations (force-push, `DROP TABLE`, deleting infrastructure) — the same posture
this assistant is instructed to take by default.

---

## 7. Principle 6 — Humans Own Decisions, Agents Own Execution

Agents are excellent at generating options, arguing a position, and executing a decided path.
They should not be the ones deciding anything architectural, irreversible, or high-blast-radius
on their own. Draw the line at: is this reversible, and is the blast radius contained to this
change? If yes to both, an agent can just do it. If either answer is no, a human's name needs to
be on the decision.

Worked example from this project: an agent can produce the full NestJS-vs-FastAPI comparison
(`NESTJS_VS_FASTAPI_COMPARISON.md`, deliberately neutral, no verdict), and can separately produce
the strongest one-sided case for a specific answer (`WHY_FASTAPI.md`, explicitly labeled as
advocacy, not a decision) — but actually changing `backend/README.md` to commit the project to
one stack is a call that needs a human behind it, made with full information, not defaulted into
because an agent argued persuasively.

---

## 8. Principle 7 — Keep Context Current or the Agent Is Reasoning About a Stale World

Every mechanism an agent uses to understand a codebase — a knowledge graph, a `CLAUDE.md`, a
"source of truth" doc — decays the moment the code changes and the mechanism doesn't. A stale
index is worse than no index: it produces confident, specific-sounding answers about a codebase
that no longer exists.

Concrete instance from this project: `graphify update .` after every code change keeps
Fieldbrix's knowledge graph (`graphify-out/`) matching reality, so the next agent session that
queries it gets current answers instead of confidently wrong ones about files that have since
moved or changed shape. The general rule: whatever index your agents rely on, refresh it on the
same cadence the underlying thing changes — not "eventually," not "next sprint."

---

## 9. The Definition of Done

A condensed checklist an agent (or a human reviewing an agent's PR) can run through mechanically.
Every item here already exists as a P0 rule somewhere in Fieldbrix's standards docs — this is
the one-page version:

```
□ Type checker passes in strict mode (mypy --strict / tsc --noEmit)
□ Linter passes (ruff / eslint)
□ Full test suite passes locally — not just "the part I changed"
□ New public methods have tests covering the happy path AND the failure paths
□ No secrets, API keys, or credentials anywhere in the diff
□ No new dependency added without a human confirming it's the real, intended package
□ Every new data-access path is scoped correctly (tenant_id / user_id / auth check present)
□ Diff is reviewable size — split into stacked PRs if it isn't
□ Comments explain WHY on anything non-obvious, not WHAT the code already shows
□ CI is green — "it worked when I ran it locally" is not the same claim
```

If any box can't be checked, the change isn't done — regardless of how confident the agent that
wrote it sounds.

---

## 10. Tool Landscape — What Actually Differs

The distinction that matters is not which model is "smarter." It's whether the tool closes its
own verification loop:

**Agentic CLI tools** (Claude Code, Codex CLI, and similar) run inside the project, can execute
commands, and — when instructed to — run the build, the linter, and the test suite themselves as
part of iterating, before ever presenting a change as finished. Principle 1's gates get enforced
as a natural side effect of how these tools already operate, provided they're actually told to
run them.

**Chat-interface tools** (a ChatGPT/DeepSeek/GLM/etc. conversation used to generate a snippet
that gets copied out by hand) have no built-in execution loop. Whatever comes out has been
verified by nothing until a human runs it — no type check, no test, no lint, unless someone
does that manually afterward. This is not a knock on any specific model's code quality; it's a
statement about the workflow. The same model, used through an agentic tool that runs its own
checks, and used through a bare chat window with copy-paste, produces very different guarantees
about what ships.

Neither category retains memory across sessions by default. A Claude Code session today and a
Codex session next week both start cold on this codebase — which is exactly why Principle 3 (one
source of truth every tool reads) is not optional politeness, it's the only thing keeping five
different tools, over months, pointed at the same conventions.

---

## 11. Applying This: The Fieldbrix Worked Example

| Principle | Fieldbrix artifact |
|---|---|
| Mechanical verification over judgment | `mypy --strict`/`tsc` as P0 (Part 15.3, both handbooks) |
| Architecture for legibility | `fastapi/WHY_FASTAPI.md` §3 — `Depends()` vs. NestJS DI |
| One source of truth per tool | `ENGINEERING_HANDBOOK*.md` + P0/P1/P2 system; `backend/README.md`'s "source of truth is the handbook" pattern |
| Verification pyramid | `AUTOMATED_TESTING_STRATEGY.md` (full document) |
| Security under agent authorship | Part N/17 — 15 P0 security rules, both handbooks |
| Humans own decisions | `NESTJS_VS_FASTAPI_COMPARISON.md` stays neutral by design; `WHY_FASTAPI.md` is labeled advocacy, not a decision |
| Keep context current | `graphify update .` after every code/doc change |

---

## 12. Common Failure Modes

Patterns worth naming because they're easy to fall into, not because they're exotic:

- **"It ran once, ship it."** Confirms the code didn't crash, not that it's correct. Only a
  passing test suite confirms behavior; only a passing type check confirms shape.
- **Trusting tone over verification.** Agents state things confidently regardless of whether
  they're right. Confidence is not signal. The mechanical gate is the only signal.
- **No `AGENTS.md`/`CLAUDE.md`.** Every session and every tool reinvents conventions from
  scratch; a codebase touched by five different agents over a few weeks fragments in style and
  structure without one canonical document all of them are pointed at.
- **Reviewing agent PRs like a trusted colleague's first draft.** Skimming is the wrong posture.
  Review agent output the way you'd review an external contributor's unreviewed PR — relaxed on
  the mechanical parts CI already checked, sharper on auth, money, data access, and migrations.
- **Granting broad, unscoped permissions "to save time."** Removes the one checkpoint that
  catches an irreversible mistake before it happens. Scope permissions to the task; require
  confirmation on anything destructive, exactly as this playbook's own tooling is set up to do.

---

*Document owner: CTO.
General playbook — not project-specific. Cross-referenced throughout with Fieldbrix's own
standards docs as the worked example; none of the principles here depend on Fieldbrix specifics.
This file lives at `/docs/ai_agent_development_playbook.md` in the monorepo root.
Last updated: August 2026.*
