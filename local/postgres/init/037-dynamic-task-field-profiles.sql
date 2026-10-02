-- Dynamic task vocabulary and grid configuration.
-- A profile belongs to one client + workflow pair: different clients can use
-- the same workflow while calling the work item (and its imported fields)
-- something entirely different.
CREATE TABLE IF NOT EXISTS task_field_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  workflow_id uuid NOT NULL,
  entity_label text NOT NULL DEFAULT 'Task',
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  field_definitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  visible_columns jsonb NOT NULL DEFAULT '["number","externalReferenceId","description","status","priority"]'::jsonb,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, customer_id, workflow_id),
  FOREIGN KEY (tenant_id, customer_id) REFERENCES master_customers(tenant_id, id),
  FOREIGN KEY (tenant_id, workflow_id) REFERENCES workflow_drafts(tenant_id, id),
  CHECK (char_length(trim(entity_label)) BETWEEN 1 AND 40),
  CHECK (jsonb_typeof(column_mapping) = 'object'),
  CHECK (jsonb_typeof(field_definitions) = 'array'),
  CHECK (jsonb_typeof(visible_columns) = 'array')
);

CREATE INDEX IF NOT EXISTS task_field_profiles_customer_workflow_idx
  ON task_field_profiles (tenant_id, customer_id, workflow_id);

-- Older installations briefly enforced task references tenant-wide. Client
-- systems commonly reuse sequences such as WO-1001, so uniqueness belongs to
-- the client context instead.
DROP INDEX IF EXISTS tasks_external_reference_uq;
CREATE UNIQUE INDEX tasks_external_reference_uq
  ON tasks (tenant_id, customer_id, external_reference_id)
  WHERE external_reference_id IS NOT NULL;

-- Equality/key-existence filters use this index. The trigram expression keeps
-- free-text search practical even when a client brings 100 source columns.
CREATE INDEX IF NOT EXISTS tasks_custom_fields_path_idx
  ON tasks USING gin (custom_fields jsonb_path_ops);
CREATE INDEX IF NOT EXISTS tasks_custom_fields_text_search_idx
  ON tasks USING gin ((lower(custom_fields::text)) gin_trgm_ops);

ALTER TABLE task_field_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_field_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS task_field_profiles_tenant_isolation ON task_field_profiles;
CREATE POLICY task_field_profiles_tenant_isolation ON task_field_profiles
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE ON task_field_profiles TO fieldbrix_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_field_profiles TO fieldbrix_migrator;
GRANT SELECT ON task_field_profiles TO fieldbrix_readonly;
