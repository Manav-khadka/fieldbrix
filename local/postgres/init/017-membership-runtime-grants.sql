-- Runtime access for Sprint 05 temporal membership records.
GRANT SELECT, INSERT, UPDATE ON branch_memberships, team_memberships, team_lead_history TO fieldbrix_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON branch_memberships, team_memberships, team_lead_history TO fieldbrix_migrator;
GRANT SELECT ON branch_memberships, team_memberships, team_lead_history TO fieldbrix_readonly;
