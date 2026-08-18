-- Sprint 11: Bulk work, recurrence plans, scheduling and notifications
CREATE TABLE IF NOT EXISTS recurrence_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  cron_expression text,
  frequency text NOT NULL DEFAULT 'WEEKLY' CHECK (frequency IN ('DAILY', 'WEEKDAY', 'WEEKLY', 'MONTHLY', 'CUSTOM')),
  interval_count integer NOT NULL DEFAULT 1,
  lookahead_days integer NOT NULL DEFAULT 14,
  customer_id uuid NOT NULL,
  site_id uuid NOT NULL,
  target_id uuid,
  workflow_version_id uuid NOT NULL,
  default_assignee_id uuid REFERENCES users(id),
  default_team_id uuid REFERENCES teams(id),
  lead boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'NORMAL',
  instructions text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL,
  end_date date,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, customer_id) REFERENCES master_customers(tenant_id, id),
  FOREIGN KEY (tenant_id, site_id) REFERENCES master_sites(tenant_id, id),
  FOREIGN KEY (tenant_id, workflow_version_id) REFERENCES workflow_versions(tenant_id, id),
  UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS recurrence_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  recurrence_id uuid NOT NULL REFERENCES recurrence_plans(id),
  occurrence_date date NOT NULL,
  action text NOT NULL CHECK (action IN ('SKIP', 'RESCHEDULE')),
  new_task_id uuid REFERENCES tasks(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, recurrence_id, occurrence_date)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  recipient_user_id uuid NOT NULL REFERENCES users(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recurrence_plans_active_idx ON recurrence_plans (tenant_id, active, start_date);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (tenant_id, recipient_user_id, created_at DESC) WHERE dismissed_at IS NULL;

ALTER TABLE recurrence_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE recurrence_exceptions FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurrence_plans_tenant_isolation ON recurrence_plans;
CREATE POLICY recurrence_plans_tenant_isolation ON recurrence_plans
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS recurrence_exceptions_tenant_isolation ON recurrence_exceptions;
CREATE POLICY recurrence_exceptions_tenant_isolation ON recurrence_exceptions
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS notifications_tenant_isolation ON notifications;
CREATE POLICY notifications_tenant_isolation ON notifications
  USING (tenant_id::text = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON recurrence_plans, recurrence_exceptions, notifications TO fieldbrix_runtime, fieldbrix_migrator;
GRANT SELECT ON recurrence_plans, recurrence_exceptions, notifications TO fieldbrix_readonly;
