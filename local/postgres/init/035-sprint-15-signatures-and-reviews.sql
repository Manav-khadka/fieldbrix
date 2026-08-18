-- Sprint 15: Customer confirmations, signatures, and supervisor reviews
CREATE TABLE IF NOT EXISTS customer_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  task_id uuid NOT NULL,
  run_id uuid,
  status text NOT NULL DEFAULT 'SIGNED' CHECK (status IN ('SIGNED', 'REFUSED', 'UNAVAILABLE')),
  signer_name text,
  signer_designation text,
  summary_hash text NOT NULL,
  signature_upload_id text,
  refusal_reason text,
  worker_declaration boolean NOT NULL DEFAULT true,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id),
  UNIQUE (tenant_id, task_id)
);

CREATE TABLE IF NOT EXISTS task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  task_id uuid NOT NULL,
  reviewer_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('APPROVED', 'CORRECTION_REQUIRED', 'REJECTED')),
  exception_decisions jsonb NOT NULL DEFAULT '{}'::jsonb,
  comments text,
  follow_up_task_id uuid REFERENCES tasks(id),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id)
);

ALTER TABLE customer_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE customer_confirmations FORCE ROW LEVEL SECURITY;
ALTER TABLE task_reviews FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_confirmations_tenant_isolation ON customer_confirmations;
CREATE POLICY customer_confirmations_tenant_isolation ON customer_confirmations
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS task_reviews_tenant_isolation ON task_reviews;
CREATE POLICY task_reviews_tenant_isolation ON task_reviews
  USING (tenant_id::text = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON customer_confirmations, task_reviews TO fieldbrix_runtime, fieldbrix_migrator;
GRANT SELECT ON customer_confirmations, task_reviews TO fieldbrix_readonly;
