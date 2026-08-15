-- Sprint 06: close the field gap between the DOCX record requirements and the
-- 026 master-data tables — additive only, no destructive column drops.
ALTER TABLE master_customers ADD COLUMN IF NOT EXISTS instructions text NOT NULL DEFAULT '';
ALTER TABLE master_sites ADD COLUMN IF NOT EXISTS parking_notes text NOT NULL DEFAULT '';

GRANT SELECT, INSERT, UPDATE ON master_customers, master_sites TO fieldbrix_runtime;
