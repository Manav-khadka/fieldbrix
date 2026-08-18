import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database/database.service';

export type TenantRecord = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  timezone: string;
  users: number;
  branches: number;
  updatedAt: string;
  limits?: { users: number; branches: number; tasks: number };
};
type RoleRecord = {
  id: string;
  name: string;
  tenantId: string;
  preset: boolean;
  revision: number;
  permissions: string[];
  scopes: Record<string, string>;
};
export type SessionRecord = {
  id: string;
  userId: string;
  tenantId: string;
  tokenHash: string;
  tokenType: 'access' | 'refresh';
  expiresAt: string;
  familyId: string;
};
export type PasswordResetRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
};
export type AuditRecord = {
  id: string;
  tenantId?: string;
  actorId?: string;
  action: string;
  targetId: string;
  previousHash: string;
  hash: string;
  occurredAt: string;
};
export type GodSessionRecord = {
  id: string;
  platformAdminId: string;
  tenantId: string;
  reason: string;
  reauthenticatedAt: string;
  expiresAt: string;
  lastActivityAt: string;
};
export type DestructiveRequestRecord = {
  id: string;
  requesterAdminId: string;
  tenantId: string;
  action: string;
  targetId: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  reason: string;
  status:
    'REQUESTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'EXECUTED' | 'FAILED';
  approverAdminId?: string;
  expiresAt: string;
};

@Injectable()
export class PlatformRepository {
  constructor(private readonly database: DatabaseService) {}
  async isActivePlatformAdmin(id: string): Promise<boolean> {
    const rows = await this.database.query<{ active: boolean }>(
      'SELECT active FROM platform_administrators WHERE id = $1::uuid',
      [id],
    );
    return rows[0]?.active === true;
  }
  async findUserForLogin(identifier: string): Promise<
    | {
        id: string;
        email: string;
        name: string;
        password: string;
        tenantId: string;
        active: boolean;
      }
    | undefined
  > {
    const rows = await this.database.query<{
      id: string;
      email: string;
      name: string;
      password: string;
      tenantId: string;
      active: boolean;
    }>(
      'SELECT id::text, email, name, password, tenant_id::text AS "tenantId", active FROM fieldbrix_find_user_login($1)',
      [identifier],
    );
    return rows[0];
  }
  async findPasswordReset(tokenHash: string): Promise<
    | {
        userId: string;
        tenantId: string;
        email: string;
        name: string;
        password: string;
        active: boolean;
        expiresAt: string;
        consumedAt?: string;
      }
    | undefined
  > {
    const rows = await this.database.query<{
      userId: string;
      tenantId: string;
      email: string;
      name: string;
      password: string;
      active: boolean;
      expiresAt: string;
      consumedAt?: string;
    }>(
      'SELECT user_id::text AS "userId", tenant_id::text AS "tenantId", email, display_name AS name, password_hash AS password, active, expires_at AS "expiresAt", consumed_at AS "consumedAt" FROM fieldbrix_find_password_reset($1)',
      [tokenHash],
    );
    return rows[0];
  }
  async findRefreshSession(tokenHash: string): Promise<
    | {
        userId: string;
        tenantId: string;
        email: string;
        name: string;
        password: string;
        active: boolean;
        familyId: string;
        expiresAt: string;
        revokedAt?: string;
      }
    | undefined
  > {
    const rows = await this.database.query<{
      userId: string;
      tenantId: string;
      email: string;
      name: string;
      password: string;
      active: boolean;
      familyId: string;
      expiresAt: string;
      revokedAt?: string;
    }>(
      'SELECT user_id::text AS "userId", tenant_id::text AS "tenantId", email, display_name AS name, password_hash AS password, family_id::text AS "familyId", expires_at AS "expiresAt", revoked_at AS "revokedAt", active FROM fieldbrix_find_refresh_session($1)',
      [tokenHash],
    );
    return rows[0];
  }
  async findTenants(): Promise<TenantRecord[]> {
    const rows = await this.database.query<
      TenantRecord & {
        usersLimit: number;
        branchesLimit: number;
        tasksLimit: number;
      }
    >(
      "SELECT id::text, name, status, timezone, 0::int AS users, 0::int AS branches, updated_at AS \"updatedAt\", COALESCE((settings->'limits'->>'users')::int, 25) AS \"usersLimit\", COALESCE((settings->'limits'->>'branches')::int, 10) AS \"branchesLimit\", COALESCE((settings->'limits'->>'tasks')::int, 1000) AS \"tasksLimit\" FROM tenants ORDER BY name",
    );
    return rows.map(({ usersLimit, branchesLimit, tasksLimit, ...tenant }) => ({
      ...tenant,
      limits: { users: usersLimit, branches: branchesLimit, tasks: tasksLimit },
    }));
  }
  async findTenant(id: string): Promise<TenantRecord | undefined> {
    const rows = await this.database.query<
      TenantRecord & {
        usersLimit: number;
        branchesLimit: number;
        tasksLimit: number;
      }
    >(
      "SELECT id::text, name, status, timezone, 0::int AS users, 0::int AS branches, updated_at AS \"updatedAt\", COALESCE((settings->'limits'->>'users')::int, 25) AS \"usersLimit\", COALESCE((settings->'limits'->>'branches')::int, 10) AS \"branchesLimit\", COALESCE((settings->'limits'->>'tasks')::int, 1000) AS \"tasksLimit\" FROM tenants WHERE id = $1::uuid",
      [id],
    );
    const row = rows[0];
    if (!row) return undefined;
    const { usersLimit, branchesLimit, tasksLimit, ...tenant } = row;
    return {
      ...tenant,
      limits: { users: usersLimit, branches: branchesLimit, tasks: tasksLimit },
    };
  }
  async insertTenant(tenant: TenantRecord): Promise<TenantRecord> {
    const rows = await this.database.query<TenantRecord>(
      'INSERT INTO tenants (id, name, status, timezone) VALUES ($1::uuid, $2, $3, $4) RETURNING id::text, name, status, timezone, 0::int AS users, 0::int AS branches, updated_at AS "updatedAt"',
      [tenant.id, tenant.name, tenant.status, tenant.timezone],
    );
    return rows[0] ?? tenant;
  }
  async insertSession(session: SessionRecord): Promise<void> {
    await this.database.query(
      'INSERT INTO sessions (id, user_id, tenant_id, token_hash, token_type, expires_at, family_id) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::timestamptz, $7::uuid) ON CONFLICT (token_hash) DO NOTHING',
      [
        session.id,
        session.userId,
        session.tenantId,
        session.tokenHash,
        session.tokenType,
        session.expiresAt,
        session.familyId,
      ],
    );
  }
  async revokeSession(tokenHash: string): Promise<void> {
    await this.database.query(
      'UPDATE sessions SET revoked_at = clock_timestamp() WHERE token_hash = $1 AND revoked_at IS NULL',
      [tokenHash],
    );
  }
  async revokeUserSessions(userId: string): Promise<void> {
    await this.database.query(
      'UPDATE sessions SET revoked_at = clock_timestamp() WHERE user_id = $1::uuid AND revoked_at IS NULL',
      [userId],
    );
  }
  async revokeTenantSessions(tenantId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      await client.query(
        'UPDATE sessions SET revoked_at = clock_timestamp() WHERE tenant_id = $1::uuid AND revoked_at IS NULL',
        [tenantId],
      );
    });
  }
  async revokeTenantDevices(tenantId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      await client.query(
        'UPDATE device_installations SET revoked_at = clock_timestamp() WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1::uuid) AND revoked_at IS NULL',
        [tenantId],
      );
    });
  }
  async insertPasswordReset(
    record: PasswordResetRecord & { tenantId: string },
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        record.tenantId,
      ]);
      await client.query(
        'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1::uuid, $2::uuid, $3, $4::timestamptz) ON CONFLICT (token_hash) DO NOTHING',
        [record.id, record.userId, record.tokenHash, record.expiresAt],
      );
    });
  }
  async insertPasswordHistory(record: {
    id: string;
    userId: string;
    passwordHash: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO password_history (id, user_id, password_hash) VALUES ($1::uuid, $2::uuid, $3)',
      [record.id, record.userId, record.passwordHash],
    );
  }
  async consumePasswordReset(tokenHash: string): Promise<void> {
    await this.database.query(
      'UPDATE password_reset_tokens SET consumed_at = clock_timestamp() WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > clock_timestamp()',
      [tokenHash],
    );
  }
  async completePasswordReset(record: {
    userId: string;
    tenantId: string;
    tokenHash: string;
    passwordHash: string;
    previousPasswordHash: string;
  }): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        record.tenantId,
      ]);
      await client.query(
        'UPDATE users SET password_hash = $2 WHERE id = $1::uuid AND tenant_id = $3::uuid',
        [record.userId, record.passwordHash, record.tenantId],
      );
      await client.query(
        'INSERT INTO password_history (id, user_id, password_hash) VALUES ($1::uuid, $2::uuid, $3)',
        [randomUUID(), record.userId, record.previousPasswordHash],
      );
      const consumed = await client.query(
        'UPDATE password_reset_tokens SET consumed_at = clock_timestamp() WHERE token_hash = $1 AND user_id = $2::uuid AND consumed_at IS NULL AND expires_at > clock_timestamp() RETURNING id',
        [record.tokenHash, record.userId],
      );
      if (!consumed.rowCount) throw new Error('INVALID_RESET_TOKEN');
      await client.query(
        'UPDATE sessions SET revoked_at = clock_timestamp() WHERE user_id = $1::uuid AND revoked_at IS NULL',
        [record.userId],
      );
    });
  }
  async recordLoginAttempt(record: {
    id: string;
    userId?: string;
    identifierHash: string;
    succeeded: boolean;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO login_attempts (id, user_id, identifier_hash, succeeded) VALUES ($1::uuid, $2::uuid, $3, $4)',
      [
        record.id,
        record.userId ?? null,
        record.identifierHash,
        record.succeeded,
      ],
    );
  }
  async upsertAccountLockout(record: {
    userId: string;
    failedAttempts: number;
    firstFailedAt: string;
    lockedUntil?: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO account_lockouts (user_id, failed_attempts, first_failed_at, locked_until) VALUES ($1::uuid, $2, $3::timestamptz, $4::timestamptz) ON CONFLICT (user_id) DO UPDATE SET failed_attempts = EXCLUDED.failed_attempts, first_failed_at = EXCLUDED.first_failed_at, locked_until = EXCLUDED.locked_until, updated_at = clock_timestamp()',
      [
        record.userId,
        record.failedAttempts,
        record.firstFailedAt,
        record.lockedUntil ?? null,
      ],
    );
  }
  async findAccountLockout(
    userId: string,
  ): Promise<
    | { failedAttempts: number; firstFailedAt: string; lockedUntil?: string }
    | undefined
  > {
    const rows = await this.database.query<{
      failedAttempts: number;
      firstFailedAt: string;
      lockedUntil?: string;
    }>(
      'SELECT failed_attempts AS "failedAttempts", first_failed_at AS "firstFailedAt", locked_until AS "lockedUntil" FROM account_lockouts WHERE user_id = $1::uuid',
      [userId],
    );
    return rows[0];
  }
  async clearAccountLockout(userId: string): Promise<void> {
    await this.database.query(
      'DELETE FROM account_lockouts WHERE user_id = $1::uuid',
      [userId],
    );
  }
  async insertDevice(record: {
    id: string;
    userId: string;
    name: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO device_installations (id, user_id, device_name) VALUES ($1::uuid, $2::uuid, $3) ON CONFLICT (id) DO NOTHING',
      [record.id, record.userId, record.name],
    );
  }
  async findDevices(
    tenantId: string,
    userId: string,
  ): Promise<
    Array<{ id: string; userId: string; name: string; lastSeenAt: string }>
  > {
    return this.database.query(
      'SELECT d.id::text, d.user_id::text AS "userId", d.device_name AS name, d.last_seen_at AS "lastSeenAt" FROM device_installations d JOIN users u ON u.id = d.user_id WHERE u.tenant_id = $1::uuid AND d.user_id = $2::uuid AND d.revoked_at IS NULL ORDER BY d.last_seen_at DESC',
      [tenantId, userId],
    );
  }
  async revokeDevice(id: string, userId: string): Promise<void> {
    await this.database.query(
      'UPDATE device_installations SET revoked_at = clock_timestamp() WHERE id = $1::uuid AND user_id = $2::uuid AND revoked_at IS NULL',
      [id, userId],
    );
  }
  async revokeUserDevices(userId: string): Promise<void> {
    await this.database.query(
      'UPDATE device_installations SET revoked_at = clock_timestamp() WHERE user_id = $1::uuid AND revoked_at IS NULL',
      [userId],
    );
  }
  async insertAudit(record: AuditRecord): Promise<void> {
    await this.database.query(
      'INSERT INTO audit_logs (id, tenant_id, actor_id, action, target_type, target_id, previous_hash, hash, occurred_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9::timestamptz) ON CONFLICT (id) DO NOTHING',
      [
        record.id,
        record.tenantId ?? null,
        record.actorId ?? null,
        record.action,
        'domain',
        record.targetId,
        record.previousHash,
        record.hash,
        record.occurredAt,
      ],
    );
  }
  async findAudit(
    tenantId: string,
    action: string | undefined,
    offset: number,
    limit: number,
  ): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
    const rows = await this.database.query<Record<string, unknown>>(
      'SELECT id::text, action, actor_id::text AS "actorId", target_id AS "targetId", occurred_at AS "occurredAt", previous_hash AS "previousHash", hash FROM audit_logs WHERE tenant_id = $1::uuid AND ($2::text IS NULL OR lower(action) = lower($2)) ORDER BY occurred_at DESC OFFSET $3 LIMIT $4',
      [tenantId, action ?? null, offset, limit],
    );
    const count = await this.database.query<{ total: string }>(
      'SELECT count(*)::text AS total FROM audit_logs WHERE tenant_id = $1::uuid AND ($2::text IS NULL OR lower(action) = lower($2))',
      [tenantId, action ?? null],
    );
    return { data: rows, total: Number(count[0]?.total ?? 0) };
  }
  async upsertTenantSettings(
    tenantId: string,
    settings: Record<string, unknown>,
    actorId: string,
  ): Promise<void> {
    await this.database.query(
      'INSERT INTO tenant_settings (tenant_id, settings, updated_by) VALUES ($1::uuid, $2::jsonb, $3::uuid) ON CONFLICT (tenant_id) DO UPDATE SET settings = EXCLUDED.settings, revision = tenant_settings.revision + 1, updated_by = EXCLUDED.updated_by, updated_at = clock_timestamp()',
      [tenantId, JSON.stringify(settings), actorId],
    );
  }
  async findTenantSettings(
    tenantId: string,
  ): Promise<Record<string, unknown> | undefined> {
    const rows = await this.database.query<{
      settings: Record<string, unknown>;
    }>('SELECT settings FROM tenant_settings WHERE tenant_id = $1::uuid', [
      tenantId,
    ]);
    return rows[0]?.settings;
  }
  async findRoles(tenantId: string): Promise<
    Array<{
      id: string;
      name: string;
      tenantId: string;
      preset: boolean;
      revision: number;
      permissions: string[];
      scopes: Record<string, string>;
    }>
  > {
    return this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      const result = await client.query<RoleRecord>(
        'SELECT r.id::text, r.name, r.tenant_id::text AS "tenantId", r.immutable AS preset, r.revision, COALESCE(array_agg(rp.permission_key) FILTER (WHERE rp.permission_key IS NOT NULL), ARRAY[]::text[]) AS permissions, COALESCE(jsonb_object_agg(rp.permission_key, rp.grant_scope) FILTER (WHERE rp.permission_key IS NOT NULL), \'{}\'::jsonb) AS scopes FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id WHERE r.tenant_id = $1::uuid GROUP BY r.id ORDER BY r.name',
        [tenantId],
      );
      return result.rows;
    });
  }
  async insertSupportNote(record: {
    id: string;
    tenantId: string;
    actorId: string;
    note: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO support_notes (id, tenant_id, actor_id, note) VALUES ($1::uuid, $2::uuid, $3::uuid, $4)',
      [record.id, record.tenantId, record.actorId, record.note],
    );
  }
  async findSupportNotes(
    tenantId: string,
  ): Promise<
    Array<{ id: string; note: string; actorId: string; createdAt: string }>
  > {
    return this.database.query(
      'SELECT id::text, note, actor_id::text AS "actorId", created_at AS "createdAt" FROM support_notes WHERE tenant_id = $1::uuid ORDER BY created_at DESC',
      [tenantId],
    );
  }
  async insertBranch(record: {
    id: string;
    tenantId: string;
    name: string;
    timezone: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO branches (id, tenant_id, name, timezone) VALUES ($1::uuid, $2::uuid, $3, $4) ON CONFLICT (id) DO NOTHING',
      [record.id, record.tenantId, record.name, record.timezone],
    );
  }
  async findBranches(tenantId: string): Promise<
    Array<{
      id: string;
      tenantId: string;
      name: string;
      timezone: string;
      active: boolean;
    }>
  > {
    return this.database.query(
      'SELECT id::text, tenant_id::text AS "tenantId", name, timezone, active FROM branches WHERE tenant_id = $1::uuid ORDER BY name',
      [tenantId],
    );
  }
  async updateBranch(
    id: string,
    tenantId: string,
    patch: { name?: string; timezone?: string; active?: boolean },
  ): Promise<void> {
    await this.database.query(
      'UPDATE branches SET name = COALESCE($3, name), timezone = COALESCE($4, timezone), active = COALESCE($5, active) WHERE id = $1::uuid AND tenant_id = $2::uuid',
      [
        id,
        tenantId,
        patch.name ?? null,
        patch.timezone ?? null,
        patch.active ?? null,
      ],
    );
  }
  async insertTeam(record: {
    id: string;
    tenantId: string;
    name: string;
    leadUserId?: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO teams (id, tenant_id, name, lead_user_id) VALUES ($1::uuid, $2::uuid, $3, $4::uuid) ON CONFLICT (id) DO NOTHING',
      [record.id, record.tenantId, record.name, record.leadUserId ?? null],
    );
  }
  async findTeams(tenantId: string): Promise<
    Array<{
      id: string;
      tenantId: string;
      name: string;
      leadUserId?: string;
      active: boolean;
    }>
  > {
    return this.database.query(
      'SELECT id::text, tenant_id::text AS "tenantId", name, lead_user_id::text AS "leadUserId", active FROM teams WHERE tenant_id = $1::uuid ORDER BY name',
      [tenantId],
    );
  }
  async updateTeam(
    id: string,
    tenantId: string,
    patch: { name?: string; leadUserId?: string; active?: boolean },
  ): Promise<void> {
    await this.database.query(
      'UPDATE teams SET name = COALESCE($3, name), lead_user_id = COALESCE($4::uuid, lead_user_id), active = COALESCE($5, active) WHERE id = $1::uuid AND tenant_id = $2::uuid',
      [
        id,
        tenantId,
        patch.name ?? null,
        patch.leadUserId ?? null,
        patch.active ?? null,
      ],
    );
  }
  async insertInvitation(record: {
    id: string;
    tenantId: string;
    email: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO invitations (id, tenant_id, email, token_hash, expires_at) VALUES ($1::uuid, $2::uuid, $3, $4, $5::timestamptz) ON CONFLICT (token_hash) DO NOTHING',
      [
        record.id,
        record.tenantId,
        record.email,
        record.tokenHash,
        record.expiresAt,
      ],
    );
  }
  async consumeInvitation(tokenHash: string): Promise<void> {
    await this.database.query(
      'UPDATE invitations SET accepted_at = clock_timestamp() WHERE token_hash = $1 AND accepted_at IS NULL AND cancelled_at IS NULL AND expires_at > clock_timestamp()',
      [tokenHash],
    );
  }
  async cancelInvitation(tenantId: string, tokenHash: string): Promise<void> {
    await this.database.query(
      'UPDATE invitations SET cancelled_at = clock_timestamp() WHERE tenant_id = $1::uuid AND token_hash = $2 AND accepted_at IS NULL AND cancelled_at IS NULL',
      [tenantId, tokenHash],
    );
  }
  async findInvitation(tokenHash: string): Promise<
    | {
        tenantId: string;
        email: string;
        expiresAt: string;
        acceptedAt?: string;
      }
    | undefined
  > {
    const rows = await this.database.query<{
      tenantId: string;
      email: string;
      expiresAt: string;
      acceptedAt?: string;
    }>(
      'SELECT tenant_id::text AS "tenantId", email, expires_at AS "expiresAt", accepted_at AS "acceptedAt" FROM fieldbrix_lookup_invitation($1)',
      [tokenHash],
    );
    return rows[0];
  }
  async insertUser(record: {
    id: string;
    tenantId: string;
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO users (id, tenant_id, email, display_name, password_hash) VALUES ($1::uuid, $2::uuid, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
      [
        record.id,
        record.tenantId,
        record.email,
        record.displayName,
        record.passwordHash,
      ],
    );
  }
  async acceptInvitation(record: {
    userId: string;
    tenantId: string;
    email: string;
    displayName: string;
    passwordHash: string;
    tokenHash: string;
  }): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        record.tenantId,
      ]);
      const consumed = await client.query(
        'UPDATE invitations SET accepted_at = clock_timestamp() WHERE token_hash = $1 AND accepted_at IS NULL AND cancelled_at IS NULL AND expires_at > clock_timestamp() RETURNING id',
        [record.tokenHash],
      );
      if (!consumed.rowCount) throw new ConflictException('INVITATION_INVALID');
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name, password_hash) VALUES ($1::uuid, $2::uuid, $3, $4, $5)',
        [
          record.userId,
          record.tenantId,
          record.email,
          record.displayName,
          record.passwordHash,
        ],
      );
      await client.query(
        'INSERT INTO user_tenant_memberships (id, user_id, tenant_id) VALUES ($1::uuid, $2::uuid, $3::uuid) ON CONFLICT (user_id, tenant_id) DO NOTHING',
        [randomUUID(), record.userId, record.tenantId],
      );
    });
  }
  async findUsers(
    tenantId: string,
    search: string | undefined,
    offset: number,
    limit: number,
  ): Promise<{
    data: Array<{
      id: string;
      email: string;
      name: string;
      password: string;
      tenantId: string;
      active: boolean;
      roles: string[];
    }>;
    total: number;
  }> {
    const pattern = search ? `%${search}%` : null;
    const data = await this.database.query<{
      id: string;
      email: string;
      name: string;
      password: string;
      tenantId: string;
      active: boolean;
      roles: string[];
    }>(
      'SELECT u.id::text, u.email::text, u.display_name AS name, \'\' AS password, u.tenant_id::text AS "tenantId", u.active, COALESCE(ARRAY(SELECT role_id::text FROM tenant_user_roles tur WHERE tur.tenant_id = u.tenant_id AND tur.user_id = u.id), ARRAY[]::text[]) AS roles FROM users u WHERE u.tenant_id = $1::uuid AND ($2::text IS NULL OR u.email::text ILIKE $2 OR u.display_name ILIKE $2) ORDER BY u.display_name OFFSET $3 LIMIT $4',
      [tenantId, pattern, offset, limit],
    );
    const count = await this.database.query<{ total: string }>(
      'SELECT count(*)::text AS total FROM users WHERE tenant_id = $1::uuid AND ($2::text IS NULL OR email::text ILIKE $2 OR display_name ILIKE $2)',
      [tenantId, pattern],
    );
    return { data, total: Number(count[0]?.total ?? 0) };
  }
  async findUserRoleIds(tenantId: string, userId: string): Promise<string[]> {
    return this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      const result = await client.query<{ roleId: string }>(
        'SELECT role_id::text AS "roleId" FROM tenant_user_roles WHERE tenant_id = $1::uuid AND user_id = $2::uuid ORDER BY role_id',
        [tenantId, userId],
      );
      return result.rows.map((row) => row.roleId);
    });
  }
  async findUserMembership(
    membershipId: string,
    userId: string,
  ): Promise<
    { membershipId: string; tenantId: string; active: boolean } | undefined
  > {
    const rows = await this.database.query<{
      membershipId: string;
      tenantId: string;
      active: boolean;
    }>(
      'SELECT membership_id::text AS "membershipId", tenant_id::text AS "tenantId", active FROM fieldbrix_lookup_user_membership($1::uuid, $2::uuid)',
      [membershipId, userId],
    );
    return rows[0];
  }
  async findUserMemberships(userId: string): Promise<
    Array<{
      membershipId: string;
      tenantId: string;
      name: string;
      status: string;
      timezone: string;
      active: boolean;
    }>
  > {
    return this.database.query(
      'SELECT membership_id::text AS "membershipId", tenant_id::text AS "tenantId", tenant_name AS name, tenant_status AS status, timezone, active FROM fieldbrix_list_user_memberships($1::uuid)',
      [userId],
    );
  }
  async insertRole(record: {
    id: string;
    tenantId: string;
    name: string;
    preset: boolean;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO roles (id, tenant_id, name, preset_source, immutable) VALUES ($1::uuid, $2::uuid, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
      [
        record.id,
        record.tenantId,
        record.name,
        record.preset ? record.name : null,
        record.preset,
      ],
    );
  }
  async replaceRolePermissions(
    roleId: string,
    permissions: string[],
    scopes: Record<string, string> = {},
    expectedRevision?: number,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      const updated = await client.query(
        'UPDATE roles SET revision = revision + 1 WHERE id = $1::uuid AND ($2::bigint IS NULL OR revision = $2::bigint) RETURNING revision',
        [roleId, expectedRevision ?? null],
      );
      if (!updated.rowCount)
        throw new ConflictException('ROLE_REVISION_CONFLICT');
      await client.query(
        'DELETE FROM role_permissions WHERE role_id = $1::uuid',
        [roleId],
      );
      for (const permission of permissions)
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_key, grant_scope) VALUES ($1::uuid, $2, $3) ON CONFLICT DO NOTHING',
          [roleId, permission, scopes[permission] ?? 'all'],
        );
    });
  }
  async updateRoleMetadata(
    id: string,
    tenantId: string,
    name: string,
    expectedRevision?: number,
  ): Promise<void> {
    const rows = await this.database.query(
      'UPDATE roles SET name = $3, revision = revision + 1 WHERE id = $1::uuid AND tenant_id = $2::uuid AND immutable = false AND ($4::bigint IS NULL OR revision = $4::bigint) RETURNING id',
      [id, tenantId, name, expectedRevision ?? null],
    );
    if (!rows.length) throw new ConflictException('ROLE_REVISION_CONFLICT');
  }
  async replaceUserRoles(
    tenantId: string,
    userId: string,
    roleIds: string[],
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(
        'DELETE FROM tenant_user_roles WHERE tenant_id = $1::uuid AND user_id = $2::uuid',
        [tenantId, userId],
      );
      for (const roleId of roleIds)
        await client.query(
          'INSERT INTO tenant_user_roles (tenant_id, user_id, role_id) VALUES ($1::uuid, $2::uuid, $3::uuid) ON CONFLICT DO NOTHING',
          [tenantId, userId, roleId],
        );
    });
  }
  async deleteRole(id: string, tenantId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(
        'DELETE FROM tenant_user_roles WHERE tenant_id = $1::uuid AND role_id = $2::uuid',
        [tenantId, id],
      );
      await client.query(
        'DELETE FROM role_permissions WHERE role_id = $1::uuid',
        [id],
      );
      await client.query(
        'DELETE FROM roles WHERE id = $1::uuid AND tenant_id = $2::uuid',
        [id, tenantId],
      );
    });
  }
  async countRoleAssignments(
    roleId: string,
    tenantId: string,
  ): Promise<number> {
    const rows = await this.database.query<{ total: string }>(
      'SELECT count(*)::text AS total FROM tenant_user_roles WHERE role_id = $1::uuid AND tenant_id = $2::uuid',
      [roleId, tenantId],
    );
    return Number(rows[0]?.total ?? 0);
  }
  async updateUser(
    id: string,
    tenantId: string,
    patch: { name?: string; active?: boolean },
  ): Promise<void> {
    await this.database.query(
      'UPDATE users SET display_name = COALESCE($3, display_name), active = COALESCE($4, active) WHERE id = $1::uuid AND tenant_id = $2::uuid',
      [id, tenantId, patch.name ?? null, patch.active ?? null],
    );
  }
  async insertSkill(record: {
    id: string;
    tenantId: string;
    name: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO skills (id, tenant_id, name) VALUES ($1::uuid, $2::uuid, $3) ON CONFLICT (id) DO NOTHING',
      [record.id, record.tenantId, record.name],
    );
  }
  async findSkills(
    tenantId: string,
  ): Promise<
    Array<{ id: string; tenantId: string; name: string; active: boolean }>
  > {
    return this.database.query(
      'SELECT id::text, tenant_id::text AS "tenantId", name, active FROM skills WHERE tenant_id = $1::uuid AND active ORDER BY name',
      [tenantId],
    );
  }
  async replaceUserSkills(
    tenantId: string,
    userId: string,
    skillIds: string[],
    assignedBy: string,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(
        'DELETE FROM user_skills WHERE tenant_id = $1::uuid AND user_id = $2::uuid',
        [tenantId, userId],
      );
      for (const skillId of skillIds)
        await client.query(
          'INSERT INTO user_skills (tenant_id, user_id, skill_id, assigned_by) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid) ON CONFLICT DO NOTHING',
          [tenantId, userId, skillId, assignedBy],
        );
    });
  }
  async findUserSkills(
    tenantId: string,
    userId: string,
  ): Promise<
    Array<{ id: string; tenantId: string; name: string; active: boolean }>
  > {
    return this.database.query(
      'SELECT s.id::text, s.tenant_id::text AS "tenantId", s.name, s.active FROM skills s JOIN user_skills us ON us.skill_id = s.id WHERE us.tenant_id = $1::uuid AND us.user_id = $2::uuid AND s.active ORDER BY s.name',
      [tenantId, userId],
    );
  }
  async updateTenant(
    id: string,
    patch: { name?: string; status?: string; timezone?: string },
  ): Promise<void> {
    await this.database.query(
      'UPDATE tenants SET name = COALESCE($2, name), status = COALESCE($3, status), timezone = COALESCE($4, timezone), updated_at = clock_timestamp() WHERE id = $1::uuid',
      [id, patch.name ?? null, patch.status ?? null, patch.timezone ?? null],
    );
  }
  async archiveTenant(tenantId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      await client.query(
        "UPDATE tenants SET status = 'ARCHIVED', updated_at = clock_timestamp() WHERE id = $1::uuid AND status <> 'ARCHIVED'",
        [tenantId],
      );
      await client.query(
        'UPDATE sessions SET revoked_at = clock_timestamp() WHERE tenant_id = $1::uuid AND revoked_at IS NULL',
        [tenantId],
      );
      await client.query(
        'UPDATE device_installations SET revoked_at = clock_timestamp() WHERE user_id IN (SELECT id FROM users WHERE tenant_id = $1::uuid) AND revoked_at IS NULL',
        [tenantId],
      );
    });
  }
  async updateTenantLimits(
    id: string,
    limits: { users: number; branches: number; tasks: number },
  ): Promise<void> {
    await this.database.query(
      "UPDATE tenants SET settings = jsonb_set(jsonb_set(jsonb_set(settings, '{limits,users}', to_jsonb($2::integer), true), '{limits,branches}', to_jsonb($3::integer), true), '{limits,tasks}', to_jsonb($4::integer), true), updated_at = clock_timestamp() WHERE id = $1::uuid",
      [id, limits.users, limits.branches, limits.tasks],
    );
  }
  async findTenantLimitUsage(
    tenantId: string,
  ): Promise<{ users: number; branches: number }> {
    return this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      const users = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM users WHERE tenant_id = $1::uuid AND active = true',
        [tenantId],
      );
      const branches = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM branches WHERE tenant_id = $1::uuid AND active = true',
        [tenantId],
      );
      return {
        users: Number(users.rows[0]?.count ?? 0),
        branches: Number(branches.rows[0]?.count ?? 0),
      };
    });
  }
  async insertUsageSnapshot(record: {
    tenantId: string;
    activeUsers: number;
    activeBranches: number;
    completedTasks: number;
    evidenceBytes: number;
    lastActivityAt: string;
    syncHealth: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO tenant_usage_snapshots (tenant_id, active_users, active_branches, completed_tasks, evidence_bytes, last_activity_at, sync_health) VALUES ($1::uuid, $2, $3, $4, $5, $6::timestamptz, $7)',
      [
        record.tenantId,
        record.activeUsers,
        record.activeBranches,
        record.completedTasks,
        record.evidenceBytes,
        record.lastActivityAt,
        record.syncHealth,
      ],
    );
  }
  async findLatestUsage(tenantId: string): Promise<
    | {
        activeUsers: number;
        activeBranches: number;
        completedTasks: number;
        evidenceBytes: number;
        lastActivityAt: string;
        syncHealth: 'healthy' | 'degraded' | 'inactive';
      }
    | undefined
  > {
    const rows = await this.database.query<{
      activeUsers: number;
      activeBranches: number;
      completedTasks: number;
      evidenceBytes: number;
      lastActivityAt: string;
      syncHealth: 'healthy' | 'degraded' | 'inactive';
    }>(
      'SELECT active_users AS "activeUsers", active_branches AS "activeBranches", completed_tasks AS "completedTasks", evidence_bytes AS "evidenceBytes", last_activity_at AS "lastActivityAt", sync_health AS "syncHealth" FROM tenant_usage_snapshots WHERE tenant_id = $1::uuid ORDER BY captured_at DESC LIMIT 1',
      [tenantId],
    );
    return rows[0];
  }
  /**
   * Real sync/import/inactivity health, computed on demand rather than
   * stored as a static default. `outbox_events` is the tenant's actual sync
   * timeline — every task/workflow/master-data/import mutation appends one
   * (indexed by `outbox_tenant_idx (tenant_id, created_at DESC)`), so its
   * most recent row is a far more complete activity signal than any single
   * module's own audit trail. `DEAD_LETTERED` rows are sync deliveries that
   * genuinely failed; recent import job failures are a second, business-
   * level source of the same "something isn't syncing cleanly" signal.
   */
  async computeSyncHealth(tenantId: string): Promise<{
    syncHealth: 'healthy' | 'degraded' | 'inactive';
    lastActivityAt: string | null;
  }> {
    const [activityRows, deadLetterRows, importFailureRows] = await Promise.all(
      [
        this.database.query<{ lastActivityAt: string | null }>(
          'SELECT MAX(created_at) AS "lastActivityAt" FROM outbox_events WHERE tenant_id = $1::uuid',
          [tenantId],
        ),
        this.database.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM outbox_events
           WHERE tenant_id = $1::uuid AND status = 'DEAD_LETTERED'
             AND created_at > now() - interval '24 hours'`,
          [tenantId],
        ),
        this.database.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM import_jobs
           WHERE tenant_id = $1::uuid AND status IN ('FAILED', 'PARTIAL')
             AND updated_at > now() - interval '24 hours'`,
          [tenantId],
        ),
      ],
    );
    const lastActivityAt = activityRows[0]?.lastActivityAt ?? null;
    const recentFailures =
      Number(deadLetterRows[0]?.count ?? 0) +
      Number(importFailureRows[0]?.count ?? 0);
    const inactiveThresholdMs = 14 * 24 * 60 * 60_000;
    const syncHealth =
      !lastActivityAt ||
      Date.now() - new Date(lastActivityAt).getTime() > inactiveThresholdMs
        ? 'inactive'
        : recentFailures > 0
          ? 'degraded'
          : 'healthy';
    return { syncHealth, lastActivityAt };
  }
  async insertGodSession(record: GodSessionRecord): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        record.tenantId,
      ]);
      await client.query(
        'INSERT INTO god_sessions (id, platform_admin_id, tenant_id, reason, reauthenticated_at, expires_at, last_activity_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::timestamptz, $6::timestamptz, $7::timestamptz) ON CONFLICT (id) DO NOTHING',
        [
          record.id,
          record.platformAdminId,
          record.tenantId,
          record.reason,
          record.reauthenticatedAt,
          record.expiresAt,
          record.lastActivityAt,
        ],
      );
    });
  }
  async findGodSession(
    id: string,
    tenantId: string,
  ): Promise<(GodSessionRecord & { endedAt?: string }) | undefined> {
    return this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      const result = await client.query<
        GodSessionRecord & { endedAt?: string }
      >(
        'SELECT id::text, platform_admin_id::text AS "platformAdminId", tenant_id::text AS "tenantId", reason, reauthenticated_at AS "reauthenticatedAt", expires_at AS "expiresAt", last_activity_at AS "lastActivityAt", ended_at AS "endedAt" FROM god_sessions WHERE id = $1::uuid AND tenant_id = $2::uuid',
        [id, tenantId],
      );
      return result.rows[0];
    });
  }
  async touchGodSession(id: string, tenantId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      await client.query(
        'UPDATE god_sessions SET last_activity_at = clock_timestamp() WHERE id = $1::uuid AND tenant_id = $2::uuid AND ended_at IS NULL',
        [id, tenantId],
      );
    });
  }
  async endGodSession(id: string, tenantId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      await client.query(
        'UPDATE god_sessions SET ended_at = clock_timestamp() WHERE id = $1::uuid AND tenant_id = $2::uuid AND ended_at IS NULL',
        [id, tenantId],
      );
    });
  }
  async addBranchMembership(record: {
    id: string;
    tenantId: string;
    branchId: string;
    userId: string;
    assignedBy: string;
  }): Promise<void> {
    await this.database.query(
      'UPDATE branch_memberships SET ends_at = clock_timestamp() WHERE tenant_id = $1::uuid AND branch_id = $2::uuid AND user_id = $3::uuid AND ends_at IS NULL; INSERT INTO branch_memberships (id, tenant_id, branch_id, user_id, assigned_by) VALUES ($4::uuid, $1::uuid, $2::uuid, $3::uuid, $5::uuid)',
      [
        record.tenantId,
        record.branchId,
        record.userId,
        record.id,
        record.assignedBy,
      ],
    );
  }
  async addTeamMembership(record: {
    id: string;
    tenantId: string;
    teamId: string;
    userId: string;
    assignedBy: string;
  }): Promise<void> {
    await this.database.query(
      'UPDATE team_memberships SET ends_at = clock_timestamp() WHERE tenant_id = $1::uuid AND team_id = $2::uuid AND user_id = $3::uuid AND ends_at IS NULL; INSERT INTO team_memberships (id, tenant_id, team_id, user_id, assigned_by) VALUES ($4::uuid, $1::uuid, $2::uuid, $3::uuid, $5::uuid)',
      [
        record.tenantId,
        record.teamId,
        record.userId,
        record.id,
        record.assignedBy,
      ],
    );
  }
  async endBranchMembership(
    tenantId: string,
    branchId: string,
    userId: string,
  ): Promise<void> {
    await this.database.query(
      'UPDATE branch_memberships SET ends_at = clock_timestamp() WHERE tenant_id = $1::uuid AND branch_id = $2::uuid AND user_id = $3::uuid AND ends_at IS NULL',
      [tenantId, branchId, userId],
    );
  }
  async endTeamMembership(
    tenantId: string,
    teamId: string,
    userId: string,
  ): Promise<void> {
    await this.database.query(
      'UPDATE team_memberships SET ends_at = clock_timestamp() WHERE tenant_id = $1::uuid AND team_id = $2::uuid AND user_id = $3::uuid AND ends_at IS NULL',
      [tenantId, teamId, userId],
    );
  }
  async findBranchMemberships(
    tenantId: string,
    branchId: string,
  ): Promise<
    Array<{ id: string; userId: string; startsAt: string; endsAt?: string }>
  > {
    return this.database.query(
      'SELECT id::text, user_id::text AS "userId", starts_at AS "startsAt", ends_at AS "endsAt" FROM branch_memberships WHERE tenant_id = $1::uuid AND branch_id = $2::uuid ORDER BY starts_at DESC',
      [tenantId, branchId],
    );
  }
  async findTeamMemberships(
    tenantId: string,
    teamId: string,
  ): Promise<
    Array<{ id: string; userId: string; startsAt: string; endsAt?: string }>
  > {
    return this.database.query(
      'SELECT id::text, user_id::text AS "userId", starts_at AS "startsAt", ends_at AS "endsAt" FROM team_memberships WHERE tenant_id = $1::uuid AND team_id = $2::uuid ORDER BY starts_at DESC',
      [tenantId, teamId],
    );
  }
  async recordTeamLead(record: {
    id: string;
    tenantId: string;
    teamId: string;
    leadUserId?: string;
    changedBy: string;
  }): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        record.tenantId,
      ]);
      await client.query(
        'UPDATE team_lead_history SET ends_at = clock_timestamp() WHERE tenant_id = $1::uuid AND team_id = $2::uuid AND ends_at IS NULL',
        [record.tenantId, record.teamId],
      );
      await client.query(
        'INSERT INTO team_lead_history (id, tenant_id, team_id, lead_user_id, changed_by) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid)',
        [
          record.id,
          record.tenantId,
          record.teamId,
          record.leadUserId ?? null,
          record.changedBy,
        ],
      );
    });
  }
  async insertDestructiveRequest(
    record: DestructiveRequestRecord,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        record.tenantId,
      ]);
      await client.query(
        'INSERT INTO destructive_requests (id, requester_admin_id, tenant_id, action, target_id, payload, payload_hash, reason, status, expires_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::jsonb, $7, $8, $9, $10::timestamptz) ON CONFLICT (id) DO NOTHING',
        [
          record.id,
          record.requesterAdminId,
          record.tenantId,
          record.action,
          record.targetId,
          JSON.stringify(record.payload),
          record.payloadHash,
          record.reason,
          record.status,
          record.expiresAt,
        ],
      );
    });
  }
  async findDestructiveRequest(
    id: string,
    tenantId: string,
  ): Promise<DestructiveRequestRecord | undefined> {
    return this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      const result = await client.query<DestructiveRequestRecord>(
        'SELECT id::text, requester_admin_id::text AS "requesterAdminId", tenant_id::text AS "tenantId", action, target_id AS "targetId", payload, payload_hash AS "payloadHash", reason, status, approver_admin_id::text AS "approverAdminId", expires_at AS "expiresAt" FROM destructive_requests WHERE id = $1::uuid AND tenant_id = $2::uuid',
        [id, tenantId],
      );
      return result.rows[0];
    });
  }
  async updateDestructiveRequest(
    id: string,
    tenantId: string,
    status: DestructiveRequestRecord['status'],
    approverAdminId?: string,
    executed = false,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', [
        'app.tenant_id',
        tenantId,
      ]);
      await client.query(
        "UPDATE destructive_requests SET status = $3, approver_admin_id = COALESCE($4::uuid, approver_admin_id), approved_at = CASE WHEN $3 = 'APPROVED' THEN clock_timestamp() ELSE approved_at END, executed_at = CASE WHEN $5 THEN clock_timestamp() ELSE executed_at END WHERE id = $1::uuid AND tenant_id = $2::uuid",
        [id, tenantId, status, approverAdminId ?? null, executed],
      );
    });
  }
  async insertFile(record: {
    id: string;
    tenantId: string;
    objectKey: string;
    mime: string;
    size: number;
    checksum: string;
    actorId: string;
  }): Promise<void> {
    await this.database.query(
      'INSERT INTO files (id, tenant_id, object_key, mime_type, byte_size, checksum, created_by) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid) ON CONFLICT (id) DO NOTHING',
      [
        record.id,
        record.tenantId,
        record.objectKey,
        record.mime,
        record.size,
        record.checksum,
        record.actorId,
      ],
    );
  }
  async completeFile(id: string, tenantId: string): Promise<void> {
    await this.database.query(
      "UPDATE files SET status = 'COMPLETED', completed_at = clock_timestamp() WHERE id = $1::uuid AND tenant_id = $2::uuid AND status = 'PENDING'",
      [id, tenantId],
    );
  }
  async findFile(
    id: string,
    tenantId: string,
  ): Promise<
    | {
        id: string;
        tenantId: string;
        key: string;
        mime: string;
        size: number;
        checksum: string;
        status: string;
      }
    | undefined
  > {
    const rows = await this.database.query<{
      id: string;
      tenantId: string;
      key: string;
      mime: string;
      size: number;
      checksum: string;
      status: string;
    }>(
      'SELECT id::text, tenant_id::text AS "tenantId", object_key AS key, mime_type AS mime, byte_size::int AS size, checksum, status FROM files WHERE id = $1::uuid AND tenant_id = $2::uuid',
      [id, tenantId],
    );
    return rows[0];
  }
}
