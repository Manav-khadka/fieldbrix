-- Sprint 14: Offline sync mutations and batch reconciliation
CREATE TABLE IF NOT EXISTS sync_mutations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  device_id text NOT NULL,
  user_id uuid REFERENCES users(id),
  client_mutation_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'REJECTED', 'CONFLICT', 'PENDING')),
  error_details text,
  client_occurred_at timestamptz NOT NULL,
  server_received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_mutation_id)
);

CREATE INDEX IF NOT EXISTS sync_mutations_device_idx ON sync_mutations (tenant_id, device_id, server_received_at DESC);

ALTER TABLE sync_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_mutations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_mutations_tenant_isolation ON sync_mutations;
CREATE POLICY sync_mutations_tenant_isolation ON sync_mutations
  USING (tenant_id::text = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON sync_mutations TO fieldbrix_runtime, fieldbrix_migrator;
GRANT SELECT ON sync_mutations TO fieldbrix_readonly;
