INSERT INTO platform_seed (key, value)
VALUES ('environment', 'local'), ('seed_version', 'sprint-01')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();
