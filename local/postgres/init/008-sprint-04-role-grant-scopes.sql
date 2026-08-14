-- Sprint 04 authorization delta: persist the effective scope of each role grant.
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS grant_scope TEXT NOT NULL DEFAULT 'all';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_grant_scope_check'
  ) THEN
    ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_grant_scope_check
      CHECK (grant_scope IN ('own', 'team', 'branch', 'all'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS role_permissions_scope_idx ON role_permissions (role_id, grant_scope, permission_key);
