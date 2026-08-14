-- Sprint 05 invitation cancellation state.
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS invitations_active_token_idx ON invitations (token_hash, expires_at) WHERE accepted_at IS NULL AND cancelled_at IS NULL;
