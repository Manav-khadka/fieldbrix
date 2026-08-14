# ADR-0001: Single repository and service ownership

- Status: Accepted
- Date: 2026-08-14
- Sprint: 01 — Repository and Infrastructure Foundation

## Context

FieldBrix previously had independently published application repositories and
an umbrella repository. That created duplicate checkouts and made it possible
for CI to validate a different copy from the one a developer edited.

The implementation guide describes a logical monorepo layout. A single Git
repository makes that layout concrete and ensures one commit represents the
whole compatible platform.

## Decision

1. The root `fieldbrix` repository is the only Git repository used for normal
   development and deployment.
2. Application source is tracked directly at `fieldbrix-backend/`,
   `fieldbrix-frontend/`, and `fieldbrix_app/`. No nested `.git` directories,
   Git submodules, or `apps/` integration copies are allowed.
3. `terraform/` owns AWS state configuration, reusable modules, operational
   scripts, and infrastructure CI inside the same root repository.
4. The root repository owns application CI, documentation, sprint evidence,
   integration orchestration, and deployment manifests.
5. Toolchains are pinned by their owning application directories. The initial
   foundation baseline is Node.js 24 with pnpm 10.29.3, Flutter 3.41.7/Dart
   3.11.5, Python 3.14.5 for operational helpers, and Terraform 1.15.8.

## Ownership

| Boundary | Owner | Required validation |
|---|---|---|
| `fieldbrix-backend/` | Backend | lint, typecheck, unit, e2e, build |
| `fieldbrix-frontend/` | Frontend | lint, typecheck, test, build |
| `fieldbrix_app/` | Mobile | analyze, test, platform builds |
| `terraform/` | Platform | fmt, offline validate, security scan, reviewed plan |
| root docs and evidence | Platform/QA | link and acceptance-evidence review |

## Consequences

- A root clone contains all application and infrastructure source needed for
  local development and CI.
- Platform changes can be committed atomically and reviewed as one release.
- Former standalone histories are preserved outside the working tree as
  migration backups; the root repository is authoritative going forward.
