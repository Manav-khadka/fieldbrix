-- Rich, queryable operational fields for client, location, and asset registers.
-- JSONB remains available for each company's long-tail columns while the
-- frequently filtered fields below stay typed and indexable.

ALTER TABLE master_customers
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS alternate_phone text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS service_tier text NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS account_manager text,
  ADD COLUMN IF NOT EXISTS contract_start date,
  ADD COLUMN IF NOT EXISTS contract_end date,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE master_sites
  ADD COLUMN IF NOT EXISTS site_type text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS service_zone text,
  ADD COLUMN IF NOT EXISTS operating_hours text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE master_service_targets
  ADD COLUMN IF NOT EXISTS asset_category text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS installation_date date,
  ADD COLUMN IF NOT EXISTS warranty_end date,
  ADD COLUMN IF NOT EXISTS service_frequency_days integer,
  ADD COLUMN IF NOT EXISTS criticality text NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS asset_status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS master_customers_rich_search_idx
  ON master_customers USING gin (
    (lower(COALESCE(name,'') || ' ' || COALESCE(code,'') || ' ' || COALESCE(legal_name,'') || ' ' || COALESCE(industry,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(state,'') || ' ' || COALESCE(contact_name,'') || ' ' || COALESCE(email,'') || ' ' || COALESCE(phone,''))) gin_trgm_ops
  );
CREATE INDEX IF NOT EXISTS master_customers_custom_fields_idx
  ON master_customers USING gin (custom_fields jsonb_path_ops);
CREATE INDEX IF NOT EXISTS master_sites_rich_search_idx
  ON master_sites USING gin (
    (lower(COALESCE(name,'') || ' ' || COALESCE(code,'') || ' ' || COALESCE(site_type,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(state,'') || ' ' || COALESCE(service_zone,'') || ' ' || COALESCE(contact_name,''))) gin_trgm_ops
  );
CREATE INDEX IF NOT EXISTS master_sites_custom_fields_idx
  ON master_sites USING gin (custom_fields jsonb_path_ops);
CREATE INDEX IF NOT EXISTS master_targets_rich_search_idx
  ON master_service_targets USING gin (
    (lower(COALESCE(name,'') || ' ' || COALESCE(code,'') || ' ' || COALESCE(equipment_type,'') || ' ' || COALESCE(asset_category,'') || ' ' || COALESCE(manufacturer,'') || ' ' || COALESCE(model,'') || ' ' || COALESCE(serial_number,'') || ' ' || COALESCE(location,''))) gin_trgm_ops
  );
CREATE INDEX IF NOT EXISTS master_targets_custom_fields_idx
  ON master_service_targets USING gin (custom_fields jsonb_path_ops);

GRANT SELECT, INSERT, UPDATE ON master_customers, master_sites, master_service_targets TO fieldbrix_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON master_customers, master_sites, master_service_targets TO fieldbrix_migrator;
GRANT SELECT ON master_customers, master_sites, master_service_targets TO fieldbrix_readonly;
