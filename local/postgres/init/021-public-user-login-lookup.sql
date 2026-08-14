-- Sprint 03: public login resolves one user by identifier for password verification.
CREATE OR REPLACE FUNCTION fieldbrix_find_user_login(p_identifier TEXT)
RETURNS TABLE (id UUID, email TEXT, name TEXT, password TEXT, tenant_id UUID, active BOOLEAN)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email::TEXT, u.display_name, u.password_hash, u.tenant_id, u.active
  FROM users AS u
  WHERE lower(u.email::TEXT) = lower(p_identifier)
     OR u.id::TEXT = p_identifier
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION fieldbrix_find_user_login(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fieldbrix_find_user_login(TEXT) TO fieldbrix_runtime;
