-- Sprint 02 durable outbox and worker-attempt metadata.
CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_version INTEGER NOT NULL CHECK (event_version > 0),
  tenant_id UUID REFERENCES tenants(id),
  actor_id UUID REFERENCES users(id),
  correlation_id TEXT,
  idempotency_key TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PUBLISHED','RETRY','DEAD_LETTERED')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  published_at TIMESTAMPTZ,
  last_error TEXT,
  dead_lettered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS worker_job_attempts (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES outbox_events(event_id),
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  status TEXT NOT NULL CHECK (status IN ('STARTED','SUCCEEDED','FAILED','DEAD_LETTERED')),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  finished_at TIMESTAMPTZ,
  UNIQUE (event_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox_events (status, available_at, created_at) WHERE status IN ('PENDING','RETRY');
CREATE INDEX IF NOT EXISTS outbox_tenant_idx ON outbox_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS worker_attempt_event_idx ON worker_job_attempts (event_id, attempt_number DESC);

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_job_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;
ALTER TABLE worker_job_attempts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outbox_tenant_isolation ON outbox_events;
CREATE POLICY outbox_tenant_isolation ON outbox_events
  USING (tenant_id IS NULL OR tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS worker_attempt_tenant_isolation ON worker_job_attempts;
CREATE POLICY worker_attempt_tenant_isolation ON worker_job_attempts
  USING (EXISTS (SELECT 1 FROM outbox_events WHERE outbox_events.event_id = worker_job_attempts.event_id));
