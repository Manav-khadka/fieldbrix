-- Sprint 06–10 durable domain model. Tenant predicates follow the existing RLS setup.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SEQUENCE IF NOT EXISTS task_number_sequence START WITH 1000;

CREATE TABLE IF NOT EXISTS master_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, code text NOT NULL, name text NOT NULL,
  contact_name text, email text, phone text, address jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code)
);
CREATE TABLE IF NOT EXISTS master_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, customer_id uuid NOT NULL, code text NOT NULL, name text NOT NULL,
  address jsonb NOT NULL DEFAULT '{}'::jsonb, gps jsonb, geofence jsonb, access_notes text, hours jsonb, safety_notes text,
  archived_at timestamptz, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code), FOREIGN KEY (tenant_id, customer_id) REFERENCES master_customers(tenant_id, id)
);
CREATE TABLE IF NOT EXISTS master_service_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, site_id uuid NOT NULL, code text NOT NULL, name text NOT NULL,
  qr_identity text NOT NULL, equipment_type text, location text, warranty jsonb, coverage jsonb, condition text, next_due date, evidence jsonb,
  archived_at timestamptz, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code), UNIQUE (tenant_id, qr_identity), FOREIGN KEY (tenant_id, site_id) REFERENCES master_sites(tenant_id, id)
);
CREATE TABLE IF NOT EXISTS master_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, code text NOT NULL, name text NOT NULL, compatibility jsonb NOT NULL DEFAULT '[]'::jsonb,
  unit text NOT NULL, active boolean NOT NULL DEFAULT true, archived_at timestamptz, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS master_customers_search_idx ON master_customers USING gin ((lower(name)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS master_sites_customer_idx ON master_sites (tenant_id, customer_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS workflow_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, name text NOT NULL, description text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'DRAFT',
  revision integer NOT NULL DEFAULT 1, schema jsonb NOT NULL DEFAULT '{}'::jsonb, current_version_id uuid, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (tenant_id, id)
);
CREATE TABLE IF NOT EXISTS workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, workflow_id uuid NOT NULL, version integer NOT NULL, content_hash text NOT NULL, snapshot jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(), UNIQUE (tenant_id, id), UNIQUE (tenant_id, workflow_id, version), FOREIGN KEY (tenant_id, workflow_id) REFERENCES workflow_drafts(tenant_id, id)
);
CREATE OR REPLACE FUNCTION prevent_published_version_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'IMMUTABLE_WORKFLOW_VERSION'; END; $$;
DROP TRIGGER IF EXISTS workflow_versions_immutable_update ON workflow_versions;
CREATE TRIGGER workflow_versions_immutable_update BEFORE UPDATE OR DELETE ON workflow_versions FOR EACH ROW EXECUTE FUNCTION prevent_published_version_mutation();
CREATE TABLE IF NOT EXISTS workflow_templates (LIKE workflow_drafts INCLUDING DEFAULTS);
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, task_number text NOT NULL, workflow_version_id uuid NOT NULL, customer_id uuid NOT NULL, site_id uuid NOT NULL, target_id uuid,
  status text NOT NULL DEFAULT 'DRAFT', flags jsonb NOT NULL DEFAULT '[]'::jsonb, priority text NOT NULL DEFAULT 'NORMAL', description text NOT NULL DEFAULT '', instructions text NOT NULL DEFAULT '', scheduled_at timestamptz, due_at timestamptz, estimated_minutes integer,
  revision integer NOT NULL DEFAULT 1, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (tenant_id, id), UNIQUE (tenant_id, task_number), FOREIGN KEY (tenant_id, customer_id) REFERENCES master_customers(tenant_id, id), FOREIGN KEY (tenant_id, site_id) REFERENCES master_sites(tenant_id, id)
);
CREATE TABLE IF NOT EXISTS task_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, task_id uuid NOT NULL, worker_id uuid, team_id uuid, lead boolean NOT NULL DEFAULT false, reason text, started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz, FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id));
CREATE TABLE IF NOT EXISTS task_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, task_id uuid NOT NULL, event_type text NOT NULL, before_state jsonb, after_state jsonb, reason text, actor_id uuid, occurred_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY (tenant_id, task_id) REFERENCES tasks(tenant_id, id));
CREATE INDEX IF NOT EXISTS tasks_status_schedule_idx ON tasks (tenant_id, status, scheduled_at) WHERE archived_at IS NULL;
