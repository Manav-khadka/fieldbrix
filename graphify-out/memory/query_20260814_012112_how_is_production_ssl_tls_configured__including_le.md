---
type: "query"
date: "2026-08-14T01:21:12.220559+00:00"
question: "How is production SSL/TLS configured, including Let's Encrypt certificate issuance, nginx, automatic renewal, and expiry checks?"
contributor: "graphify"
source_nodes: ["Production environment", "code:bash (sudo systemctl list-timers fieldbrix-tls.timer)"]
---

# Q: How is production SSL/TLS configured, including Let's Encrypt certificate issuance, nginx, automatic renewal, and expiry checks?

## Answer

The production environment documents the fieldbrix-tls.timer and its systemctl inspection command, but the scoped graph does not expose enough implementation detail to verify issuance, nginx reloads, or expiry thresholds; those details require the infrastructure source files.

## Source Nodes

- Production environment
- code:bash (sudo systemctl list-timers fieldbrix-tls.timer)