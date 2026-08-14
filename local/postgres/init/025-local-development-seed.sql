-- Deterministic local development data. These credentials are local-only.
-- Login: admin@fieldbrix.local / ChangeMe123!
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO tenants (id, name, status, timezone)
VALUES ('11111111-1111-4111-8111-111111111111', 'FieldBrix Demo Company', 'ACTIVE', 'Asia/Muscat')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, timezone = EXCLUDED.timezone;

SELECT set_config('app.tenant_id', '11111111-1111-4111-8111-111111111111', false);

INSERT INTO users (id, tenant_id, email, display_name, password_hash)
VALUES ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'admin@fieldbrix.local', 'Demo Administrator', '$2b$12$obZhpsb4WLiaHfXCsRa7OuHeeycWlW.XS8H6ebhBwX7KgKK8lBh1O')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash, active = TRUE;

INSERT INTO roles (id, tenant_id, name, preset_source, immutable)
VALUES ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'Company Admin', 'company_admin', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, preset_source = EXCLUDED.preset_source;

INSERT INTO role_permissions (role_id, permission_key)
SELECT '33333333-3333-4333-8333-333333333333', unnest(grants)
FROM role_presets
WHERE key = 'company_admin'
ON CONFLICT DO NOTHING;

INSERT INTO tenant_user_roles (tenant_id, user_id, role_id)
VALUES ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333')
ON CONFLICT DO NOTHING;

INSERT INTO user_tenant_memberships (id, user_id, tenant_id)
VALUES ('77777777-7777-4777-8777-777777777777', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

INSERT INTO branches (id, tenant_id, name, timezone)
VALUES
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'Muscat Operations', 'Asia/Muscat'),
  ('44444444-4444-4444-8444-444444444445', '11111111-1111-4111-8111-111111111111', 'Salalah Field Office', 'Asia/Muscat')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, timezone = EXCLUDED.timezone, active = TRUE;

INSERT INTO teams (id, tenant_id, name, lead_user_id)
VALUES ('55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', 'Field Operations', '22222222-2222-4222-8222-222222222222')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, lead_user_id = EXCLUDED.lead_user_id, active = TRUE;

INSERT INTO tenant_settings (tenant_id, settings)
VALUES ('11111111-1111-4111-8111-111111111111', '{"locale":"en-GB","timezone":"Asia/Muscat","workingDays":[1,2,3,4,5]}'::jsonb)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO platform_administrators (id, email, display_name)
VALUES ('66666666-6666-4666-8666-666666666666', 'platform@fieldbrix.local', 'Local Platform Administrator')
ON CONFLICT (id) DO UPDATE SET active = TRUE;
