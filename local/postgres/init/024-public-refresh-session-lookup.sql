-- Sprint 03 restart-safe refresh-token lookup.
CREATE OR REPLACE FUNCTION fieldbrix_find_refresh_session(p_token_hash TEXT)
RETURNS TABLE (
  user_id UUID,
  tenant_id UUID,
  email CITEXT,
  display_name TEXT,
  password_hash TEXT,
  active BOOLEAN,
  family_id UUID,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id, s.tenant_id, u.email, u.display_name, u.password_hash,
         u.active, s.family_id, s.expires_at, s.revoked_at
  FROM sessions s
  JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
  WHERE s.token_hash = p_token_hash
    AND s.token_type = 'refresh';
$$;

REVOKE ALL ON FUNCTION fieldbrix_find_refresh_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fieldbrix_find_refresh_session(TEXT) TO fieldbrix_runtime;
