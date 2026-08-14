# FieldBrix

This repository is the umbrella project for the FieldBrix platform.

## Integrated repositories

The umbrella repository pins application repositories as Git submodules:

- Backend: `apps/backend` → `fieldbrix-backend`
- Frontend: `apps/frontend` → `fieldbrix-frontend`
- Mobile: `apps/mobile` → `fieldbrix-mobile` (local project name: `fieldbrix_app`)
- Infrastructure: `terraform/` (standalone-repository layout; remote registration is tracked in ADR-0001)

Initialize the application checkouts after cloning:

```bash
git submodule update --init --recursive
```

## Notes
- Each application keeps its own repository, history, lockfile, and CI/CD pipeline.
- The umbrella repo owns project-level plans, shared documentation, integration
  evidence, and the exact application revisions used together.
- Do not copy application source into the umbrella history. Commit in the
  application repository first, then update its submodule pointer here.

See [`docs/adr/0001-repository-topology.md`](docs/adr/0001-repository-topology.md)
for the binding Sprint 01 repository contract.
