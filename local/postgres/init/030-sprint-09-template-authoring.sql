-- Sprint 09: workflow_templates was cloned from workflow_drafts via
-- `LIKE ... INCLUDING DEFAULTS`, which carried over a NOT NULL tenant_id.
-- Templates are platform-owned catalogue rows, not tenant-owned records —
-- a mandatory tenant_id makes platform-authored templates impossible to
-- represent correctly. Relax the constraint; existing rows (there are
-- none seeded yet) are unaffected.
ALTER TABLE workflow_templates ALTER COLUMN tenant_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS workflow_templates_active_idx
  ON workflow_templates (name) WHERE archived_at IS NULL;
