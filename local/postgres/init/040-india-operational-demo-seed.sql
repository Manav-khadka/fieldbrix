-- High-quality, deterministic Madhya Pradesh and Bihar demo dataset.
-- Each of three tenant companies receives 20 employees, 10/11/10 field
-- workers respectively, managers/admin/quality staff, clients, locations,
-- assets, workflows, assigned tasks, supervisors, and verification settings.

DO $$
DECLARE
  company_index integer;
  employee_index integer;
  client_index integer;
  location_index integer;
  asset_index integer;
  task_index integer;
  field_count integer;
  tenant_id uuid;
  user_id uuid;
  admin_id uuid;
  supervisor_id uuid;
  company_role_id uuid;
  field_team_id uuid;
  quality_team_id uuid;
  customer_id uuid;
  site_id uuid;
  target_id uuid;
  workflow_id uuid;
  version_id uuid;
  task_id uuid;
  seed_task_id uuid;
  worker_id uuid;
  company_name text;
  company_slug text;
  city_name text;
  state_name text;
  latitude_value double precision;
  longitude_value double precision;
  client_names text[] := ARRAY['Apex Business Parks','Pragati Retail Group','Sanjeevani Hospitals','BharatNet Infrastructure'];
  industries text[] := ARRAY['Commercial Real Estate','Retail','Healthcare','Telecommunications'];
  cities text[] := ARRAY['Bhopal','Indore','Jabalpur','Gwalior','Patna','Gaya','Muzaffarpur','Bhagalpur'];
  states text[] := ARRAY['Madhya Pradesh','Madhya Pradesh','Madhya Pradesh','Madhya Pradesh','Bihar','Bihar','Bihar','Bihar'];
  latitudes double precision[] := ARRAY[23.2599,22.7196,23.1815,26.2183,25.5941,24.7955,26.1197,25.2425];
  longitudes double precision[] := ARRAY[77.4126,75.8577,79.9864,78.1828,85.1376,84.9994,85.3910,86.9842];
  equipment text[] := ARRAY['HVAC Chiller','Diesel Generator','Fire Alarm Panel','Passenger Lift'];
  makers text[] := ARRAY['Blue Star','Cummins India','Honeywell','KONE India'];
BEGIN
  -- Re-import semantics: remove only the deterministic demo tasks previously
  -- created by this seed (both the legacy India IDs and the current MP/Bihar
  -- IDs). User-created and other test tasks are deliberately untouched.
  FOR company_index IN 1..3 LOOP
    FOR task_index IN 1..24 LOOP
      FOREACH seed_task_id IN ARRAY ARRAY[
        md5('india-demo-task-'||company_index||'-'||task_index)::uuid,
        md5('mp-bihar-demo-task-'||company_index||'-'||task_index)::uuid
      ] LOOP
        DELETE FROM parts_used pu
        WHERE pu.run_id IN (SELECT tr.id FROM task_runs tr WHERE tr.task_id=seed_task_id);
        DELETE FROM task_answers ta
        WHERE ta.run_id IN (SELECT tr.id FROM task_runs tr WHERE tr.task_id=seed_task_id);
        DELETE FROM customer_confirmations cc WHERE cc.task_id=seed_task_id;
        DELETE FROM task_attachments att WHERE att.task_id=seed_task_id;
        DELETE FROM task_reviews rev
        WHERE rev.task_id=seed_task_id OR rev.follow_up_task_id=seed_task_id;
        DELETE FROM recurrence_exceptions rex WHERE rex.new_task_id=seed_task_id;
        DELETE FROM task_history hist WHERE hist.task_id=seed_task_id;
        DELETE FROM task_runs run WHERE run.task_id=seed_task_id;
        DELETE FROM task_verification_requirements req WHERE req.task_id=seed_task_id;
        DELETE FROM task_supervisors sup WHERE sup.task_id=seed_task_id;
        DELETE FROM task_assignments assignment WHERE assignment.task_id=seed_task_id;
        DELETE FROM tasks seeded_task WHERE seeded_task.id=seed_task_id;
      END LOOP;
    END LOOP;
  END LOOP;

  FOR company_index IN 1..3 LOOP
    company_name := (ARRAY['Northstar Facility Services','Vertex Telecom Operations','Pristine Environmental Services'])[company_index];
    company_slug := (ARRAY['northstar','vertex','pristine'])[company_index];
    field_count := (ARRAY[10,11,10])[company_index];
    tenant_id := md5('india-demo-tenant-' || company_index)::uuid;
    admin_id := md5('india-demo-user-' || company_index || '-1')::uuid;
    supervisor_id := md5('india-demo-user-' || company_index || '-' || (field_count + 2))::uuid;
    company_role_id := md5('india-demo-admin-role-' || company_index)::uuid;
    field_team_id := md5('india-demo-field-team-' || company_index)::uuid;
    quality_team_id := md5('india-demo-quality-team-' || company_index)::uuid;
    workflow_id := md5('india-demo-workflow-' || company_index)::uuid;
    version_id := md5('india-demo-workflow-version-' || company_index)::uuid;

    INSERT INTO tenants (id,name,status,timezone,settings)
    VALUES (tenant_id,company_name,'ACTIVE','Asia/Kolkata',jsonb_build_object('locale','en-IN','currency','INR','country','India'))
    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,status='ACTIVE',timezone='Asia/Kolkata',settings=EXCLUDED.settings;
    PERFORM set_config('app.tenant_id', tenant_id::text, false);

    FOR employee_index IN 1..20 LOOP
      user_id := md5('india-demo-user-' || company_index || '-' || employee_index)::uuid;
      INSERT INTO users (id,tenant_id,email,display_name,password_hash,active)
      VALUES (
        user_id,tenant_id,
        format('%s.%s@%s.fieldbrix.local',
          CASE WHEN employee_index=1 THEN 'admin' WHEN employee_index<=field_count+1 THEN 'field' WHEN employee_index<=field_count+3 THEN 'manager' WHEN employee_index<=field_count+5 THEN 'quality' ELSE 'dispatcher' END,
          lpad(employee_index::text,2,'0'),company_slug),
        CASE WHEN employee_index=1 THEN 'Aarav '||initcap(company_slug)||' Admin'
             WHEN employee_index<=field_count+1 THEN (ARRAY['Arjun','Diya','Ishaan','Kavya','Rohan','Meera','Vivaan','Ananya','Aditya','Saanvi','Kabir'])[employee_index-1]||' '||initcap(company_slug)
             WHEN employee_index<=field_count+3 THEN (ARRAY['Neha','Vikram'])[employee_index-field_count-1]||' Operations Manager'
             WHEN employee_index<=field_count+5 THEN (ARRAY['Priya','Sameer'])[employee_index-field_count-3]||' Quality Officer'
             ELSE 'Dispatch Coordinator '||employee_index END,
        '$2b$12$obZhpsb4WLiaHfXCsRa7OuHeeycWlW.XS8H6ebhBwX7KgKK8lBh1O',true)
      ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name,email=EXCLUDED.email,active=true;
    END LOOP;

    INSERT INTO roles (id,tenant_id,name,preset_source,immutable) VALUES (company_role_id,tenant_id,'Company Admin','company_admin',true)
    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,preset_source=EXCLUDED.preset_source;
    INSERT INTO role_permissions (role_id,permission_key)
      SELECT company_role_id,unnest(grants) FROM role_presets WHERE key='company_admin' ON CONFLICT DO NOTHING;
    INSERT INTO tenant_user_roles (tenant_id,user_id,role_id) VALUES (tenant_id,admin_id,company_role_id) ON CONFLICT DO NOTHING;
    INSERT INTO user_tenant_memberships (id,user_id,tenant_id)
      SELECT md5('india-demo-membership-'||company_index||'-'||employee_no)::uuid,md5('india-demo-user-'||company_index||'-'||employee_no)::uuid,tenant_id FROM generate_series(1,20) AS seeded_employee(employee_no)
      ON CONFLICT ON CONSTRAINT user_tenant_memberships_user_id_tenant_id_key DO NOTHING;

    INSERT INTO teams (id,tenant_id,name,lead_user_id,active,department_label,verification_mode,required_approvals)
    VALUES
      (field_team_id,tenant_id,'Field Operations',supervisor_id,true,'Field Operations','MANUAL_SUPERVISOR',1),
      (quality_team_id,tenant_id,'Quality & Compliance',md5('india-demo-user-'||company_index||'-'||(field_count+4))::uuid,true,'Quality Department','QUALITY_DEPARTMENT',2)
    ON CONFLICT (id) DO UPDATE SET lead_user_id=EXCLUDED.lead_user_id,active=true,department_label=EXCLUDED.department_label,verification_mode=EXCLUDED.verification_mode,required_approvals=EXCLUDED.required_approvals;

    FOR employee_index IN 1..20 LOOP
      user_id := md5('india-demo-user-' || company_index || '-' || employee_index)::uuid;
      INSERT INTO workforce_profiles (tenant_id,user_id,job_title,workforce_type,primary_team_id,can_receive_tasks,can_assign_tasks,can_verify_tasks)
      VALUES (tenant_id,user_id,
        CASE WHEN employee_index=1 THEN 'Company Administrator' WHEN employee_index<=field_count+1 THEN 'Field Service Officer' WHEN employee_index<=field_count+3 THEN 'Operations Manager' WHEN employee_index<=field_count+5 THEN 'Quality Officer' ELSE 'Dispatch Coordinator' END,
        CASE WHEN employee_index=1 THEN 'COMPANY_ADMIN' WHEN employee_index<=field_count+1 THEN 'FIELD_WORKER' WHEN employee_index<=field_count+3 THEN 'SUPERVISOR' WHEN employee_index<=field_count+5 THEN 'QUALITY_REVIEWER' ELSE 'OFFICE' END,
        CASE WHEN employee_index<=field_count+3 THEN field_team_id WHEN employee_index<=field_count+5 THEN quality_team_id ELSE NULL END,
        employee_index BETWEEN 2 AND field_count+1,employee_index=1 OR employee_index BETWEEN field_count+2 AND field_count+3,employee_index=1 OR employee_index BETWEEN field_count+2 AND field_count+5)
      ON CONFLICT ON CONSTRAINT workforce_profiles_pkey DO UPDATE SET job_title=EXCLUDED.job_title,workforce_type=EXCLUDED.workforce_type,primary_team_id=EXCLUDED.primary_team_id,can_receive_tasks=EXCLUDED.can_receive_tasks,can_assign_tasks=EXCLUDED.can_assign_tasks,can_verify_tasks=EXCLUDED.can_verify_tasks;
      IF employee_index BETWEEN 2 AND field_count+3 THEN
        INSERT INTO team_memberships (id,tenant_id,team_id,user_id,assigned_by) VALUES (md5('india-demo-team-member-'||company_index||'-'||employee_index)::uuid,tenant_id,field_team_id,user_id,admin_id) ON CONFLICT DO NOTHING;
      ELSIF employee_index BETWEEN field_count+4 AND field_count+5 THEN
        INSERT INTO team_memberships (id,tenant_id,team_id,user_id,assigned_by) VALUES (md5('india-demo-quality-member-'||company_index||'-'||employee_index)::uuid,tenant_id,quality_team_id,user_id,admin_id) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
    INSERT INTO team_supervisors (tenant_id,team_id,user_id,supervisor_kind) VALUES (tenant_id,field_team_id,supervisor_id,'OPERATIONAL'),(tenant_id,field_team_id,md5('india-demo-user-'||company_index||'-'||(field_count+3))::uuid,'OPERATIONAL'),(tenant_id,quality_team_id,md5('india-demo-user-'||company_index||'-'||(field_count+4))::uuid,'QUALITY') ON CONFLICT DO NOTHING;

    INSERT INTO workflow_drafts (id,tenant_id,name,description,status,schema,current_version_id)
    VALUES (workflow_id,tenant_id,'Preventive Field Service','Inspection, evidence, corrective action and customer sign-off.','PUBLISHED','{"steps":[{"type":"checklist","title":"Safety check"},{"type":"photo","title":"Condition evidence"},{"type":"signature","title":"Customer sign-off"}]}'::jsonb,NULL)
    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,status='PUBLISHED',schema=EXCLUDED.schema;
    INSERT INTO workflow_versions (id,tenant_id,workflow_id,version,content_hash,snapshot)
    VALUES (version_id,tenant_id,workflow_id,1,md5(company_slug||'-preventive-v1'),'{"steps":[{"type":"checklist","required":true},{"type":"photo","required":true},{"type":"signature","required":true}]}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
    UPDATE workflow_drafts SET current_version_id=version_id WHERE id=workflow_id AND current_version_id IS DISTINCT FROM version_id;
    INSERT INTO team_workflow_access (tenant_id,team_id,workflow_id) VALUES (tenant_id,field_team_id,workflow_id) ON CONFLICT DO NOTHING;
    INSERT INTO user_workflow_access (tenant_id,user_id,workflow_id,access_level)
      SELECT tenant_id,md5('india-demo-user-'||company_index||'-'||employee_no)::uuid,workflow_id,'PERFORM' FROM generate_series(2,field_count+1) AS seeded_employee(employee_no) ON CONFLICT DO NOTHING;

    FOR client_index IN 1..4 LOOP
      customer_id := md5('india-demo-customer-'||company_index||'-'||client_index)::uuid;
      INSERT INTO master_customers (id,tenant_id,code,name,legal_name,industry,tax_id,contact_name,email,phone,alternate_phone,address,city,state,postal_code,country,service_tier,account_manager,contract_start,contract_end,instructions,custom_fields)
      VALUES (customer_id,tenant_id,upper(substr(company_slug,1,3))||'-CL-'||lpad(client_index::text,3,'0'),client_names[client_index],client_names[client_index]||' Private Limited',industries[client_index],format('29AABCF%04sZ1',company_index*100+client_index),'Ananya Rao',format('operations@client%s-%s.example',client_index,company_slug),format('+91 98%08s',company_index*100000+client_index),format('+91 80 4%07s',company_index*10000+client_index),jsonb_build_object('line1',client_index||' Business District','line2','Operations Office'),cities[(company_index+client_index-2)%8+1],states[(company_index+client_index-2)%8+1],format('5%05s',company_index*1000+client_index),'India',CASE WHEN client_index=1 THEN 'ENTERPRISE' WHEN client_index=2 THEN 'PREMIUM' ELSE 'STANDARD' END,'Ritika Sharma',current_date-180,current_date+550,'Security clearance and customer acknowledgement required.',jsonb_build_object('billingCycle','Monthly','slaHours',CASE WHEN client_index=1 THEN 4 ELSE 8 END,'poRequired',true,'regionalCluster','India '||states[(company_index+client_index-2)%8+1]))
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,legal_name=EXCLUDED.legal_name,industry=EXCLUDED.industry,city=EXCLUDED.city,state=EXCLUDED.state,service_tier=EXCLUDED.service_tier,custom_fields=EXCLUDED.custom_fields;

      FOR location_index IN 1..2 LOOP
        city_name:=cities[((company_index-1)*2+(client_index-1)*2+location_index-1)%8+1]; state_name:=states[((company_index-1)*2+(client_index-1)*2+location_index-1)%8+1];latitude_value:=latitudes[((company_index-1)*2+(client_index-1)*2+location_index-1)%8+1]+location_index*0.018;longitude_value:=longitudes[((company_index-1)*2+(client_index-1)*2+location_index-1)%8+1]+location_index*0.014;
        site_id:=md5('india-demo-site-'||company_index||'-'||client_index||'-'||location_index)::uuid;
        INSERT INTO master_sites (id,tenant_id,customer_id,code,name,site_type,address,gps,access_notes,parking_notes,safety_notes,hours,city,state,postal_code,country,timezone,contact_name,contact_phone,contact_email,service_zone,operating_hours,custom_fields)
        VALUES (site_id,tenant_id,customer_id,upper(substr(company_slug,1,3))||'-'||upper(substr(city_name,1,3))||'-'||client_index||location_index,client_names[client_index]||' · '||city_name||CASE WHEN location_index=1 THEN ' Main Campus' ELSE ' Service Hub' END,CASE WHEN location_index=1 THEN 'CUSTOMER_SITE' ELSE 'WAREHOUSE' END,jsonb_build_object('line1',(10+client_index)||' '||city_name||' Tech Corridor','line2','Gate '||location_index),jsonb_build_object('lat',latitude_value,'lng',longitude_value),'Photo ID at security desk. Call site contact 15 minutes before arrival.','Visitor parking in Zone C.','PPE mandatory in plant and roof areas.','{"mon-fri":"08:00-18:00","sat":"09:00-14:00"}'::jsonb,city_name,state_name,format('4%05s',company_index*1000+client_index*10+location_index),'India','Asia/Kolkata','Rahul Nair',format('+91 97%08s',company_index*100000+client_index*10+location_index),format('%s.site%s@client%s.example',lower(city_name),location_index,client_index),'ZONE-'||upper(substr(state_name,1,3)),'Mon–Sat · 08:00–18:00',jsonb_build_object('gatePassRequired',true,'loadingBay',location_index,'nearestLandmark',city_name||' Metro'))
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,gps=EXCLUDED.gps,city=EXCLUDED.city,state=EXCLUDED.state,contact_name=EXCLUDED.contact_name,custom_fields=EXCLUDED.custom_fields;

        FOR asset_index IN 1..2 LOOP
          target_id:=md5('india-demo-asset-'||company_index||'-'||client_index||'-'||location_index||'-'||asset_index)::uuid;
          INSERT INTO master_service_targets (id,tenant_id,site_id,code,name,qr_identity,equipment_type,asset_category,manufacturer,model,serial_number,location,condition,criticality,asset_status,installation_date,warranty,warranty_end,coverage,service_frequency_days,next_due,evidence,custom_fields)
          VALUES (target_id,tenant_id,site_id,upper(substr(company_slug,1,3))||'-AST-'||client_index||location_index||asset_index,equipment[(client_index+asset_index-2)%4+1]||' #'||location_index||asset_index,'FBX-'||upper(substr(md5(target_id::text),1,12)),equipment[(client_index+asset_index-2)%4+1],'Building Services',makers[(client_index+asset_index-2)%4+1],'IND-'||2020+asset_index||'-'||client_index,'SN'||company_index||client_index||location_index||asset_index||'8472',CASE WHEN asset_index=1 THEN 'Plant Room A' ELSE 'Roof Service Zone' END,CASE WHEN asset_index=1 THEN 'GOOD' ELSE 'FAIR' END,CASE WHEN client_index=1 THEN 'CRITICAL' WHEN client_index=2 THEN 'HIGH' ELSE 'MEDIUM' END,'ACTIVE',current_date-(asset_index*420),jsonb_build_object('provider',makers[(client_index+asset_index-2)%4+1],'expiresOn',(current_date+365)::text),current_date+365,jsonb_build_object('contract','AMC-'||company_index||client_index,'notes','Parts and labour included'),CASE WHEN client_index<=2 THEN 90 ELSE 180 END,current_date+(client_index*7+asset_index*3),jsonb_build_object('commissioningCertificate',true,'lastInspection',(current_date-60)::text),jsonb_build_object('capacity',10+client_index*5,'capacityUnit','kW','energyMeterId','EM-'||company_index||client_index||location_index||asset_index,'remoteMonitoring',asset_index=1))
          ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,condition=EXCLUDED.condition,criticality=EXCLUDED.criticality,next_due=EXCLUDED.next_due,custom_fields=EXCLUDED.custom_fields;
        END LOOP;
      END LOOP;
    END LOOP;

    FOR task_index IN 1..24 LOOP
      client_index:=((task_index-1)%4)+1;location_index:=((task_index-1)%2)+1;customer_id:=md5('india-demo-customer-'||company_index||'-'||client_index)::uuid;site_id:=md5('india-demo-site-'||company_index||'-'||client_index||'-'||location_index)::uuid;target_id:=md5('india-demo-asset-'||company_index||'-'||client_index||'-'||location_index||'-'||(((task_index-1)%2)+1))::uuid;task_id:=md5('mp-bihar-demo-task-'||company_index||'-'||task_index)::uuid;worker_id:=md5('india-demo-user-'||company_index||'-'||(((task_index-1)%field_count)+2))::uuid;
      SELECT (gps->>'lat')::double precision,(gps->>'lng')::double precision,city,state
      INTO latitude_value,longitude_value,city_name,state_name
      FROM master_sites WHERE id=site_id;
      INSERT INTO tasks (id,tenant_id,task_number,workflow_version_id,customer_id,site_id,target_id,status,priority,work_type,external_reference_id,contact_phone,latitude,longitude,description,instructions,scheduled_at,due_at,estimated_minutes,custom_fields)
      VALUES (task_id,tenant_id,upper(substr(company_slug,1,3))||'-MPB-'||lpad(task_index::text,5,'0'),version_id,customer_id,site_id,target_id,(ARRAY['ASSIGNED','SCHEDULED','IN_PROGRESS','COMPLETED'])[(task_index-1)%4+1],CASE WHEN task_index%7=0 THEN 'URGENT' WHEN task_index%4=0 THEN 'HIGH' ELSE 'NORMAL' END,'PREVENTIVE','MPBR-WO-'||2026||'-'||company_index||'-'||lpad(task_index::text,5,'0'),format('+91 98%08s',company_index*100000+task_index),latitude_value+(((task_index%3)-1)*0.0015),longitude_value+(((task_index%4)-2)*0.0015),'Preventive inspection · '||equipment[(task_index-1)%4+1]||' · '||city_name,'Complete safety isolation, capture readings and attach before/after evidence.',clock_timestamp()+((task_index-8)||' hours')::interval,clock_timestamp()+((task_index+16)||' hours')::interval,45+(task_index%4)*15,jsonb_build_object('clientWorkOrder','MPBR-CWO-'||company_index||'-'||task_index,'serviceCategory','Preventive Maintenance','assetTag','AT-'||client_index||'-'||task_index,'buildingWing',(ARRAY['North','South','East','West'])[(task_index-1)%4+1],'floor',((task_index-1)%12)+1,'contactWindow','09:00-17:00','slaClass',CASE WHEN task_index%7=0 THEN 'P1' ELSE 'P2' END,'permitRequired',task_index%3=0,'lastReading',72+task_index,'readingUnit','psi','routeCluster',CASE WHEN state_name='Madhya Pradesh' THEN 'MP-' ELSE 'BR-' END||((task_index-1)%4+1),'purchaseOrder','MPBR-PO-26-'||task_index,'customerSegment','Enterprise','technicianNotes','Inspect vibration and power draw','sourceSystem','Client ERP','importBatch','MP-BIHAR-AUG-2026','billable',true,'estimatedPartsCost',1250+task_index*85,'customerRatingTarget',4.8,'city',city_name,'state',state_name))
      ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,priority=EXCLUDED.priority,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,custom_fields=EXCLUDED.custom_fields,updated_at=clock_timestamp();
      INSERT INTO task_assignments (id,tenant_id,task_id,worker_id,team_id,lead,reason,assigned_by) VALUES (md5('mp-bihar-demo-assignment-'||company_index||'-'||task_index)::uuid,tenant_id,task_id,worker_id,field_team_id,true,'Seeded Madhya Pradesh/Bihar route and skill match',admin_id) ON CONFLICT (id) DO UPDATE SET worker_id=EXCLUDED.worker_id,team_id=EXCLUDED.team_id,ended_at=NULL;
      INSERT INTO task_supervisors (tenant_id,task_id,user_id,supervisor_kind) VALUES (tenant_id,task_id,supervisor_id,'OPERATIONAL') ON CONFLICT DO NOTHING;
      INSERT INTO task_verification_requirements (tenant_id,task_id,verification_mode,required_approvals,quality_team_id) VALUES (tenant_id,task_id,CASE WHEN task_index%5=0 THEN 'QUALITY_DEPARTMENT' ELSE 'MANUAL_SUPERVISOR' END,CASE WHEN task_index%5=0 THEN 2 ELSE 1 END,CASE WHEN task_index%5=0 THEN quality_team_id ELSE NULL END) ON CONFLICT ON CONSTRAINT task_verification_requirements_pkey DO UPDATE SET verification_mode=EXCLUDED.verification_mode,required_approvals=EXCLUDED.required_approvals,quality_team_id=EXCLUDED.quality_team_id;
    END LOOP;
  END LOOP;
END $$;
