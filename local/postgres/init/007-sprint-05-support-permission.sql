-- Sprint 05 support-note authorization registry delta.
INSERT INTO permissions (key, module, resource, action, scope)
VALUES ('platform.support.notes', 'platform', 'support-notes', 'view', ARRAY['all'])
ON CONFLICT (key) DO NOTHING;
