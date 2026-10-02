-- Replace only legacy demo tasks that have incomplete coordinates, then seed
-- a deterministic Madhya Pradesh/Bihar task set. Valid tasks are preserved.

DO $$
DECLARE
  demo_tenant_id constant uuid := '11111111-1111-4111-8111-111111111111';
  demo_admin_id constant uuid := '22222222-2222-4222-8222-222222222222';
  demo_team_id constant uuid := '55555555-5555-4555-8555-555555555555';
  demo_workflow_id uuid := md5('fieldbrix-demo-mp-bihar-workflow')::uuid;
  demo_version_id uuid := md5('fieldbrix-demo-mp-bihar-workflow-v1')::uuid;
  invalid_task_ids uuid[];
  customer_id uuid;
  site_id uuid;
  task_id uuid;
  city_index integer;
  task_index integer;
  city_name text;
  state_name text;
  latitude_value double precision;
  longitude_value double precision;
  cities text[] := ARRAY['Bhopal','Indore','Jabalpur','Gwalior','Patna','Gaya','Muzaffarpur','Bhagalpur'];
  states text[] := ARRAY['Madhya Pradesh','Madhya Pradesh','Madhya Pradesh','Madhya Pradesh','Bihar','Bihar','Bihar','Bihar'];
  latitudes double precision[] := ARRAY[23.2599,22.7196,23.1815,26.2183,25.5941,24.7955,26.1197,25.2425];
  longitudes double precision[] := ARRAY[77.4126,75.8577,79.9864,78.1828,85.1376,84.9994,85.3910,86.9842];
  client_names text[] := ARRAY['Apex Business Parks','Pragati Retail Group','Sanjeevani Hospitals','BharatNet Infrastructure','Magadh Health Network','Nalanda Retail Services','Vaishali Business Parks','Anga Telecom Services'];
  equipment text[] := ARRAY['HVAC Chiller','Diesel Generator','Fire Alarm Panel','Passenger Lift'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = demo_tenant_id) THEN
    RAISE NOTICE 'FieldBrix demo tenant not present; skipping geocoded task seed.';
    RETURN;
  END IF;

  PERFORM set_config('app.tenant_id', demo_tenant_id::text, false);

  SELECT array_agg(id) INTO invalid_task_ids
  FROM tasks
  WHERE tenant_id = demo_tenant_id
    AND (latitude IS NULL OR longitude IS NULL);

  IF invalid_task_ids IS NOT NULL THEN
    DELETE FROM parts_used pu WHERE pu.run_id IN (SELECT tr.id FROM task_runs tr WHERE tr.task_id = ANY(invalid_task_ids));
    DELETE FROM task_answers ta WHERE ta.run_id IN (SELECT tr.id FROM task_runs tr WHERE tr.task_id = ANY(invalid_task_ids));
    DELETE FROM customer_confirmations cc WHERE cc.task_id = ANY(invalid_task_ids);
    DELETE FROM task_attachments att WHERE att.task_id = ANY(invalid_task_ids);
    DELETE FROM task_reviews review WHERE review.task_id = ANY(invalid_task_ids) OR review.follow_up_task_id = ANY(invalid_task_ids);
    DELETE FROM recurrence_exceptions exception WHERE exception.new_task_id = ANY(invalid_task_ids);
    DELETE FROM task_history history WHERE history.task_id = ANY(invalid_task_ids);
    DELETE FROM task_runs run WHERE run.task_id = ANY(invalid_task_ids);
    DELETE FROM task_verification_requirements requirement WHERE requirement.task_id = ANY(invalid_task_ids);
    DELETE FROM task_supervisors supervisor WHERE supervisor.task_id = ANY(invalid_task_ids);
    DELETE FROM task_assignments assignment WHERE assignment.task_id = ANY(invalid_task_ids);
    DELETE FROM tasks task_record WHERE task_record.id = ANY(invalid_task_ids);
  END IF;

  INSERT INTO workflow_drafts (
    id, tenant_id, name, description, status, schema, current_version_id
  ) VALUES (
    demo_workflow_id, demo_tenant_id, 'MP & Bihar Preventive Field Service',
    'Safety inspection, equipment readings, evidence capture and supervisor verification.',
    'PUBLISHED',
    '{"steps":[{"type":"checklist","title":"Safety isolation"},{"type":"number","title":"Equipment reading"},{"type":"photo","title":"Evidence"},{"type":"signature","title":"Client acknowledgement"}]}'::jsonb,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description,
    status = 'PUBLISHED', schema = EXCLUDED.schema, archived_at = NULL;

  INSERT INTO workflow_versions (
    id, tenant_id, workflow_id, version, content_hash, snapshot
  ) VALUES (
    demo_version_id, demo_tenant_id, demo_workflow_id, 1,
    md5('fieldbrix-demo-mp-bihar-workflow-v1'),
    '{"steps":[{"type":"checklist","required":true},{"type":"number","required":true},{"type":"photo","required":true},{"type":"signature","required":true}]}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE workflow_drafts
  SET current_version_id = demo_version_id
  WHERE id = demo_workflow_id;

  INSERT INTO team_workflow_access (tenant_id, team_id, workflow_id)
  VALUES (demo_tenant_id, demo_team_id, demo_workflow_id)
  ON CONFLICT DO NOTHING;

  FOR city_index IN 1..8 LOOP
    city_name := cities[city_index];
    state_name := states[city_index];
    customer_id := md5('fieldbrix-demo-geocoded-customer-' || city_index)::uuid;
    site_id := md5('fieldbrix-demo-geocoded-site-' || city_index)::uuid;

    INSERT INTO master_customers (
      id, tenant_id, code, name, legal_name, industry, contact_name, email,
      phone, city, state, postal_code, country, service_tier, instructions,
      custom_fields
    ) VALUES (
      customer_id, demo_tenant_id, 'FBX-CL-' || lpad(city_index::text, 3, '0'),
      client_names[city_index], client_names[city_index] || ' Private Limited',
      CASE WHEN city_index % 2 = 0 THEN 'Telecommunications' ELSE 'Commercial Facilities' END,
      'Ananya Rao', 'operations' || city_index || '@fieldbrix-demo.local',
      '+91 98000' || lpad(city_index::text, 5, '0'), city_name, state_name,
      CASE WHEN state_name = 'Bihar' THEN '800001' ELSE '462001' END,
      'India', 'ENTERPRISE', 'Call the site contact 15 minutes before arrival.',
      jsonb_build_object('region', state_name, 'slaHours', 4, 'poRequired', true)
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, city = EXCLUDED.city, state = EXCLUDED.state,
      custom_fields = EXCLUDED.custom_fields, archived_at = NULL;

    INSERT INTO master_sites (
      id, tenant_id, customer_id, code, name, site_type, address, gps,
      access_notes, safety_notes, city, state, postal_code, country, timezone,
      contact_name, contact_phone, service_zone, operating_hours, custom_fields
    ) VALUES (
      site_id, demo_tenant_id, customer_id,
      'FBX-' || upper(substr(city_name, 1, 3)) || '-01',
      client_names[city_index] || ' · ' || city_name || ' Service Site',
      'CUSTOMER_SITE', jsonb_build_object('line1', 'Field Service Corridor, ' || city_name),
      jsonb_build_object('lat', latitudes[city_index], 'lng', longitudes[city_index]),
      'Photo ID required at the security desk.', 'PPE mandatory in equipment areas.',
      city_name, state_name,
      CASE WHEN state_name = 'Bihar' THEN '800001' ELSE '462001' END,
      'India', 'Asia/Kolkata', 'Rahul Kumar',
      '+91 97000' || lpad(city_index::text, 5, '0'),
      CASE WHEN state_name = 'Bihar' THEN 'BIHAR-' ELSE 'MP-' END || city_index,
      'Mon-Sat 08:00-18:00',
      jsonb_build_object('gatePassRequired', true, 'nearestLandmark', city_name || ' Central')
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, gps = EXCLUDED.gps, city = EXCLUDED.city,
      state = EXCLUDED.state, custom_fields = EXCLUDED.custom_fields,
      archived_at = NULL;
  END LOOP;

  FOR task_index IN 1..3200 LOOP
    city_index := ((task_index - 1) % 8) + 1;
    city_name := cities[city_index];
    state_name := states[city_index];
    -- Deterministic neighbourhood-level spread around each city centre. The
    -- points form dense city clusters at India/state zoom and progressively
    -- split into wards and individual jobs as the map zooms in.
    latitude_value := latitudes[city_index]
      + (((((task_index - 1) / 8) % 20) - 9.5) * 0.006);
    longitude_value := longitudes[city_index]
      + (((((task_index - 1) / 8) / 20) - 9.5) * 0.006);
    customer_id := md5('fieldbrix-demo-geocoded-customer-' || city_index)::uuid;
    site_id := md5('fieldbrix-demo-geocoded-site-' || city_index)::uuid;
    task_id := md5('fieldbrix-demo-geocoded-task-' || task_index)::uuid;

    INSERT INTO tasks (
      id, tenant_id, task_number, workflow_version_id, customer_id, site_id,
      status, priority, work_type, external_reference_id, contact_phone,
      latitude, longitude, description, instructions, scheduled_at, due_at,
      estimated_minutes, custom_fields
    ) VALUES (
      task_id, demo_tenant_id, 'FBX-MPB-' || lpad(task_index::text, 5, '0'),
      demo_version_id, customer_id, site_id,
      (ARRAY['ASSIGNED','SCHEDULED','IN_PROGRESS','COMPLETED'])[((task_index - 1) % 4) + 1],
      CASE WHEN task_index % 7 = 0 THEN 'URGENT' WHEN task_index % 4 = 0 THEN 'HIGH' ELSE 'NORMAL' END,
      'PREVENTIVE', 'MPBR-WO-2026-' || lpad(task_index::text, 5, '0'),
      '+91 98001' || lpad(task_index::text, 5, '0'),
      latitude_value, longitude_value,
      'Preventive inspection · ' || equipment[((task_index - 1) % 4) + 1] || ' · ' || city_name,
      'Complete safety isolation, capture readings, and attach before/after evidence.',
      clock_timestamp() + ((task_index - 6) || ' hours')::interval,
      clock_timestamp() + ((task_index + 18) || ' hours')::interval,
      45 + (task_index % 4) * 15,
      jsonb_build_object(
        'clientWorkOrder', 'MPBR-CWO-' || lpad(task_index::text, 5, '0'),
        'serviceCategory', 'Preventive Maintenance',
        'assetTag', 'MPBR-AT-' || task_index,
        'buildingWing', (ARRAY['North','South','East','West'])[((task_index - 1) % 4) + 1],
        'floor', ((task_index - 1) % 12) + 1,
        'contactWindow', '09:00-17:00',
        'slaClass', CASE WHEN task_index % 7 = 0 THEN 'P1' ELSE 'P2' END,
        'permitRequired', task_index % 3 = 0,
        'lastReading', 72 + task_index,
        'readingUnit', 'psi',
        'routeCluster', CASE WHEN state_name = 'Bihar' THEN 'BR-' ELSE 'MP-' END || city_index,
        'purchaseOrder', 'MPBR-PO-26-' || task_index,
        'customerSegment', 'Enterprise',
        'technicianNotes', 'Inspect vibration and power draw',
        'sourceSystem', 'Client ERP',
        'importBatch', 'MP-BIHAR-AUG-2026',
        'billable', true,
        'estimatedPartsCost', 1250 + task_index * 85,
        'customerRatingTarget', 4.8,
        'city', city_name,
        'state', state_name
      )
    )
    ON CONFLICT (id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      description = EXCLUDED.description,
      scheduled_at = EXCLUDED.scheduled_at,
      due_at = EXCLUDED.due_at,
      custom_fields = EXCLUDED.custom_fields,
      archived_at = NULL,
      updated_at = clock_timestamp();

    INSERT INTO task_assignments (
      id, tenant_id, task_id, team_id, lead, reason, assigned_by
    ) VALUES (
      md5('fieldbrix-demo-geocoded-assignment-' || task_index)::uuid,
      demo_tenant_id, task_id, demo_team_id, true,
      'Imported MP/Bihar route assignment', demo_admin_id
    )
    ON CONFLICT (id) DO UPDATE SET team_id = EXCLUDED.team_id, ended_at = NULL;

    INSERT INTO task_supervisors (tenant_id, task_id, user_id, supervisor_kind)
    VALUES (demo_tenant_id, task_id, demo_admin_id, 'OPERATIONAL')
    ON CONFLICT DO NOTHING;

    INSERT INTO task_verification_requirements (
      tenant_id, task_id, verification_mode, required_approvals
    ) VALUES (demo_tenant_id, task_id, 'MANUAL_SUPERVISOR', 1)
    ON CONFLICT ON CONSTRAINT task_verification_requirements_pkey
    DO UPDATE SET verification_mode = EXCLUDED.verification_mode,
      required_approvals = EXCLUDED.required_approvals;
  END LOOP;
END $$;
