-- Sprint 06–10 security, import execution, and event contracts.
CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), entity_type text NOT NULL,
  source_file_id uuid, source_checksum text, status text NOT NULL DEFAULT 'PREVIEWED', preview_revision integer NOT NULL DEFAULT 1,
  total_rows integer NOT NULL DEFAULT 0, valid_rows integer NOT NULL DEFAULT 0, error_rows integer NOT NULL DEFAULT 0,
  duplicate_mode text NOT NULL DEFAULT 'reject' CHECK (duplicate_mode IN ('reject','skip','update')),
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS import_row_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), import_id uuid NOT NULL REFERENCES import_jobs(id),
  row_number integer NOT NULL, status text NOT NULL, error_code text, message text, entity_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, row_number)
);
CREATE TABLE IF NOT EXISTS task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), task_id uuid NOT NULL REFERENCES tasks(id),
  upload_id uuid, category text NOT NULL, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workflow_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), workflow_id uuid NOT NULL REFERENCES workflow_drafts(id),
  name text NOT NULL, answers jsonb NOT NULL DEFAULT '{}'::jsonb, expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE workflow_drafts DROP CONSTRAINT IF EXISTS workflow_drafts_current_version_fk;
ALTER TABLE workflow_drafts ADD CONSTRAINT workflow_drafts_current_version_fk FOREIGN KEY (tenant_id, current_version_id) REFERENCES workflow_versions(tenant_id, id);
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_workflow_version_fk;
ALTER TABLE tasks ADD CONSTRAINT tasks_workflow_version_fk FOREIGN KEY (tenant_id, workflow_version_id) REFERENCES workflow_versions(tenant_id, id);
ALTER TABLE task_attachments DROP CONSTRAINT IF EXISTS task_attachments_upload_fk;
ALTER TABLE task_attachments ADD CONSTRAINT task_attachments_upload_fk FOREIGN KEY (upload_id) REFERENCES files(id);
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_target_fk;
ALTER TABLE tasks ADD CONSTRAINT tasks_target_fk FOREIGN KEY (tenant_id, target_id) REFERENCES master_service_targets(tenant_id, id);
ALTER TABLE import_row_outcomes ADD COLUMN IF NOT EXISTS row_data jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS master_customers_tenant_lower_code_idx ON master_customers (tenant_id, lower(code));
CREATE UNIQUE INDEX IF NOT EXISTS master_sites_tenant_lower_code_idx ON master_sites (tenant_id, lower(code));
CREATE UNIQUE INDEX IF NOT EXISTS master_service_targets_tenant_lower_code_idx ON master_service_targets (tenant_id, lower(code));
CREATE UNIQUE INDEX IF NOT EXISTS master_parts_tenant_lower_code_idx ON master_parts (tenant_id, lower(code));
CREATE INDEX IF NOT EXISTS import_jobs_status_idx ON import_jobs (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS import_row_outcomes_job_idx ON import_row_outcomes (tenant_id, import_id, row_number);
CREATE INDEX IF NOT EXISTS workflow_simulations_workflow_idx ON workflow_simulations (tenant_id, workflow_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS task_one_active_lead_idx ON task_assignments (tenant_id, task_id) WHERE ended_at IS NULL AND lead = true;

ALTER TABLE master_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_service_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_row_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_customers FORCE ROW LEVEL SECURITY;
ALTER TABLE master_sites FORCE ROW LEVEL SECURITY;
ALTER TABLE master_service_targets FORCE ROW LEVEL SECURITY;
ALTER TABLE master_parts FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE task_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE task_history FORCE ROW LEVEL SECURITY;
ALTER TABLE task_attachments FORCE ROW LEVEL SECURITY;
ALTER TABLE import_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE import_row_outcomes FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_simulations FORCE ROW LEVEL SECURITY;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['master_customers','master_sites','master_service_targets','master_parts','workflow_drafts','workflow_versions','tasks','task_assignments','task_history','task_attachments','import_jobs','import_row_outcomes','workflow_simulations'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON %I', table_name, table_name);
    EXECUTE format('CREATE POLICY %I_tenant_isolation ON %I USING (tenant_id::text = current_setting(''app.tenant_id'', true)) WITH CHECK (tenant_id::text = current_setting(''app.tenant_id'', true))', table_name, table_name);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON master_customers, master_sites, master_service_targets, master_parts, workflow_drafts, tasks, task_assignments, task_history, task_attachments, import_jobs, import_row_outcomes, workflow_simulations TO fieldbrix_runtime;
GRANT SELECT ON workflow_versions TO fieldbrix_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON master_customers, master_sites, master_service_targets, master_parts, workflow_drafts, workflow_versions, tasks, task_assignments, task_history, task_attachments, import_jobs, import_row_outcomes, workflow_simulations TO fieldbrix_migrator;
GRANT SELECT ON master_customers, master_sites, master_service_targets, master_parts, workflow_drafts, workflow_versions, tasks, task_assignments, task_history, task_attachments, import_jobs, import_row_outcomes, workflow_simulations TO fieldbrix_readonly;
GRANT USAGE, SELECT ON SEQUENCE task_number_sequence TO fieldbrix_runtime, fieldbrix_migrator;

INSERT INTO permissions (key, module, resource, action, scope) VALUES
  ('master.customers.view','master','customers','view',ARRAY['all']), ('master.customers.create','master','customers','create',ARRAY['all']), ('master.customers.edit','master','customers','edit',ARRAY['all']),
  ('master.sites.view','master','sites','view',ARRAY['all']), ('master.sites.create','master','sites','create',ARRAY['all']), ('master.sites.edit','master','sites','edit',ARRAY['all']),
  ('master.targets.view','master','targets','view',ARRAY['all']), ('master.targets.create','master','targets','create',ARRAY['all']), ('master.targets.edit','master','targets','edit',ARRAY['all']),
  ('master.parts.view','master','parts','view',ARRAY['all']), ('master.parts.create','master','parts','create',ARRAY['all']), ('master.parts.edit','master','parts','edit',ARRAY['all']),
  ('master.imports.view','master','imports','view',ARRAY['all']), ('master.imports.create','master','imports','create',ARRAY['all']), ('master.imports.commit','master','imports','commit',ARRAY['all']),
  ('workflows.view','workflows','workflows','view',ARRAY['all']), ('workflows.create','workflows','workflows','create',ARRAY['all']), ('workflows.edit','workflows','workflows','edit',ARRAY['all']), ('workflows.publish','workflows','workflows','publish',ARRAY['all']), ('workflows.archive','workflows','workflows','archive',ARRAY['all']),
  ('tasks.view','tasks','tasks','view',ARRAY['all']), ('tasks.create','tasks','tasks','create',ARRAY['all']), ('tasks.edit','tasks','tasks','edit',ARRAY['all']), ('tasks.assign','tasks','tasks','assign',ARRAY['all']), ('tasks.cancel','tasks','tasks','cancel',ARRAY['all']), ('tasks.reopen','tasks','tasks','reopen',ARRAY['all']), ('tasks.request_action','tasks','tasks','request_action',ARRAY['own','team']), ('tasks.history.view','tasks','history','view',ARRAY['all'])
ON CONFLICT (key) DO UPDATE SET module = EXCLUDED.module, resource = EXCLUDED.resource, action = EXCLUDED.action, scope = EXCLUDED.scope;
UPDATE role_presets SET grants = grants || ARRAY['master.customers.view','master.customers.create','master.customers.edit','master.sites.view','master.sites.create','master.sites.edit','master.targets.view','master.targets.create','master.targets.edit','master.parts.view','master.parts.create','master.parts.edit','master.imports.view','master.imports.create','master.imports.commit','workflows.view','workflows.create','workflows.edit','workflows.publish','workflows.archive','tasks.view','tasks.create','tasks.edit','tasks.assign','tasks.cancel','tasks.reopen','tasks.request_action','tasks.history.view'] WHERE key = 'company_admin';
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key FROM roles r JOIN role_presets rp ON rp.key = r.preset_source JOIN permissions p ON p.key = ANY(rp.grants)
ON CONFLICT DO NOTHING;
