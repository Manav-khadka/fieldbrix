import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import { PlatformService } from '../../platform/platform/platform.service';
import {
  CreatePlatformStaffDto,
  UpdateDepartmentGovernanceDto,
  UpdateWorkforceProfileDto,
} from '../dto/workforce.dto';

@Injectable()
export class WorkforceService {
  constructor(
    private readonly database: DatabaseService,
    private readonly platform: PlatformService,
  ) {}

  async directory(token: string) {
    const actor = this.platform.requireUser(token);
    const [people, departments, workflows] = await Promise.all([
      this.database.tenantQuery(
        `SELECT u.id::text, u.display_name AS name, u.email, u.active,
                COALESCE(wp.job_title, 'Field worker') AS "jobTitle",
                COALESCE(wp.workforce_type, 'FIELD_WORKER') AS "workforceType",
                wp.primary_team_id::text AS "primaryTeamId",
                COALESCE(wp.can_receive_tasks, true) AS "canReceiveTasks",
                COALESCE(wp.can_assign_tasks, false) AS "canAssignTasks",
                COALESCE(wp.can_verify_tasks, false) AS "canVerifyTasks",
                COALESCE((SELECT jsonb_agg(jsonb_build_object('workflowId', uwa.workflow_id::text, 'accessLevel', uwa.access_level))
                  FROM user_workflow_access uwa WHERE uwa.tenant_id = u.tenant_id AND uwa.user_id = u.id), '[]'::jsonb) AS "workflowAccess",
                COALESCE((SELECT jsonb_agg(tm.team_id::text) FROM team_memberships tm
                  WHERE tm.tenant_id = u.tenant_id AND tm.user_id = u.id AND tm.ends_at IS NULL), '[]'::jsonb) AS "teamIds"
         FROM users u LEFT JOIN workforce_profiles wp ON wp.tenant_id = u.tenant_id AND wp.user_id = u.id
         WHERE u.tenant_id = $1::uuid ORDER BY u.display_name`,
        [actor.tenantId],
      ),
      this.database.tenantQuery(
        `SELECT t.id::text, t.name, t.active, t.lead_user_id::text AS "leadUserId",
                COALESCE(t.department_label, t.name) AS "departmentLabel",
                COALESCE(t.verification_mode, 'MANUAL_SUPERVISOR') AS "verificationMode",
                COALESCE(t.required_approvals, 1) AS "requiredApprovals",
                COALESCE((SELECT jsonb_agg(ts.user_id::text) FROM team_supervisors ts
                  WHERE ts.tenant_id = t.tenant_id AND ts.team_id = t.id AND ts.supervisor_kind = 'OPERATIONAL'), '[]'::jsonb) AS "supervisorIds",
                COALESCE((SELECT jsonb_agg(ts.user_id::text) FROM team_supervisors ts
                  WHERE ts.tenant_id = t.tenant_id AND ts.team_id = t.id AND ts.supervisor_kind = 'QUALITY'), '[]'::jsonb) AS "qualityReviewerIds",
                COALESCE((SELECT jsonb_agg(twa.workflow_id::text) FROM team_workflow_access twa
                  WHERE twa.tenant_id = t.tenant_id AND twa.team_id = t.id), '[]'::jsonb) AS "workflowIds",
                COALESCE((SELECT count(*) FROM team_memberships tm WHERE tm.tenant_id = t.tenant_id AND tm.team_id = t.id AND tm.ends_at IS NULL), 0)::int AS "memberCount"
         FROM teams t WHERE t.tenant_id = $1::uuid ORDER BY t.name`,
        [actor.tenantId],
      ),
      this.database.tenantQuery(
        `SELECT id::text, name, status FROM workflow_drafts
         WHERE tenant_id = $1::uuid AND status <> 'ARCHIVED' ORDER BY name`,
        [actor.tenantId],
      ),
    ]);
    return { people, departments, workflows };
  }

  async updateProfile(
    token: string,
    userId: string,
    dto: UpdateWorkforceProfileDto,
  ) {
    const actor = this.platform.requireUser(token);
    const validUser = await this.database.tenantQuery(
      'SELECT 1 FROM users WHERE tenant_id = $1::uuid AND id = $2::uuid',
      [actor.tenantId, userId],
    );
    if (!validUser.length) throw new BadRequestException('USER_NOT_FOUND');
    if (dto.primaryTeamId) {
      const validTeam = await this.database.tenantQuery(
        'SELECT 1 FROM teams WHERE tenant_id = $1::uuid AND id = $2::uuid AND active',
        [actor.tenantId, dto.primaryTeamId],
      );
      if (!validTeam.length)
        throw new BadRequestException('ACTIVE_TEAM_REQUIRED');
    }
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        actor.tenantId,
      ]);
      await client.query(
        `INSERT INTO workforce_profiles (tenant_id, user_id, job_title, workforce_type, primary_team_id, can_receive_tasks, can_assign_tasks, can_verify_tasks)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6, $7, $8)
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET job_title = EXCLUDED.job_title,
           workforce_type = EXCLUDED.workforce_type, primary_team_id = EXCLUDED.primary_team_id,
           can_receive_tasks = EXCLUDED.can_receive_tasks, can_assign_tasks = EXCLUDED.can_assign_tasks,
           can_verify_tasks = EXCLUDED.can_verify_tasks, updated_at = clock_timestamp()`,
        [
          actor.tenantId,
          userId,
          dto.jobTitle.trim(),
          dto.workforceType,
          dto.primaryTeamId ?? null,
          dto.canReceiveTasks,
          dto.canAssignTasks,
          dto.canVerifyTasks,
        ],
      );
      await client.query(
        'DELETE FROM user_workflow_access WHERE tenant_id = $1::uuid AND user_id = $2::uuid',
        [actor.tenantId, userId],
      );
      for (const access of dto.workflowAccess)
        await client.query(
          `INSERT INTO user_workflow_access (tenant_id, user_id, workflow_id, access_level)
           SELECT $1::uuid, $2::uuid, id, $4 FROM workflow_drafts WHERE tenant_id = $1::uuid AND id = $3::uuid
           ON CONFLICT DO NOTHING`,
          [actor.tenantId, userId, access.workflowId, access.accessLevel],
        );
      if (dto.primaryTeamId) {
        await client.query(
          `INSERT INTO team_memberships (id, tenant_id, team_id, user_id, assigned_by)
           SELECT gen_random_uuid(), $1::uuid, id, $2::uuid, $3::uuid FROM teams
           WHERE tenant_id = $1::uuid AND id = $4::uuid
           ON CONFLICT DO NOTHING`,
          [actor.tenantId, userId, actor.id, dto.primaryTeamId],
        );
      }
    });
    return { userId, updated: true };
  }

  async updateDepartment(
    token: string,
    teamId: string,
    dto: UpdateDepartmentGovernanceDto,
  ) {
    const actor = this.platform.requireUser(token);
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        actor.tenantId,
      ]);
      const updated = await client.query(
        `UPDATE teams SET department_label = $3, verification_mode = $4, required_approvals = $5
         WHERE tenant_id = $1::uuid AND id = $2::uuid RETURNING id`,
        [
          actor.tenantId,
          teamId,
          dto.departmentLabel?.trim() || null,
          dto.verificationMode,
          dto.requiredApprovals,
        ],
      );
      if (!updated.rowCount) throw new BadRequestException('TEAM_NOT_FOUND');
      await client.query(
        'DELETE FROM team_supervisors WHERE tenant_id = $1::uuid AND team_id = $2::uuid',
        [actor.tenantId, teamId],
      );
      for (const userId of dto.supervisorIds)
        await client.query(
          `INSERT INTO team_supervisors (tenant_id, team_id, user_id, supervisor_kind)
          SELECT $1::uuid, $2::uuid, id, 'OPERATIONAL' FROM users WHERE tenant_id = $1::uuid AND id = $3::uuid ON CONFLICT DO NOTHING`,
          [actor.tenantId, teamId, userId],
        );
      for (const userId of dto.qualityReviewerIds)
        await client.query(
          `INSERT INTO team_supervisors (tenant_id, team_id, user_id, supervisor_kind)
          SELECT $1::uuid, $2::uuid, id, 'QUALITY' FROM users WHERE tenant_id = $1::uuid AND id = $3::uuid ON CONFLICT DO NOTHING`,
          [actor.tenantId, teamId, userId],
        );
      await client.query(
        'DELETE FROM team_workflow_access WHERE tenant_id = $1::uuid AND team_id = $2::uuid',
        [actor.tenantId, teamId],
      );
      for (const workflowId of dto.workflowIds)
        await client.query(
          `INSERT INTO team_workflow_access (tenant_id, team_id, workflow_id)
          SELECT $1::uuid, $2::uuid, id FROM workflow_drafts WHERE tenant_id = $1::uuid AND id = $3::uuid ON CONFLICT DO NOTHING`,
          [actor.tenantId, teamId, workflowId],
        );
    });
    return { teamId, updated: true };
  }

  platformStaff() {
    return this.database
      .query(`SELECT id::text, email, display_name AS "displayName", access_level AS "accessLevel",
      capabilities, active, created_at AS "createdAt" FROM platform_staff ORDER BY display_name`);
  }

  async createPlatformStaff(dto: CreatePlatformStaffDto) {
    const rows = await this.database.query(
      `INSERT INTO platform_staff (email, display_name, access_level, capabilities)
       VALUES ($1, $2, $3, $4::text[]) RETURNING id::text, email, display_name AS "displayName",
       access_level AS "accessLevel", capabilities, active`,
      [
        dto.email.trim().toLowerCase(),
        dto.displayName.trim(),
        dto.accessLevel,
        dto.capabilities,
      ],
    );
    return rows[0];
  }
}
