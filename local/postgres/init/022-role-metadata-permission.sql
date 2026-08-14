-- Sprint 04 delta: role metadata editing is distinct from grant configuration.
INSERT INTO permissions (key, module, resource, action, scope)
VALUES ('iam.roles.edit', 'iam', 'roles', 'edit', ARRAY['all'])
ON CONFLICT (key) DO NOTHING;

UPDATE role_presets
SET grants = array_append(grants, 'iam.roles.edit')
WHERE key = 'company_admin'
  AND NOT ('iam.roles.edit' = ANY(grants));
