-- Sprint 10: CreateTaskDto/tasks table had no work type (complaint) field
-- and no per-task signature-policy override — both required by the DOCX
-- task-creation contract. Additive only.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_type text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS signature_policy jsonb;

GRANT SELECT, INSERT, UPDATE ON tasks TO fieldbrix_runtime;
