-- Sprint 03: durable workforce identity membership across tenants.
CREATE TABLE IF NOT EXISTS user_tenant_memberships (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (user_id, tenant_id)
);

INSERT INTO user_tenant_memberships (id, user_id, tenant_id)
SELECT gen_random_uuid(), u.id, u.tenant_id
FROM users AS u
ON CONFLICT (user_id, tenant_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS user_tenant_memberships_user_idx
  ON user_tenant_memberships (user_id, active, created_at);

ALTER TABLE user_tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_tenant_memberships_isolation ON user_tenant_memberships;
CREATE POLICY user_tenant_memberships_isolation ON user_tenant_memberships
  USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE OR REPLACE FUNCTION fieldbrix_lookup_user_membership(p_membership_id UUID, p_user_id UUID)
RETURNS TABLE (membership_id UUID, tenant_id UUID, active BOOLEAN)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.tenant_id, m.active
  FROM user_tenant_memberships AS m
  WHERE m.id = p_membership_id AND m.user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION fieldbrix_lookup_user_membership(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fieldbrix_lookup_user_membership(UUID, UUID) TO fieldbrix_runtime;
CREATE OR REPLACE FUNCTION fieldbrix_list_user_memberships(p_user_id UUID)
RETURNS TABLE (membership_id UUID, tenant_id UUID, tenant_name TEXT, tenant_status TEXT, timezone TEXT, active BOOLEAN)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.tenant_id, t.name, t.status, t.timezone, m.active
  FROM user_tenant_memberships AS m
  JOIN tenants AS t ON t.id = m.tenant_id
  WHERE m.user_id = p_user_id
  ORDER BY t.name;
$$;

REVOKE ALL ON FUNCTION fieldbrix_list_user_memberships(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fieldbrix_list_user_memberships(UUID) TO fieldbrix_runtime;
GRANT SELECT, INSERT, UPDATE ON user_tenant_memberships TO fieldbrix_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_tenant_memberships TO fieldbrix_migrator;
GRANT SELECT ON user_tenant_memberships TO fieldbrix_readonly;
