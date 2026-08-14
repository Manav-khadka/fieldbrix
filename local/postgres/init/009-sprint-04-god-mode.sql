-- Sprint 04 platform administrator and two-person destructive approval state.
CREATE TABLE IF NOT EXISTS platform_administrators (
  id UUID PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS god_sessions (
  id UUID PRIMARY KEY,
  platform_admin_id UUID NOT NULL REFERENCES platform_administrators(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
  reauthenticated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  correlation_id TEXT
);

CREATE TABLE IF NOT EXISTS destructive_requests (
  id UUID PRIMARY KEY,
  requester_admin_id UUID NOT NULL REFERENCES platform_administrators(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  payload_hash TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','REJECTED','EXPIRED','EXECUTED','FAILED')),
  approver_admin_id UUID REFERENCES platform_administrators(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  UNIQUE (id, payload_hash)
);

CREATE INDEX IF NOT EXISTS god_sessions_active_idx ON god_sessions (platform_admin_id, tenant_id, expires_at) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS destructive_requests_pending_idx ON destructive_requests (tenant_id, status, expires_at);

CREATE OR REPLACE FUNCTION reject_destructive_payload_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payload_hash <> OLD.payload_hash OR NEW.payload IS DISTINCT FROM OLD.payload
    OR NEW.requester_admin_id <> OLD.requester_admin_id OR NEW.tenant_id <> OLD.tenant_id
    OR NEW.action <> OLD.action OR NEW.target_id <> OLD.target_id THEN
    RAISE EXCEPTION 'DESTRUCTIVE_REQUEST_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS destructive_request_immutable ON destructive_requests;
CREATE TRIGGER destructive_request_immutable
  BEFORE UPDATE ON destructive_requests
  FOR EACH ROW EXECUTE FUNCTION reject_destructive_payload_change();

ALTER TABLE god_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE destructive_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE god_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE destructive_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS god_sessions_tenant_isolation ON god_sessions;
CREATE POLICY god_sessions_tenant_isolation ON god_sessions
  USING (tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS destructive_requests_tenant_isolation ON destructive_requests;
CREATE POLICY destructive_requests_tenant_isolation ON destructive_requests
  USING (tenant_id::text = current_setting('app.tenant_id', true));
