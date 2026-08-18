-- Sprint 13: Mobile execution, task runs, answers, evidence, and parts used
CREATE TABLE IF NOT EXISTS task_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  task_id uuid NOT NULL,
  worker_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'STARTED' CHECK (status IN ('STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABORTED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  paused_at timestamptz,
  check_in_gps jsonb,
  check_out_gps jsonb,
  target_match_status text DEFAULT 'UNVERIFIED',
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id),
  UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS task_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  run_id uuid NOT NULL,
  section_id text NOT NULL,
  field_key text NOT NULL,
  value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_outcome text NOT NULL DEFAULT 'VALID',
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, run_id) REFERENCES task_runs(tenant_id, id),
  UNIQUE (tenant_id, run_id, field_key)
);

CREATE TABLE IF NOT EXISTS evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  run_id uuid,
  task_id uuid,
  upload_id text NOT NULL,
  category text NOT NULL DEFAULT 'PHOTO',
  checksum text,
  geo_location jsonb,
  captured_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parts_used (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  run_id uuid NOT NULL,
  part_id uuid,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'UNIT',
  old_part_returned boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, run_id) REFERENCES task_runs(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS target_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  site_id uuid NOT NULL,
  qr_identity text NOT NULL,
  equipment_name text NOT NULL,
  equipment_type text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requested_by uuid REFERENCES users(id),
  decided_by uuid REFERENCES users(id),
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  FOREIGN KEY (tenant_id, site_id) REFERENCES master_sites(tenant_id, id)
);

ALTER TABLE task_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_registration_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE task_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE task_answers FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_files FORCE ROW LEVEL SECURITY;
ALTER TABLE parts_used FORCE ROW LEVEL SECURITY;
ALTER TABLE target_registration_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_runs_tenant_isolation ON task_runs;
CREATE POLICY task_runs_tenant_isolation ON task_runs
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS task_answers_tenant_isolation ON task_answers;
CREATE POLICY task_answers_tenant_isolation ON task_answers
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS evidence_files_tenant_isolation ON evidence_files;
CREATE POLICY evidence_files_tenant_isolation ON evidence_files
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS parts_used_tenant_isolation ON parts_used;
CREATE POLICY parts_used_tenant_isolation ON parts_used
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS target_registration_requests_tenant_isolation ON target_registration_requests;
CREATE POLICY target_registration_requests_tenant_isolation ON target_registration_requests
  USING (tenant_id::text = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON task_runs, task_answers, evidence_files, parts_used, target_registration_requests TO fieldbrix_runtime, fieldbrix_migrator;
GRANT SELECT ON task_runs, task_answers, evidence_files, parts_used, target_registration_requests TO fieldbrix_readonly;
