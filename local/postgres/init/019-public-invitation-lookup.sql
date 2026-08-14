-- Sprint 05: allow public invitation acceptance to resolve one opaque token
-- without disabling tenant RLS for normal invitation reads.
CREATE OR REPLACE FUNCTION fieldbrix_lookup_invitation(p_token_hash TEXT)
RETURNS TABLE (tenant_id UUID, email TEXT, expires_at TIMESTAMPTZ, accepted_at TIMESTAMPTZ)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.tenant_id, i.email::TEXT, i.expires_at, i.accepted_at
  FROM invitations AS i
  WHERE i.token_hash = p_token_hash
    AND i.cancelled_at IS NULL;
$$;

REVOKE ALL ON FUNCTION fieldbrix_lookup_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fieldbrix_lookup_invitation(TEXT) TO fieldbrix_runtime;
