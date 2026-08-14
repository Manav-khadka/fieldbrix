---
type: "query"
date: "2026-08-14T01:10:00.835979+00:00"
question: "How are the FieldBrix React admin, NestJS API, PostgreSQL database, Elastic IP, S3 releases, and Terraform deployment connected?"
contributor: "graphify"
source_nodes: ["docs/terraform/scripts/deploy-apps.sh", "docs/terraform/modules/compute/main.tf", "docs/terraform/modules/compute/user_data.sh.tpl", "docs/terraform/modules/database/main.tf", "fieldbrix-frontend/package.json", "fieldbrix-backend/package.json"]
---

# Q: How are the FieldBrix React admin, NestJS API, PostgreSQL database, Elastic IP, S3 releases, and Terraform deployment connected?

## Answer

Terraform creates a t4g.small EC2 host with Elastic IP 3.6.182.160, private RDS PostgreSQL 18.4, S3 release storage, IAM, SSM, and networking. Nginx routes admin.fieldbrix.com to the compiled React files and api.fieldbrix.com to NestJS on port 3000. deploy-apps.sh builds and tests both apps, uploads versioned artifacts to private S3, and activates them through Systems Manager. The Nest readiness endpoint validates a TLS connection to the private database.

## Source Nodes

- docs/terraform/scripts/deploy-apps.sh
- docs/terraform/modules/compute/main.tf
- docs/terraform/modules/compute/user_data.sh.tpl
- docs/terraform/modules/database/main.tf
- fieldbrix-frontend/package.json
- fieldbrix-backend/package.json