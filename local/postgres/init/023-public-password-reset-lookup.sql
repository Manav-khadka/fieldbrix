-- Sprint 03 public reset-token lookup for restart-safe password resets.
CREATE OR REPLACE FUNCTION fieldbrix_find_password_reset(p_token_hash TEXT)
RETURNS TABLE (
  user_id UUID,
  tenant_id UUID,
  email CITEXT,
  display_name TEXT,
  password_hash TEXT,
  active BOOLEAN,
  expires_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.tenant_id, u.email, u.display_name, u.password_hash, u.active,
         r.expires_at, r.consumed_at
  FROM password_reset_tokens r
  JOIN users u ON u.id = r.user_id AND u.tenant_id = r.tenant_id
  WHERE r.token_hash = p_token_hash;
$$;

REVOKE ALL ON FUNCTION fieldbrix_find_password_reset(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fieldbrix_find_password_reset(TEXT) TO fieldbrix_runtime;
