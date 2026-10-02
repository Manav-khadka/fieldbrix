-- Client onboarding and data-driven task import.
-- Tasks keep their published workflow pin while accepting the minimum fields
-- supplied by a client's offline dispatch source.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS external_reference_id text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Imported work may arrive with coordinates before the customer has modelled
-- every physical site or asset in FieldBrix.
ALTER TABLE tasks ALTER COLUMN site_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_external_reference_uq
  ON tasks (tenant_id, customer_id, external_reference_id)
  WHERE external_reference_id IS NOT NULL;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_latitude_range_ck;
ALTER TABLE tasks ADD CONSTRAINT tasks_latitude_range_ck
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_longitude_range_ck;
ALTER TABLE tasks ADD CONSTRAINT tasks_longitude_range_ck
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
