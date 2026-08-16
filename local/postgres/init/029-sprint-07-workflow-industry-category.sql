-- Sprint 07: WorkflowDraftRepository.create/list/findById reference
-- industry/category columns that were never added to workflow_drafts,
-- making POST /workflows and GET /workflows/:id fail with a 500
-- ("column industry of relation workflow_drafts does not exist").
-- Additive only, matches the migration rules (no destructive drop).
ALTER TABLE workflow_drafts ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE workflow_drafts ADD COLUMN IF NOT EXISTS category text;

-- workflow_templates was created via `LIKE workflow_drafts` in 026, which
-- only clones structure at CREATE TABLE time — it does not retroactively
-- pick up columns added to workflow_drafts afterwards.
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS category text;

GRANT SELECT, INSERT, UPDATE ON workflow_drafts, workflow_templates TO fieldbrix_runtime;
