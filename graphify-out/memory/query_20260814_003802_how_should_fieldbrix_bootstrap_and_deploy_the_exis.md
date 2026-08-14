---
type: "query"
date: "2026-08-14T00:38:02.622372+00:00"
question: "How should FieldBrix bootstrap and deploy the existing Vite React frontend, NestJS backend, PostgreSQL database, and a reversible Terraform create/destroy pipeline before Sprint 1?"
contributor: "graphify"
source_nodes: ["Deployment", "bootstrap()"]
---

# Q: How should FieldBrix bootstrap and deploy the existing Vite React frontend, NestJS backend, PostgreSQL database, and a reversible Terraform create/destroy pipeline before Sprint 1?

## Answer

Use a separate disposable bootstrap environment for the Vite React smoke page, NestJS health API, and PostgreSQL connectivity. Keep Terraform provisioning separate from application build and deployment. The existing NestJS bootstrap is present, but the current production Terraform is protected and the current user-data explicitly leaves application deployment for GitHub Actions or manual SSH, so it cannot satisfy a full reversible bootstrap workflow without an environment-specific redesign.

## Source Nodes

- Deployment
- bootstrap()