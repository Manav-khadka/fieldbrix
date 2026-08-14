---
type: "query"
date: "2026-08-14T01:30:35.067847+00:00"
question: "Why does the Terraform language server think prod/main.tf uses old module inputs such as admin_cidr, ssh_public_key_path, rds_endpoint, and sqs_queue_arns while the current module variables use private_subnet_cidr_b, engine_version, protect_database, and TLS inputs?"
contributor: "graphify"
source_nodes: ["module"]
---

# Q: Why does the Terraform language server think prod/main.tf uses old module inputs such as admin_cidr, ssh_public_key_path, rds_endpoint, and sqs_queue_arns while the current module variables use private_subnet_cidr_b, engine_version, protect_database, and TLS inputs?

## Answer

The scoped graph returned only unrelated frontend module nodes, so it does not contain enough evidence to diagnose these Terraform language-server diagnostics.

## Source Nodes

- module