# ADR-0001: Umbrella repository and service ownership

- Status: Accepted
- Date: 2026-08-14
- Sprint: 01 — Repository and Infrastructure Foundation

## Context

FieldBrix has independently published backend, frontend, and mobile
repositories plus an umbrella repository containing product documents, sprint
evidence, and Terraform. Duplicate working checkouts exist locally, so a path
must not be treated as authoritative merely because it is present on disk.

The implementation guide describes a logical monorepo layout. The current Git
boundary is intentionally a polyrepo: each application must retain independent
history and CI while the umbrella repository records a tested combination.

## Decision

1. The standalone repositories remain the source of truth for application
   code: `fieldbrix-backend`, `fieldbrix-frontend`, and `fieldbrix-mobile`.
2. The umbrella repository integrates them only through the paths declared in
   `.gitmodules`: `apps/backend`, `apps/frontend`, and `apps/mobile`.
3. Application changes are committed and validated in their owning repository.
   The umbrella repository then advances the corresponding gitlink to the
   reviewed commit. Application source is never copied into umbrella history.
4. `terraform/` owns AWS state configuration, reusable modules, operational
   scripts, and infrastructure CI. It follows a standalone-repository layout;
   its GitHub remote/submodule registration must be completed before Sprint 01
   infrastructure CI can be enforced as a required check.
5. The umbrella repository owns cross-repository documentation, sprint plans,
   acceptance evidence, and integration orchestration.
6. Toolchains are pinned by their owning repositories. The initial foundation
   baseline is Node.js 24 with pnpm 10.29.3, Flutter 3.41.7/Dart 3.11.5,
   Python 3.14.5 for operational helpers, and Terraform 1.15.8.

## Ownership

| Boundary | Owner | Required validation |
|---|---|---|
| `fieldbrix-backend` / `apps/backend` | Backend | lint, typecheck, unit, e2e, build |
| `fieldbrix-frontend` / `apps/frontend` | Frontend | lint, typecheck, test, build |
| `fieldbrix-mobile` / `apps/mobile` | Mobile | analyze, test, platform builds |
| `terraform/` | Platform | fmt, offline validate, security scan, reviewed plan |
| umbrella docs and evidence | Platform/QA | link and acceptance-evidence review |

## Consequences

- A root clone becomes reproducible after `git submodule update --init --recursive`.
- Cross-repository atomic commits are not possible; compatibility changes must
  be sequenced and the umbrella gitlinks updated last.
- Local top-level clones such as `fieldbrix-backend/` may be used as publishing
  worktrees, but `.gitmodules` remains the authority for umbrella integration.
- Terraform remote registration is an explicit Sprint 01 blocker, not an
  implicit assumption hidden in local directory structure.
