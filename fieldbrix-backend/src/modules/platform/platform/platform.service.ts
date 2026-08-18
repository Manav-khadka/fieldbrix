import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PlatformRepository } from '../platform.repository/platform.repository';
import { TenantContextService } from '../../tenant-context/tenant-context/tenant-context.service';
import { StorageService } from '../../storage/storage/storage.service';
import { QueueService } from '../../queue/queue/queue.service';
import { NotificationsService } from '../../notifications/notifications/notifications.service';

const COMPANY_DATE_FORMATS = [
  'YYYY-MM-DD',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
] as const;
const COMPANY_NUMBER_FORMATS = ['1,234.56', '1.234,56', '1 234,56'] as const;

type Tenant = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  timezone: string;
  users: number;
  branches: number;
  updatedAt: string;
  limits?: { users: number; branches: number; tasks: number };
};
type User = {
  id: string;
  email: string;
  name: string;
  password: string;
  tenantId: string;
  active: boolean;
  roles: string[];
  session?: string;
  lockedUntil?: number;
  deviceIds?: string[];
  memberships?: Array<{
    membershipId: string;
    tenantId: string;
    name: string;
    status: string;
    timezone: string;
    active: boolean;
  }>;
};
type PermissionScope = 'own' | 'team' | 'branch' | 'all';
type Role = {
  id: string;
  name: string;
  tenantId: string;
  preset: boolean;
  permissions: string[];
  scopes?: Record<string, PermissionScope>;
  revision: number;
};
type SessionMetadata = {
  familyId: string;
  tokenType: 'access' | 'refresh';
  expiresAt: number;
  revoked: boolean;
};
const BCRYPT_COST = 12;
const hashPassword = (password: string) =>
  bcrypt.hashSync(password, BCRYPT_COST);
const verifyPassword = (password: string, stored: string) => {
  if (!stored.startsWith('$2')) return false;
  return bcrypt.compareSync(password, stored);
};

@Injectable()
export class PlatformService {
  constructor(
    private readonly repository: PlatformRepository,
    private readonly tenantContext: TenantContextService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
    private readonly notifications: NotificationsService,
  ) {}
  readonly permissions = [
    'company.settings.view',
    'company.settings.edit',
    'company.branches.view',
    'company.branches.edit',
    'company.teams.view',
    'company.teams.edit',
    'iam.users.view',
    'iam.users.invite',
    'iam.users.edit',
    'iam.users.deactivate',
    'iam.assignments.configure',
    'iam.roles.view',
    'iam.roles.create',
    'iam.roles.edit',
    'iam.roles.configure',
    'audit.events.view',
    'platform.support.notes',
    'master.customers.view',
    'master.customers.create',
    'master.customers.edit',
    'master.sites.view',
    'master.sites.create',
    'master.sites.edit',
    'master.targets.view',
    'master.targets.create',
    'master.targets.edit',
    'master.parts.view',
    'master.parts.create',
    'master.parts.edit',
    'master.imports.view',
    'master.imports.create',
    'master.imports.commit',
    'workflows.view',
    'workflows.create',
    'workflows.edit',
    'workflows.publish',
    'workflows.archive',
    'tasks.view',
    'tasks.create',
    'tasks.edit',
    'tasks.assign',
    'tasks.cancel',
    'tasks.reopen',
    'tasks.request_action',
    'tasks.history.view',
  ];
  private capabilityRevision = 1;
  readonly tenants: Tenant[] = [
    {
      id: 'tenant-demo',
      name: 'FieldBrix Demo Company',
      status: 'ACTIVE',
      timezone: 'Asia/Muscat',
      users: 3,
      branches: 2,
      updatedAt: new Date().toISOString(),
    },
  ];
  readonly users: User[] = [
    {
      id: 'user-admin',
      email: 'admin@fieldbrix.local',
      name: 'Demo Administrator',
      password: hashPassword('ChangeMe123!'),
      tenantId: 'tenant-demo',
      active: true,
      roles: ['role-company-admin'],
    },
  ];
  readonly roles: Role[] = [
    {
      id: 'role-company-admin',
      name: 'Company Admin',
      tenantId: 'tenant-demo',
      preset: true,
      permissions: this.permissions,
      revision: 1,
    },
  ];
  readonly sessions = new Map<string, User>();
  readonly sessionMetadata = new Map<string, SessionMetadata>();
  readonly consumedSessionFamilies = new Map<string, string>();
  readonly revokedSessionFamilies = new Set<string>();
  readonly loginFailures = new Map<
    string,
    { count: number; windowStartedAt: number }
  >();
  readonly audit: Array<Record<string, unknown>> = [];
  readonly godSessions = new Map<
    string,
    {
      tenantId: string;
      reason: string;
      createdAt: number;
      expiresAt: number;
      lastActivityAt: number;
    }
  >();
  readonly resetTokens = new Map<
    string,
    { userId: string; expiresAt: number }
  >();
  readonly passwordHistory = new Map<string, string[]>();
  readonly devices = new Map<
    string,
    { id: string; userId: string; name: string; lastSeenAt: string }
  >();
  readonly branches: Array<{
    id: string;
    tenantId: string;
    name: string;
    timezone: string;
    active: boolean;
  }> = [];
  readonly teams: Array<{
    id: string;
    tenantId: string;
    name: string;
    leadUserId?: string;
    active: boolean;
  }> = [];
  readonly branchMemberships = new Map<string, Set<string>>();
  readonly teamMemberships = new Map<string, Set<string>>();
  readonly companySettings = new Map<string, Record<string, unknown>>([
    [
      'tenant-demo',
      {
        locale: 'en-GB',
        timezone: 'Asia/Muscat',
        terminology: {},
        workingDays: [1, 2, 3, 4, 5],
        workingHours: { start: '08:00', end: '17:00' },
        enabledModules: ['dashboard', 'company', 'users', 'roles'],
      },
    ],
  ]);
  readonly destructiveRequests: Array<{
    id: string;
    tenantId: string;
    reason: string;
    action: string;
    targetId: string;
    payload: unknown;
    payloadHash: string;
    status:
      'REQUESTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'EXECUTED' | 'FAILED';
    requester: string;
    approver?: string;
    expiresAt: number;
  }> = [];
  readonly invitations = new Map<
    string,
    { tenantId: string; email: string; expiresAt: number; acceptedAt?: string }
  >();
  readonly supportNotes = new Map<
    string,
    Array<{ id: string; note: string; actorId: string; createdAt: string }>
  >();
  readonly skills: Array<{
    id: string;
    tenantId: string;
    name: string;
    active: boolean;
  }> = [];
  readonly userSkills = new Map<string, Set<string>>();
  readonly uploads = new Map<
    string,
    {
      id: string;
      tenantId: string;
      key: string;
      mime: string;
      size: number;
      checksum: string;
      status: string;
    }
  >();
  readonly usage = new Map<
    string,
    {
      activeUsers: number;
      completedTasks: number;
      evidenceBytes: number;
      lastActivityAt: string;
      syncHealth: 'healthy' | 'degraded' | 'inactive';
    }
  >();

  async login(identifier: string, password: string, deviceName?: string) {
    const normalized = identifier.trim().toLowerCase();
    const identifierHash = createHash('sha256')
      .update(normalized)
      .digest('hex');
    let user = this.users.find(
      (candidate) =>
        candidate.email.toLowerCase() === normalized ||
        candidate.id === identifier,
    );
    const persisted = await this.repository.findUserForLogin(normalized);
    if (persisted) user = { ...persisted, roles: [] };
    if (user && !user.lockedUntil && /^[0-9a-f-]{36}$/i.test(user.id)) {
      const persisted = await (
        user && /^[0-9a-f-]{36}$/i.test(user.tenantId)
          ? this.tenantContext.run(user.tenantId, user.id, () =>
              this.repository.findAccountLockout(user.id),
            )
          : Promise.resolve(undefined)
      ).catch(() => undefined);
      if (persisted?.lockedUntil)
        user.lockedUntil = new Date(persisted.lockedUntil).getTime();
    }
    if (user?.lockedUntil && user.lockedUntil > Date.now()) {
      void this.repository
        .recordLoginAttempt({
          id: randomUUID(),
          userId: user.id,
          identifierHash,
          succeeded: false,
        })
        .catch(() => undefined);
      throw new HttpException('ACCOUNT_LOCKED', HttpStatus.LOCKED);
    }
    const valid = Boolean(
      user?.active && verifyPassword(password, user.password),
    );
    if (!user || !valid) {
      void this.repository
        .recordLoginAttempt({
          id: randomUUID(),
          userId: user?.id,
          identifierHash,
          succeeded: false,
        })
        .catch(() => undefined);
      const failure = this.loginFailures.get(normalized) ?? {
        count: 0,
        windowStartedAt: Date.now(),
      };
      if (Date.now() - failure.windowStartedAt > 15 * 60_000) {
        failure.count = 0;
        failure.windowStartedAt = Date.now();
      }
      failure.count += 1;
      this.loginFailures.set(normalized, failure);
      if (user && failure.count >= 5) {
        user.lockedUntil = Date.now() + 15 * 60_000;
        if (/^[0-9a-f-]{36}$/i.test(user.id))
          void this.repository
            .upsertAccountLockout({
              userId: user.id,
              failedAttempts: failure.count,
              firstFailedAt: new Date(failure.windowStartedAt).toISOString(),
              lockedUntil: new Date(user.lockedUntil).toISOString(),
            })
            .catch(() => undefined);
        this.record('ACCOUNT_LOCKED', user.id, user.id);
        throw new HttpException('ACCOUNT_LOCKED', HttpStatus.LOCKED);
      }
      this.record('LOGIN_FAILURE', 'anonymous', normalized);
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    void this.repository
      .recordLoginAttempt({
        id: randomUUID(),
        userId: user.id,
        identifierHash,
        succeeded: true,
      })
      .catch(() => undefined);
    void this.repository.clearAccountLockout(user.id).catch(() => undefined);
    this.loginFailures.delete(normalized);
    user.lockedUntil = undefined;
    if (
      user &&
      /^[0-9a-f-]{36}$/i.test(user.id) &&
      /^[0-9a-f-]{36}$/i.test(user.tenantId)
    ) {
      user.roles = await this.repository.findUserRoleIds(
        user.tenantId,
        user.id,
      );
      const persistedDevices = await this.tenantContext.run(
        user.tenantId,
        user.id,
        () => this.repository.findDevices(user.tenantId, user.id),
      );
      for (const device of persistedDevices)
        this.devices.set(device.id, device);
      user.deviceIds = persistedDevices.map((device) => device.id);
      if (!this.tenants.some((tenant) => tenant.id === user?.tenantId)) {
        const persistedTenant = await this.repository.findTenant(user.tenantId);
        if (persistedTenant) this.tenants.push(persistedTenant);
      }
    }
    if (deviceName) {
      const id = randomUUID();
      const device = {
        id,
        userId: user.id,
        name: deviceName.trim(),
        lastSeenAt: new Date().toISOString(),
      };
      this.devices.set(id, device);
      user.deviceIds = [...(user.deviceIds ?? []), id];
      if (
        /^[0-9a-f-]{36}$/i.test(user.id) &&
        /^[0-9a-f-]{36}$/i.test(user.tenantId)
      )
        await this.tenantContext.run(user.tenantId, user.id, () =>
          this.repository.insertDevice({
            id,
            userId: user.id,
            name: device.name,
          }),
        );
      this.record('DEVICE_REGISTERED', user.id, id);
    }
    if (/^[0-9a-f-]{36}$/i.test(user.tenantId)) {
      const persistedRoles = await this.repository.findRoles(user.tenantId);
      for (const role of persistedRoles)
        if (!this.roles.some((candidate) => candidate.id === role.id))
          this.roles.push({
            ...role,
            scopes: role.scopes as Record<string, PermissionScope>,
          });
    }
    this.record('LOGIN_SUCCESS', user.id, user.tenantId);
    return { ...this.issueTokenPair(user), user: this.safeUser(user) };
  }
  async refresh(token: string) {
    const hash = this.hashToken(token);
    let user = this.sessions.get(hash);
    let metadata = this.sessionMetadata.get(hash);
    if (!user || !metadata) {
      const persisted = await this.repository.findRefreshSession(hash);
      if (persisted) {
        if (
          /^[0-9a-f-]{36}$/i.test(persisted.tenantId) &&
          /^[0-9a-f-]{36}$/i.test(persisted.userId)
        ) {
          const persistedRoles = await this.repository.findRoles(
            persisted.tenantId,
          );
          for (const role of persistedRoles)
            if (!this.roles.some((candidate) => candidate.id === role.id))
              this.roles.push({
                ...role,
                scopes: role.scopes as Record<string, PermissionScope>,
              });
        }
        user = {
          id: persisted.userId,
          email: persisted.email,
          name: persisted.name,
          password: persisted.password,
          tenantId: persisted.tenantId,
          active: persisted.active,
          roles:
            /^[0-9a-f-]{36}$/i.test(persisted.tenantId) &&
            /^[0-9a-f-]{36}$/i.test(persisted.userId)
              ? await this.repository.findUserRoleIds(
                  persisted.tenantId,
                  persisted.userId,
                )
              : [],
          memberships: /^[0-9a-f-]{36}$/i.test(persisted.userId)
            ? await this.repository.findUserMemberships(persisted.userId)
            : undefined,
        };
        metadata = {
          familyId: persisted.familyId,
          tokenType: 'refresh',
          expiresAt: new Date(persisted.expiresAt).getTime(),
          revoked: Boolean(persisted.revokedAt),
        };
        this.sessions.set(hash, user);
        this.sessionMetadata.set(hash, metadata);
      }
    }
    if (!metadata && this.consumedSessionFamilies.has(hash)) {
      const familyId = this.consumedSessionFamilies.get(hash) as string;
      this.revokedSessionFamilies.add(familyId);
      for (const [key, session] of this.sessionMetadata)
        if (session.familyId === familyId) {
          session.revoked = true;
          this.sessions.delete(key);
        }
      throw new UnauthorizedException('TOKEN_REUSED');
    }
    if (
      !user ||
      !user.active ||
      !metadata ||
      metadata.tokenType !== 'refresh' ||
      metadata.revoked ||
      metadata.expiresAt <= Date.now() ||
      this.revokedSessionFamilies.has(metadata.familyId)
    )
      throw new UnauthorizedException('TOKEN_EXPIRED');
    this.sessions.delete(hash);
    this.sessionMetadata.delete(hash);
    this.consumedSessionFamilies.set(hash, metadata.familyId);
    if (
      /^[0-9a-f-]{36}$/i.test(user.tenantId) &&
      /^[0-9a-f-]{36}$/i.test(user.id)
    )
      await this.tenantContext.run(user.tenantId, user.id, () =>
        this.repository.revokeSession(hash),
      );
    return {
      ...this.issueTokenPair(user, metadata.familyId),
      user: this.safeUser(user),
    };
  }
  logout(token: string) {
    const hash = this.hashToken(token);
    const user = this.sessions.get(hash);
    const metadata = this.sessionMetadata.get(hash);
    if (metadata) {
      this.revokedSessionFamilies.add(metadata.familyId);
      for (const [key, candidate] of this.sessionMetadata)
        if (candidate.familyId === metadata.familyId) {
          candidate.revoked = true;
          this.sessions.delete(key);
        }
      void this.repository.revokeSession(hash).catch(() => undefined);
    }
    if (user) this.record('SESSION_REVOKED', user.id, hash);
    return null;
  }
  logoutAll(token: string) {
    const user = this.requireUser(token);
    for (const [key, value] of this.sessions)
      if (value.id === user.id) {
        this.sessions.delete(key);
        const metadata = this.sessionMetadata.get(key);
        if (metadata) metadata.revoked = true;
      }
    void this.repository.revokeUserSessions(user.id).catch(() => undefined);
    this.record('SESSION_REVOKE_ALL', user.id, user.id);
    return null;
  }
  async forgotPassword(identifier: string) {
    let user = this.users.find(
      (candidate) =>
        candidate.email.toLowerCase() === identifier.trim().toLowerCase() ||
        candidate.id === identifier.trim(),
    );
    if (!user) {
      const persisted = await this.repository.findUserForLogin(
        identifier.trim(),
      );
      if (persisted) user = { ...persisted, roles: [] };
    }
    if (user) {
      const token = randomUUID();
      const tokenHash = this.hashToken(token);
      const expiresAt = Date.now() + 15 * 60_000;
      this.resetTokens.set(tokenHash, { userId: user.id, expiresAt });
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          user.id,
        ) &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          user.tenantId,
        )
      )
        void this.repository
          .insertPasswordReset({
            id: randomUUID(),
            userId: user.id,
            tenantId: user.tenantId,
            tokenHash,
            expiresAt: new Date(expiresAt).toISOString(),
          })
          .catch(() => undefined);
      this.notifications.sendPasswordReset(user.email, token);
      this.record('PASSWORD_RESET_REQUESTED', user.id, user.id);
    }
    return { accepted: true };
  }
  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashToken(token);
    let reset = this.resetTokens.get(tokenHash);
    let user = reset
      ? this.users.find((candidate) => candidate.id === reset?.userId)
      : undefined;
    if (!reset || !user) {
      const persisted = await this.repository.findPasswordReset(tokenHash);
      if (persisted) {
        reset = {
          userId: persisted.userId,
          expiresAt: new Date(persisted.expiresAt).getTime(),
        };
        user = {
          id: persisted.userId,
          email: persisted.email,
          name: persisted.name,
          password: persisted.password,
          tenantId: persisted.tenantId,
          active: persisted.active,
          roles: [],
        };
        this.resetTokens.set(tokenHash, reset);
        this.users.push(user);
      }
    }
    if (!reset || !user || reset.expiresAt < Date.now() || password.length < 10)
      throw new UnauthorizedException('INVALID_RESET_TOKEN');
    const history = this.passwordHistory.get(user.id) ?? [];
    if (
      verifyPassword(password, user.password) ||
      history.some((passwordHash) => verifyPassword(password, passwordHash))
    )
      throw new ConflictException('PASSWORD_REUSE_FORBIDDEN');
    const previousHash = user.password;
    const nextHash = hashPassword(password);
    if (
      /^[0-9a-f-]{36}$/i.test(user.id) &&
      /^[0-9a-f-]{36}$/i.test(user.tenantId)
    )
      await this.repository.completePasswordReset({
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash,
        passwordHash: nextHash,
        previousPasswordHash: previousHash,
      });
    user.password = nextHash;
    this.passwordHistory.set(user.id, [previousHash, ...history].slice(0, 5));
    this.resetTokens.delete(tokenHash);
    for (const [key, value] of this.sessions)
      if (value.id === user.id) {
        this.sessions.delete(key);
        this.sessionMetadata.delete(key);
      }
    this.record('PASSWORD_RESET', user.id, user.id);
    return { accepted: true };
  }
  sessionsFor(token: string) {
    const user = this.requireUser(token);
    return [...this.sessions.entries()]
      .filter(([, value]) => value.id === user.id)
      .map(([id]) => ({ id, userId: user.id }));
  }
  revokeSession(token: string, sessionId: string) {
    const user = this.requireUser(token);
    const session = this.sessions.get(sessionId);
    const metadata = this.sessionMetadata.get(sessionId);
    if (!session || session.id !== user.id || !metadata)
      throw new NotFoundException('SESSION_NOT_FOUND');
    this.sessions.delete(sessionId);
    metadata.revoked = true;
    void this.repository.revokeSession(sessionId).catch(() => undefined);
    this.record('SESSION_REVOKED', user.id, sessionId);
    return null;
  }
  async registerDevice(token: string, name: string) {
    const user = this.requireUser(token);
    const id = randomUUID();
    const device = {
      id,
      userId: user.id,
      name: name.trim(),
      lastSeenAt: new Date().toISOString(),
    };
    if (
      /^[0-9a-f-]{36}$/i.test(user.id) &&
      /^[0-9a-f-]{36}$/i.test(user.tenantId)
    )
      await this.tenantContext.run(user.tenantId, user.id, () =>
        this.repository.insertDevice({
          id,
          userId: user.id,
          name: device.name,
        }),
      );
    this.devices.set(id, device);
    user.deviceIds = [...(user.deviceIds ?? []), id];
    this.record('DEVICE_REGISTERED', user.id, id);
    return device;
  }
  revokeDevice(token: string, id: string) {
    const user = this.requireUser(token);
    const device = this.devices.get(id);
    if (!device || device.userId !== user.id)
      throw new NotFoundException('DEVICE_NOT_FOUND');
    this.devices.delete(id);
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f-]{36}$/i.test(user.id))
      void this.repository.revokeDevice(id, user.id).catch(() => undefined);
    this.record('DEVICE_REVOKED', user.id, id);
    return null;
  }
  async me(token: string) {
    const user = this.requireUser(token);
    const memberships = /^[0-9a-f-]{36}$/i.test(user.id)
      ? await this.repository.findUserMemberships(user.id)
      : undefined;
    return this.safeUser(user, memberships);
  }
  async selectTenant(token: string, membershipId: string) {
    const user = this.requireUser(token);
    let tenantId = membershipId;
    let membership:
      { membershipId: string; tenantId: string; active: boolean } | undefined;
    if (
      /^[0-9a-f-]{36}$/i.test(membershipId) &&
      /^[0-9a-f-]{36}$/i.test(user.id)
    )
      membership = await this.repository.findUserMembership(
        membershipId,
        user.id,
      );
    if (membership) {
      if (!membership.active)
        throw new ForbiddenException('TENANT_MEMBERSHIP_UNAVAILABLE');
      tenantId = membership.tenantId;
    } else if (
      membershipId !== user.tenantId ||
      !this.tenants.some(
        (tenant) => tenant.id === membershipId && tenant.status === 'ACTIVE',
      )
    )
      throw new ForbiddenException('TENANT_MEMBERSHIP_UNAVAILABLE');
    const tenant = this.tenants.find((item) => item.id === tenantId);
    if (!tenant || tenant.status !== 'ACTIVE')
      throw new ForbiddenException('TENANT_MEMBERSHIP_UNAVAILABLE');
    const oldHash = this.hashToken(token);
    const oldMetadata = this.sessionMetadata.get(oldHash);
    if (oldMetadata) oldMetadata.revoked = true;
    this.sessions.delete(oldHash);
    this.sessionMetadata.delete(oldHash);
    const selectedUser: User = {
      ...user,
      tenantId,
      roles:
        /^[0-9a-f-]{36}$/i.test(tenantId) && /^[0-9a-f-]{36}$/i.test(user.id)
          ? await this.repository.findUserRoleIds(tenantId, user.id)
          : user.roles,
    };
    this.record('TENANT_CONTEXT_CHANGED', user.id, tenantId);
    return {
      ...this.issueTokenPair(selectedUser, oldMetadata?.familyId),
      tenantId,
      user: this.safeUser(selectedUser),
    };
  }
  requireUser(token?: string) {
    const hash = token ? this.hashToken(token) : undefined;
    const user = hash ? this.sessions.get(hash) : undefined;
    const metadata = hash ? this.sessionMetadata.get(hash) : undefined;
    if (
      !user ||
      !metadata ||
      metadata.tokenType !== 'access' ||
      metadata.revoked ||
      metadata.expiresAt <= Date.now()
    )
      throw new UnauthorizedException('UNAUTHORIZED');
    const tenant = this.tenants.find((item) => item.id === user.tenantId);
    if (!tenant || tenant.status !== 'ACTIVE')
      throw new ForbiddenException('TENANT_SUSPENDED');
    this.tenantContext.enter(user.tenantId, user.id);
    return user;
  }
  capabilities(token: string) {
    const user = this.requireUser(token);
    const roles = user.roles
      .map((roleId) => this.roles.find((role) => role.id === roleId))
      .filter((role): role is Role => Boolean(role));
    const grants = [...new Set(roles.flatMap((role) => role.permissions))];
    const scopeOrder: PermissionScope[] = ['own', 'team', 'branch', 'all'];
    const scopes = Object.fromEntries(
      grants.map((permission) => {
        const granted = roles.map((role) => role.scopes?.[permission] ?? 'all');
        const broadest = granted.reduce(
          (current, candidate) =>
            scopeOrder.indexOf(candidate) > scopeOrder.indexOf(current)
              ? candidate
              : current,
          'own' as PermissionScope,
        );
        return [
          permission,
          scopeOrder.slice(0, scopeOrder.indexOf(broadest) + 1),
        ];
      }),
    );
    return {
      revision: this.capabilityRevision,
      grants,
      scopes,
      features: ['dashboard', 'company', 'users', 'roles', 'audit'],
    };
  }
  async listTenants(
    options: {
      offset?: number;
      limit?: number;
      search?: string;
      status?: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
    } = {},
  ) {
    const persisted = await this.repository.findTenants();
    const source = persisted.length ? persisted : this.tenants;
    const search = options.search?.trim().toLowerCase();
    const filtered = source.filter(
      (tenant) =>
        (!options.status || tenant.status === options.status) &&
        (!search ||
          tenant.name.toLowerCase().includes(search) ||
          tenant.id.toLowerCase().includes(search)),
    );
    const offset = Math.max(0, options.offset ?? 0);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    return {
      data: filtered.slice(offset, offset + limit),
      offset,
      limit,
      total: filtered.length,
      nextOffset: offset + limit < filtered.length ? offset + limit : null,
    };
  }
  private async loadTenant(id: string) {
    const local = this.tenants.find((item) => item.id === id);
    if (local) return local;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
    const persisted = await this.repository.findTenant(id);
    if (!persisted) return undefined;
    const tenant = {
      ...persisted,
      limits: { users: 25, branches: 10, tasks: 1000 },
    };
    this.tenants.push(tenant);
    return tenant;
  }
  async tenantDetail(id: string) {
    const tenant = await this.loadTenant(id);
    if (!tenant) throw new NotFoundException('TENANT_NOT_FOUND');
    return { ...tenant, usage: await this.tenantUsage(id) };
  }
  async createTenant(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new ConflictException('TENANT_NAME_REQUIRED');
    const tenant = {
      id: randomUUID(),
      name: normalizedName,
      status: 'ACTIVE' as const,
      timezone: 'UTC',
      users: 0,
      branches: 0,
      limits: { users: 25, branches: 10, tasks: 1000 },
      updatedAt: new Date().toISOString(),
    };
    const persisted = await this.repository.insertTenant(tenant);
    this.tenants.push({ ...tenant, ...persisted });
    this.usage.set(tenant.id, {
      activeUsers: 0,
      completedTasks: 0,
      evidenceBytes: 0,
      lastActivityAt: tenant.updatedAt,
      syncHealth: 'healthy',
    });
    this.record('TENANT_PROVISIONED', 'system', tenant.id);
    return this.tenants[this.tenants.length - 1];
  }
  async updateTenant(id: string, patch: Partial<Tenant>) {
    const tenant = await this.loadTenant(id);
    if (!tenant) throw new NotFoundException('TENANT_NOT_FOUND');
    if (
      patch.status &&
      !['ACTIVE', 'SUSPENDED', 'ARCHIVED'].includes(patch.status)
    )
      throw new ConflictException('INVALID_TENANT_STATUS');
    if (
      tenant.status === 'ARCHIVED' &&
      patch.status &&
      patch.status !== 'ARCHIVED'
    )
      throw new ConflictException('ARCHIVED_TENANT_IMMUTABLE');
    if (patch.name !== undefined && !patch.name.trim())
      throw new ConflictException('TENANT_NAME_REQUIRED');
    if (/^[0-9a-f-]{36}$/i.test(id)) {
      await this.repository.updateTenant(id, patch);
      if (patch.status && patch.status !== 'ACTIVE') {
        await this.repository.revokeTenantSessions(id);
        await this.repository.revokeTenantDevices(id);
      }
    }
    Object.assign(tenant, patch, { updatedAt: new Date().toISOString() });
    this.record('TENANT_STATUS_CHANGED', 'system', id);
    if (tenant.status !== 'ACTIVE')
      for (const [key, user] of this.sessions)
        if (user.tenantId === id) {
          this.sessions.delete(key);
          this.sessionMetadata.delete(key);
        }
    return tenant;
  }
  async tenantUsage(id: string) {
    const tenant = await this.loadTenant(id);
    if (!tenant) throw new NotFoundException('TENANT_NOT_FOUND');
    let usage = this.usage.get(id);
    if (!usage && /^[0-9a-f-]{36}$/i.test(id))
      usage = await this.repository.findLatestUsage(id);
    usage ??= {
      activeUsers: tenant.users,
      completedTasks: 0,
      evidenceBytes: 0,
      lastActivityAt: tenant.updatedAt,
      syncHealth: 'inactive' as const,
    };
    if (/^[0-9a-f-]{36}$/i.test(id)) {
      const health = await this.repository.computeSyncHealth(id);
      usage = {
        ...usage,
        syncHealth: health.syncHealth,
        lastActivityAt: health.lastActivityAt ?? usage.lastActivityAt,
      };
    }
    this.usage.set(id, usage);
    if (/^[0-9a-f-]{36}$/i.test(id))
      void this.repository
        .insertUsageSnapshot({
          tenantId: id,
          activeUsers: usage.activeUsers,
          activeBranches: tenant.branches,
          completedTasks: usage.completedTasks,
          evidenceBytes: usage.evidenceBytes,
          lastActivityAt: usage.lastActivityAt,
          syncHealth: usage.syncHealth,
        })
        .catch(() => undefined);
    return {
      tenantId: id,
      limits: tenant.limits ?? { users: 25, branches: 10, tasks: 1000 },
      usage,
      nearLimit:
        usage.activeUsers >= (tenant.limits?.users ?? 25) * 0.8 ||
        tenant.branches >= (tenant.limits?.branches ?? 10) * 0.8,
    };
  }
  async updateTenantLimits(
    id: string,
    limits: { users: number; branches: number; tasks: number },
  ) {
    const tenant = await this.loadTenant(id);
    if (!tenant) throw new NotFoundException('TENANT_NOT_FOUND');
    if (
      Object.values(limits).some(
        (value) => !Number.isInteger(value) || value < 1,
      )
    )
      throw new ConflictException('INVALID_LIMITS');
    if (/^[0-9a-f-]{36}$/i.test(id)) {
      const usage = await this.repository.findTenantLimitUsage(id);
      if (limits.users < usage.users || limits.branches < usage.branches)
        throw new ConflictException('LIMIT_BELOW_CURRENT_USAGE');
      await this.repository.updateTenantLimits(id, limits);
    } else if (limits.users < tenant.users || limits.branches < tenant.branches)
      throw new ConflictException('LIMIT_BELOW_CURRENT_USAGE');
    tenant.limits = limits;
    this.record('TENANT_LIMITS_CHANGED', 'platform-admin', id);
    return this.tenantUsage(id);
  }
  async listRoles(token: string) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'iam.roles.view');
    let roles = this.roles.filter((role) => role.tenantId === user.tenantId);
    if (/^[0-9a-f-]{36}$/i.test(user.tenantId)) {
      const persisted = (await this.repository.findRoles(user.tenantId)).map(
        (role) => ({
          ...role,
          scopes: role.scopes as Record<string, PermissionScope>,
        }),
      );
      for (const role of persisted)
        if (!this.roles.some((candidate) => candidate.id === role.id))
          this.roles.push(role);
      roles = this.roles.filter((role) => role.tenantId === user.tenantId);
    }
    return roles;
  }
  async getRole(token: string, id: string) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'iam.roles.view');
    const role = (await this.listRoles(token)).find((item) => item.id === id);
    if (!role) throw new NotFoundException('ROLE_NOT_FOUND');
    return role;
  }
  async updateRoleMetadata(
    token: string,
    id: string,
    name?: string,
    expectedRevision?: number,
  ) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'iam.roles.edit');
    const role = (await this.listRoles(token)).find((item) => item.id === id);
    if (!role) throw new NotFoundException('ROLE_NOT_FOUND');
    if (role.preset) throw new ConflictException('PRESET_ROLE_IMMUTABLE');
    if (expectedRevision !== undefined && expectedRevision !== role.revision)
      throw new ConflictException('ROLE_REVISION_CONFLICT');
    const normalizedName = name?.trim();
    if (!normalizedName) throw new ConflictException('ROLE_NAME_REQUIRED');
    if (
      this.roles.some(
        (candidate) =>
          candidate.tenantId === user.tenantId &&
          candidate.id !== id &&
          candidate.name.toLowerCase() === normalizedName.toLowerCase(),
      )
    )
      throw new ConflictException('ROLE_EXISTS');
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f-]{36}$/i.test(user.tenantId))
      await this.repository.updateRoleMetadata(
        id,
        user.tenantId,
        normalizedName,
        expectedRevision,
      );
    role.name = normalizedName;
    role.revision += 1;
    this.capabilityRevision += 1;
    this.record('ROLE_UPDATED', user.id, id);
    return role;
  }
  async createRole(token: string, name: string, cloneFrom?: string) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'iam.roles.create');
    const normalizedName = name.trim();
    if (!normalizedName) throw new ConflictException('ROLE_NAME_REQUIRED');
    if (
      this.roles.some(
        (role) =>
          role.tenantId === user.tenantId &&
          role.name.toLowerCase() === normalizedName.toLowerCase(),
      )
    )
      throw new ConflictException('ROLE_EXISTS');
    const source = this.roles.find(
      (role) => role.id === cloneFrom && role.tenantId === user.tenantId,
    );
    if (cloneFrom && !source) throw new NotFoundException('ROLE_NOT_FOUND');
    const role: Role = {
      id: randomUUID(),
      name: normalizedName,
      tenantId: user.tenantId,
      preset: false,
      permissions: source?.permissions ?? [],
      scopes: source?.scopes ? { ...source.scopes } : undefined,
      revision: 1,
    };
    if (/^[0-9a-f-]{36}$/i.test(role.tenantId)) {
      await this.repository.insertRole(role);
      if (role.permissions.length)
        await this.repository.replaceRolePermissions(
          role.id,
          role.permissions,
          role.scopes,
        );
    }
    this.roles.push(role);
    this.capabilityRevision += 1;
    this.record('ROLE_CREATED', user.id, role.id);
    return role;
  }
  async updateRole(
    token: string,
    id: string,
    permissions: string[],
    grants?: Array<{ key: string; scope: PermissionScope }>,
    expectedRevision?: number,
  ) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'iam.roles.configure');
    const role = this.roles.find(
      (item) => item.id === id && item.tenantId === user.tenantId,
    );
    if (!role) throw new NotFoundException('ROLE_NOT_FOUND');
    if (role.preset) throw new ConflictException('PRESET_ROLE_IMMUTABLE');
    if (expectedRevision !== undefined && expectedRevision !== role.revision)
      throw new ConflictException('ROLE_REVISION_CONFLICT');
    const requestedScopes = Object.fromEntries(
      (grants ?? []).map((grant) => [grant.key, grant.scope]),
    );
    const nextPermissions = permissions.filter((permission) =>
      this.permissions.includes(permission),
    );
    const nextScopes = Object.fromEntries(
      nextPermissions.map((permission) => [
        permission,
        requestedScopes[permission] ?? 'all',
      ]),
    );
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f-]{36}$/i.test(user.tenantId))
      await this.repository.replaceRolePermissions(
        id,
        nextPermissions,
        nextScopes,
        expectedRevision,
      );
    role.permissions = nextPermissions;
    role.scopes = nextScopes;
    role.revision += 1;
    this.capabilityRevision += 1;
    this.record('ROLE_PERMISSIONS_CHANGED', user.id, id);
    return role;
  }
  async deleteRole(token: string, id: string) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'iam.roles.configure');
    const role = (await this.listRoles(token)).find((item) => item.id === id);
    if (!role) throw new NotFoundException('ROLE_NOT_FOUND');
    if (role.preset) throw new ConflictException('PRESET_ROLE_IMMUTABLE');
    if (
      this.users.some((candidate) => candidate.roles.includes(id)) ||
      (/^[0-9a-f-]{36}$/i.test(id) &&
        /^[0-9a-f-]{36}$/i.test(user.tenantId) &&
        (await this.repository.countRoleAssignments(id, user.tenantId)) > 0)
    )
      throw new ConflictException('ROLE_IN_USE');
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f-]{36}$/i.test(user.tenantId))
      await this.repository.deleteRole(id, user.tenantId);
    this.roles.splice(
      this.roles.findIndex((item) => item.id === id),
      1,
    );
    this.capabilityRevision += 1;
    this.record('ROLE_DELETED', user.id, id);
    return null;
  }
  async cloneRole(
    token: string,
    id: string,
    name: string,
    idempotencyKey?: string,
  ) {
    void idempotencyKey;
    const source = await this.getRole(token, id);
    if (source.preset && source.tenantId === 'platform')
      throw new ConflictException('PLATFORM_ROLE_NOT_CLONEABLE');
    return this.createRole(token, name, source.id);
  }
  async startGodSession(
    tenantId: string,
    reason: string,
    reauthSecret: string,
  ) {
    if (!reason?.trim()) throw new ForbiddenException('GOD_REASON_REQUIRED');
    const configuredSecret = process.env.PLATFORM_ADMIN_REAUTH;
    if (process.env.NODE_ENV === 'production' && !configuredSecret)
      throw new ForbiddenException('PLATFORM_ADMIN_REAUTH_NOT_CONFIGURED');
    const expected = configuredSecret ?? 'local-platform-admin';
    const supplied = Buffer.from(reauthSecret ?? '');
    const configured = Buffer.from(expected);
    if (
      supplied.length !== configured.length ||
      !timingSafeEqual(supplied, configured)
    ) {
      this.record('GOD_REAUTH_FAILED', 'platform-admin', tenantId);
      throw new UnauthorizedException('RECENT_REAUTH_REQUIRED');
    }
    if (!this.tenants.some((tenant) => tenant.id === tenantId))
      throw new NotFoundException('TENANT_NOT_FOUND');
    const now = Date.now();
    const id = randomUUID();
    const expiresAt = now + 15 * 60_000;
    const session = {
      tenantId,
      reason,
      createdAt: now,
      expiresAt,
      lastActivityAt: now,
    };
    const platformAdminId = process.env.PLATFORM_ADMIN_ID;
    if (
      /^[0-9a-f-]{36}$/i.test(platformAdminId ?? '') &&
      /^[0-9a-f-]{36}$/i.test(tenantId)
    )
      await this.repository.insertGodSession({
        id,
        platformAdminId: platformAdminId as string,
        tenantId,
        reason,
        reauthenticatedAt: new Date(now).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        lastActivityAt: new Date(now).toISOString(),
      });
    this.godSessions.set(id, session);
    this.record('GOD_SESSION_STARTED', 'platform-admin', tenantId);
    return {
      id,
      tenantId,
      reason,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }
  async auditEvents(
    token: string,
    options: { action?: string; offset?: number; limit?: number } = {},
  ) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'audit.events.view');
    const action = options.action?.trim().toLowerCase();
    const offset = Math.max(0, options.offset ?? 0);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    if (/^[0-9a-f-]{36}$/i.test(user.tenantId) && this.repository) {
      const persisted = await this.repository
        .findAudit(user.tenantId, action, offset, limit)
        .catch(() => undefined);
      if (persisted)
        return {
          data: persisted.data,
          offset,
          limit,
          total: persisted.total,
          nextOffset: offset + limit < persisted.total ? offset + limit : null,
        };
    }
    const filtered = action
      ? this.audit.filter(
          (event) => String(event.action).toLowerCase() === action,
        )
      : this.audit;
    return {
      data: filtered.slice(offset, offset + limit),
      offset,
      limit,
      total: filtered.length,
      nextOffset: offset + limit < filtered.length ? offset + limit : null,
    };
  }
  verifyAuditChain(token: string) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'audit.events.view');
    let previousHash = '';
    for (let index = 0; index < this.audit.length; index += 1) {
      const event = this.audit[index];
      const expected = createHash('sha256')
        .update(
          `${String(event.action)}:${String(event.actorId)}:${String(event.targetId)}:${index}:${previousHash}`,
        )
        .digest('hex');
      if (event.previousHash !== previousHash || event.hash !== expected)
        return { valid: false, checked: index + 1, brokenAt: event.id };
      previousHash = String(event.hash);
    }
    return { valid: true, checked: this.audit.length, brokenAt: null };
  }
  permissionsCatalog(token: string) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'iam.roles.view');
    return {
      permissions: this.permissions.map((key) => ({
        key,
        scope: ['own', 'team', 'branch', 'all'],
      })),
      features: ['dashboard', 'company', 'users', 'roles', 'audit'],
      dashboards: [
        'operations_overview',
        'company_settings',
        'workforce_directory',
        'role_management',
        'audit_timeline',
      ],
    };
  }
  async updateCompany(token: string, patch: Record<string, unknown>) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'company.settings.edit');
    const current = this.companySettings.get(user.tenantId) ?? {};
    const next = { ...current, ...patch };
    if (
      next.locale !== undefined &&
      (typeof next.locale !== 'string' ||
        !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(next.locale))
    )
      throw new ConflictException('INVALID_LOCALE');
    if (
      next.timezone !== undefined &&
      (typeof next.timezone !== 'string' ||
        !/^[A-Za-z_]+(?:\/[A-Za-z_]+)+$/.test(next.timezone))
    )
      throw new ConflictException('INVALID_TIMEZONE');
    if (
      next.workingDays !== undefined &&
      (!Array.isArray(next.workingDays) ||
        next.workingDays.some(
          (day) => !Number.isInteger(day) || day < 1 || day > 7,
        ) ||
        new Set(next.workingDays).size !== next.workingDays.length)
    )
      throw new ConflictException('INVALID_WORKING_DAYS');
    if (
      next.workingHours !== undefined &&
      (typeof next.workingHours !== 'object' ||
        !next.workingHours ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(
          String((next.workingHours as Record<string, unknown>).start),
        ) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(
          String((next.workingHours as Record<string, unknown>).end),
        ))
    )
      throw new ConflictException('INVALID_WORKING_HOURS');
    if (
      typeof next.terminology === 'object' &&
      next.terminology &&
      (Object.keys(next.terminology).some(
        (key) => key.includes('.') || !key.trim(),
      ) ||
        Object.values(next.terminology).some(
          (value) => typeof value !== 'string' || !value.trim(),
        ))
    )
      throw new ConflictException('BRANCH_TERMINOLOGY_NOT_ALLOWED');
    if (
      next.gpsRadiusMeters !== undefined &&
      (!Number.isInteger(next.gpsRadiusMeters) ||
        (next.gpsRadiusMeters as number) < 5 ||
        (next.gpsRadiusMeters as number) > 2000)
    )
      throw new ConflictException('INVALID_GPS_RADIUS');
    if (
      next.colorTheme !== undefined &&
      (typeof next.colorTheme !== 'string' ||
        !/^#[0-9A-Fa-f]{6}$/.test(next.colorTheme))
    )
      throw new ConflictException('INVALID_COLOR_THEME');
    if (
      next.dateFormat !== undefined &&
      !(COMPANY_DATE_FORMATS as readonly unknown[]).includes(next.dateFormat)
    )
      throw new ConflictException('INVALID_DATE_FORMAT');
    if (
      next.numberFormat !== undefined &&
      !(COMPANY_NUMBER_FORMATS as readonly unknown[]).includes(
        next.numberFormat,
      )
    )
      throw new ConflictException('INVALID_NUMBER_FORMAT');
    if (
      next.logoObjectKey !== undefined &&
      (typeof next.logoObjectKey !== 'string' ||
        !next.logoObjectKey.trim() ||
        next.logoObjectKey.length > 500)
    )
      throw new ConflictException('INVALID_LOGO_OBJECT_KEY');
    for (const [field, requiredKeys] of Object.entries({
      signaturePolicy: ['required'],
      refusalPolicy: ['allowed', 'requireReason'],
      unavailablePolicy: ['allowed', 'requireReason'],
      approvalPolicy: ['required'],
      latePolicy: ['graceMinutes'],
      exceptionPolicy: ['requireReason'],
    })) {
      const value = (next as Record<string, unknown>)[field];
      if (value === undefined) continue;
      if (
        typeof value !== 'object' ||
        !value ||
        requiredKeys.some((key) => !(key in value))
      )
        throw new ConflictException(
          `INVALID_${field.replace(/([A-Z])/g, '_$1').toUpperCase()}`,
        );
    }
    if (
      next.latePolicy !== undefined &&
      !Number.isInteger(
        (next.latePolicy as { graceMinutes: unknown }).graceMinutes,
      )
    )
      throw new ConflictException('INVALID_LATE_POLICY');
    if (
      /^[0-9a-f-]{36}$/i.test(user.tenantId) &&
      /^[0-9a-f-]{36}$/i.test(user.id)
    )
      await this.repository.upsertTenantSettings(user.tenantId, next, user.id);
    this.companySettings.set(user.tenantId, next);
    this.record('COMPANY_SETTINGS_CHANGED', user.id, user.tenantId);
    return next;
  }
  async getCompany(token: string) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'company.settings.view');
    const local = this.companySettings.get(user.tenantId);
    if (local) return local;
    const persisted = /^[0-9a-f-]{36}$/i.test(user.tenantId)
      ? await this.repository.findTenantSettings(user.tenantId)
      : undefined;
    if (persisted) {
      this.companySettings.set(user.tenantId, persisted);
      return persisted;
    }
    return {};
  }
  async listBranches(
    token: string,
    options: { offset?: number; limit?: number; search?: string } = {},
  ) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'company.branches.view');
    let source = this.branches.filter(
      (branch) => branch.tenantId === user.tenantId,
    );
    if (/^[0-9a-f-]{36}$/i.test(user.tenantId)) {
      const persisted = await this.repository.findBranches(user.tenantId);
      for (const branch of persisted)
        if (!this.branches.some((candidate) => candidate.id === branch.id))
          this.branches.push(branch);
      source = this.branches.filter(
        (branch) => branch.tenantId === user.tenantId,
      );
    }
    const search = options.search?.trim().toLowerCase();
    const filtered = source.filter(
      (branch) => !search || branch.name.toLowerCase().includes(search),
    );
    const offset = Math.max(0, options.offset ?? 0);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    return {
      data: filtered.slice(offset, offset + limit),
      offset,
      limit,
      total: filtered.length,
      nextOffset: offset + limit < filtered.length ? offset + limit : null,
    };
  }
  async createBranch(token: string, name: string, timezone = 'UTC') {
    const user = this.requireUser(token);
    this.requirePermission(user, 'company.branches.edit');
    await this.listBranches(token);
    const tenant = this.tenants.find((item) => item.id === user.tenantId);
    this.ensureLimit(
      tenant,
      'branches',
      this.branches.filter(
        (branch) => branch.tenantId === user.tenantId && branch.active,
      ).length,
    );
    const normalizedName = name.trim();
    if (!normalizedName) throw new ConflictException('BRANCH_NAME_REQUIRED');
    if (
      this.branches.some(
        (branch) =>
          branch.tenantId === user.tenantId &&
          branch.name.toLowerCase() === normalizedName.toLowerCase(),
      )
    )
      throw new ConflictException('BRANCH_EXISTS');
    const branch = {
      id: randomUUID(),
      tenantId: user.tenantId,
      name: normalizedName,
      timezone,
      active: true,
    };
    if (/^[0-9a-f-]{36}$/i.test(user.tenantId))
      await this.repository.insertBranch(branch);
    this.branches.push(branch);
    this.record('BRANCH_CREATED', user.id, branch.id);
    return branch;
  }
  async updateBranch(
    token: string,
    id: string,
    patch: { name?: string; timezone?: string; active?: boolean },
  ) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'company.branches.edit');
    await this.listBranches(token);
    const branch = this.branches.find(
      (item) => item.id === id && item.tenantId === user.tenantId,
    );
    if (!branch) throw new NotFoundException('BRANCH_NOT_FOUND');
    if (
      patch.name !== undefined &&
      (!patch.name.trim() ||
        this.branches.some(
          (item) =>
            item.id !== id &&
            item.tenantId === user.tenantId &&
            item.name.toLowerCase() === patch.name?.trim().toLowerCase(),
        ))
    )
      throw new ConflictException('BRANCH_NAME_INVALID');
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f-]{36}$/i.test(user.tenantId))
      await this.repository.updateBranch(id, user.tenantId, patch);
    Object.assign(branch, patch);
    this.record('BRANCH_UPDATED', user.id, id);
    return branch;
  }
  async listTeams(
    token: string,
    options: { offset?: number; limit?: number; search?: string } = {},
  ) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'company.teams.view');
    let source = this.teams.filter((team) => team.tenantId === user.tenantId);
    if (/^[0-9a-f-]{36}$/i.test(user.tenantId)) {
      const persisted = await this.repository.findTeams(user.tenantId);
      for (const team of persisted)
        if (!this.teams.some((candidate) => candidate.id === team.id))
          this.teams.push(team);
      source = this.teams.filter((team) => team.tenantId === user.tenantId);
    }
    const search = options.search?.trim().toLowerCase();
    const filtered = source.filter(
      (team) => !search || team.name.toLowerCase().includes(search),
    );
    const offset = Math.max(0, options.offset ?? 0);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    return {
      data: filtered.slice(offset, offset + limit),
      offset,
      limit,
      total: filtered.length,
      nextOffset: offset + limit < filtered.length ? offset + limit : null,
    };
  }
  async createTeam(token: string, name: string, leadUserId?: string) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'company.teams.edit');
    await this.listTeams(token);
    await this.listUsers(token, { limit: 200 });
    if (
      leadUserId &&
      !this.users.some(
        (candidate) =>
          candidate.id === leadUserId &&
          candidate.tenantId === user.tenantId &&
          candidate.active,
      )
    )
      throw new ConflictException('INVALID_TEAM_LEAD');
    const normalizedName = name.trim();
    if (!normalizedName) throw new ConflictException('TEAM_NAME_REQUIRED');
    if (
      this.teams.some(
        (item) =>
          item.tenantId === user.tenantId &&
          item.name.toLowerCase() === normalizedName.toLowerCase(),
      )
    )
      throw new ConflictException('TEAM_NAME_INVALID');
    const team = {
      id: randomUUID(),
      tenantId: user.tenantId,
      name: normalizedName,
      leadUserId,
      active: true,
    };
    if (/^[0-9a-f-]{36}$/i.test(user.tenantId)) {
      await this.repository.insertTeam(team);
      if (/^[0-9a-f-]{36}$/i.test(user.id))
        await this.repository.recordTeamLead({
          id: randomUUID(),
          tenantId: user.tenantId,
          teamId: team.id,
          leadUserId,
          changedBy: user.id,
        });
    }
    this.teams.push(team);
    this.record('TEAM_CREATED', user.id, team.id);
    return team;
  }
  async updateTeam(
    token: string,
    id: string,
    patch: { name?: string; leadUserId?: string; active?: boolean },
  ) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'company.teams.edit');
    await this.listTeams(token);
    await this.listUsers(token, { limit: 200 });
    const team = this.teams.find(
      (item) => item.id === id && item.tenantId === user.tenantId,
    );
    if (!team) throw new NotFoundException('TEAM_NOT_FOUND');
    if (
      patch.name !== undefined &&
      (!patch.name.trim() ||
        this.teams.some(
          (item) =>
            item.id !== id &&
            item.tenantId === user.tenantId &&
            item.name.toLowerCase() === patch.name?.trim().toLowerCase(),
        ))
    )
      throw new ConflictException('TEAM_NAME_INVALID');
    if (
      patch.leadUserId &&
      !this.users.some(
        (candidate) =>
          candidate.id === patch.leadUserId &&
          candidate.tenantId === user.tenantId &&
          candidate.active,
      )
    )
      throw new ConflictException('INVALID_TEAM_LEAD');
    const leadChanged =
      patch.leadUserId !== undefined && patch.leadUserId !== team.leadUserId;
    Object.assign(team, patch);
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f-]{36}$/i.test(user.tenantId)) {
      await this.repository.updateTeam(id, user.tenantId, patch);
      if (leadChanged && /^[0-9a-f-]{36}$/i.test(user.id))
        await this.repository.recordTeamLead({
          id: randomUUID(),
          tenantId: user.tenantId,
          teamId: id,
          leadUserId: patch.leadUserId,
          changedBy: user.id,
        });
    }
    this.record('TEAM_UPDATED', user.id, id);
    return team;
  }
  async assignBranchMembership(
    token: string,
    branchId: string,
    userId: string,
  ) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'company.branches.edit');
    await this.listBranches(token);
    const branch = this.branches.find(
      (item) =>
        item.id === branchId && item.tenantId === actor.tenantId && item.active,
    );
    const member = this.users.find(
      (item) =>
        item.id === userId && item.tenantId === actor.tenantId && item.active,
    );
    if (!branch) throw new NotFoundException('BRANCH_NOT_FOUND');
    if (!member) throw new NotFoundException('USER_NOT_FOUND');
    if (
      /^[0-9a-f-]{36}$/i.test(actor.tenantId) &&
      /^[0-9a-f-]{36}$/i.test(branchId) &&
      /^[0-9a-f-]{36}$/i.test(userId) &&
      /^[0-9a-f-]{36}$/i.test(actor.id)
    )
      await this.repository.addBranchMembership({
        id: randomUUID(),
        tenantId: actor.tenantId,
        branchId,
        userId,
        assignedBy: actor.id,
      });
    const key = `${actor.tenantId}:${branchId}`;
    this.branchMemberships.set(
      key,
      new Set([...(this.branchMemberships.get(key) ?? []), userId]),
    );
    this.record('BRANCH_MEMBER_ASSIGNED', actor.id, userId);
    return { branchId, userId };
  }
  async assignTeamMembership(token: string, teamId: string, userId: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'company.teams.edit');
    await this.listTeams(token);
    const team = this.teams.find(
      (item) =>
        item.id === teamId && item.tenantId === actor.tenantId && item.active,
    );
    const member = this.users.find(
      (item) =>
        item.id === userId && item.tenantId === actor.tenantId && item.active,
    );
    if (!team) throw new NotFoundException('TEAM_NOT_FOUND');
    if (!member) throw new NotFoundException('USER_NOT_FOUND');
    if (
      /^[0-9a-f-]{36}$/i.test(actor.tenantId) &&
      /^[0-9a-f-]{36}$/i.test(teamId) &&
      /^[0-9a-f-]{36}$/i.test(userId) &&
      /^[0-9a-f-]{36}$/i.test(actor.id)
    )
      await this.repository.addTeamMembership({
        id: randomUUID(),
        tenantId: actor.tenantId,
        teamId,
        userId,
        assignedBy: actor.id,
      });
    const key = `${actor.tenantId}:${teamId}`;
    this.teamMemberships.set(
      key,
      new Set([...(this.teamMemberships.get(key) ?? []), userId]),
    );
    this.record('TEAM_MEMBER_ASSIGNED', actor.id, userId);
    return { teamId, userId };
  }
  async endBranchMembership(token: string, branchId: string, userId: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'company.branches.edit');
    await this.listBranches(token);
    const branch = this.branches.find(
      (item) => item.id === branchId && item.tenantId === actor.tenantId,
    );
    if (!branch) throw new NotFoundException('BRANCH_NOT_FOUND');
    if (
      /^[0-9a-f-]{36}$/i.test(actor.tenantId) &&
      /^[0-9a-f-]{36}$/i.test(branchId) &&
      /^[0-9a-f-]{36}$/i.test(userId)
    )
      await this.repository.endBranchMembership(
        actor.tenantId,
        branchId,
        userId,
      );
    this.branchMemberships.get(`${actor.tenantId}:${branchId}`)?.delete(userId);
    this.record('BRANCH_MEMBER_REMOVED', actor.id, userId);
    return null;
  }
  async endTeamMembership(token: string, teamId: string, userId: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'company.teams.edit');
    await this.listTeams(token);
    const team = this.teams.find(
      (item) => item.id === teamId && item.tenantId === actor.tenantId,
    );
    if (!team) throw new NotFoundException('TEAM_NOT_FOUND');
    if (
      /^[0-9a-f-]{36}$/i.test(actor.tenantId) &&
      /^[0-9a-f-]{36}$/i.test(teamId) &&
      /^[0-9a-f-]{36}$/i.test(userId)
    )
      await this.repository.endTeamMembership(actor.tenantId, teamId, userId);
    this.teamMemberships.get(`${actor.tenantId}:${teamId}`)?.delete(userId);
    this.record('TEAM_MEMBER_REMOVED', actor.id, userId);
    return null;
  }
  async branchMembershipsFor(token: string, branchId: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'company.branches.view');
    await this.listBranches(token);
    const branch = this.branches.find(
      (item) => item.id === branchId && item.tenantId === actor.tenantId,
    );
    if (!branch) throw new NotFoundException('BRANCH_NOT_FOUND');
    if (
      /^[0-9a-f-]{36}$/i.test(actor.tenantId) &&
      /^[0-9a-f-]{36}$/i.test(branchId)
    )
      return this.repository.findBranchMemberships(actor.tenantId, branchId);
    return [
      ...(this.branchMemberships.get(`${actor.tenantId}:${branchId}`) ?? []),
    ].map((userId) => ({ userId, startsAt: new Date().toISOString() }));
  }
  async teamMembershipsFor(token: string, teamId: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'company.teams.view');
    await this.listTeams(token);
    const team = this.teams.find(
      (item) => item.id === teamId && item.tenantId === actor.tenantId,
    );
    if (!team) throw new NotFoundException('TEAM_NOT_FOUND');
    if (
      /^[0-9a-f-]{36}$/i.test(actor.tenantId) &&
      /^[0-9a-f-]{36}$/i.test(teamId)
    )
      return this.repository.findTeamMemberships(actor.tenantId, teamId);
    return [
      ...(this.teamMemberships.get(`${actor.tenantId}:${teamId}`) ?? []),
    ].map((userId) => ({ userId, startsAt: new Date().toISOString() }));
  }
  async listUsers(
    token: string,
    options: { offset?: number; limit?: number; search?: string } = {},
  ) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'iam.users.view');
    const search = options.search?.trim().toLowerCase();
    const offset = Math.max(0, options.offset ?? 0);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const local = this.users.filter(
      (candidate) =>
        candidate.tenantId === user.tenantId &&
        (!search ||
          candidate.email.toLowerCase().includes(search) ||
          candidate.name.toLowerCase().includes(search)),
    );
    if (!local.length && /^[0-9a-f-]{36}$/i.test(user.tenantId)) {
      const persisted = await this.repository.findUsers(
        user.tenantId,
        search,
        offset,
        limit,
      );
      return {
        data: persisted.data.map((candidate) => this.safeUser(candidate)),
        offset,
        limit,
        total: persisted.total,
        nextOffset: offset + limit < persisted.total ? offset + limit : null,
      };
    }
    return {
      data: local
        .slice(offset, offset + limit)
        .map((candidate) => this.safeUser(candidate)),
      offset,
      limit,
      total: local.length,
      nextOffset: offset + limit < local.length ? offset + limit : null,
    };
  }
  async updateUser(
    token: string,
    id: string,
    patch: { name?: string; active?: boolean },
  ) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'iam.users.edit');
    await this.listUsers(token, { limit: 200 });
    const user = this.users.find(
      (candidate) =>
        candidate.id === id && candidate.tenantId === actor.tenantId,
    );
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (patch.name !== undefined && !patch.name.trim())
      throw new ConflictException('USER_NAME_REQUIRED');
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f-]{36}$/i.test(actor.tenantId))
      await this.repository.updateUser(id, actor.tenantId, patch);
    Object.assign(user, patch);
    if (patch.active === false) {
      for (const [key, value] of this.sessions)
        if (value.id === id) {
          this.sessions.delete(key);
          this.sessionMetadata.delete(key);
        }
      for (const [deviceId, device] of this.devices)
        if (device.userId === id) this.devices.delete(deviceId);
      if (/^[0-9a-f-]{36}$/i.test(id)) {
        await this.repository.revokeUserSessions(id);
        await this.repository.revokeUserDevices(id);
      }
    }
    this.record(
      patch.active === false ? 'USER_DEACTIVATED' : 'USER_UPDATED',
      actor.id,
      id,
    );
    return this.safeUser(user);
  }
  async listSkills(token: string) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'iam.users.view');
    if (/^[0-9a-f-]{36}$/i.test(user.tenantId)) {
      const persisted = await this.repository.findSkills(user.tenantId);
      for (const skill of persisted)
        if (!this.skills.some((candidate) => candidate.id === skill.id))
          this.skills.push(skill);
    }
    return this.skills.filter(
      (skill) => skill.tenantId === user.tenantId && skill.active,
    );
  }
  async createSkill(token: string, name: string) {
    const user = this.requireUser(token);
    this.requirePermission(user, 'iam.users.edit');
    await this.listSkills(token);
    if (!name?.trim()) throw new ConflictException('SKILL_NAME_REQUIRED');
    if (
      this.skills.some(
        (skill) =>
          skill.tenantId === user.tenantId &&
          skill.name.toLowerCase() === name.trim().toLowerCase(),
      )
    )
      throw new ConflictException('SKILL_EXISTS');
    const skill = {
      id: randomUUID(),
      tenantId: user.tenantId,
      name: name.trim(),
      active: true,
    };
    if (/^[0-9a-f-]{36}$/i.test(user.tenantId))
      await this.repository.insertSkill(skill);
    this.skills.push(skill);
    this.record('SKILL_CREATED', user.id, skill.id);
    return skill;
  }
  async assignUserSkills(token: string, userId: string, skillIds: string[]) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'iam.users.edit');
    await this.listUsers(token, { limit: 200 });
    const user = this.users.find(
      (candidate) =>
        candidate.id === userId && candidate.tenantId === actor.tenantId,
    );
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    const valid = this.skills.filter(
      (skill) =>
        skill.tenantId === actor.tenantId &&
        skill.active &&
        skillIds.includes(skill.id),
    );
    if (valid.length !== skillIds.length)
      throw new ConflictException('INVALID_SKILL_ASSIGNMENT');
    if (
      /^[0-9a-f-]{36}$/i.test(actor.tenantId) &&
      /^[0-9a-f-]{36}$/i.test(userId) &&
      skillIds.every((id) => /^[0-9a-f-]{36}$/i.test(id)) &&
      /^[0-9a-f-]{36}$/i.test(actor.id)
    )
      await this.repository.replaceUserSkills(
        actor.tenantId,
        userId,
        skillIds,
        actor.id,
      );
    this.userSkills.set(userId, new Set(skillIds));
    this.record('USER_SKILLS_CHANGED', actor.id, userId);
    return { userId, skillIds: valid.map((skill) => skill.id) };
  }
  async getUserSkills(token: string, userId: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'iam.users.view');
    await this.listUsers(token, { limit: 200 });
    const user = this.users.find(
      (candidate) =>
        candidate.id === userId && candidate.tenantId === actor.tenantId,
    );
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    const local = this.skills.filter((skill) =>
      this.userSkills.get(userId)?.has(skill.id),
    );
    if (
      local.length ||
      !/^[0-9a-f-]{36}$/i.test(userId) ||
      !/^[0-9a-f-]{36}$/i.test(actor.tenantId)
    )
      return local;
    return this.repository.findUserSkills(actor.tenantId, userId);
  }
  async deactivateUser(token: string, id: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'iam.users.deactivate');
    await this.listUsers(token, { limit: 200 });
    const user = this.users.find(
      (candidate) =>
        candidate.id === id && candidate.tenantId === actor.tenantId,
    );
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (
      /^[0-9a-f-]{36}$/i.test(id) &&
      /^[0-9a-f-]{36}$/i.test(actor.tenantId)
    ) {
      await this.repository.updateUser(id, actor.tenantId, { active: false });
      await this.repository.revokeUserSessions(id);
      await this.repository.revokeUserDevices(id);
    }
    user.active = false;
    for (const [key, value] of this.sessions)
      if (value.id === id) {
        this.sessions.delete(key);
        this.sessionMetadata.delete(key);
      }
    for (const [deviceId, device] of this.devices)
      if (device.userId === id) this.devices.delete(deviceId);
    this.record('USER_DEACTIVATED', actor.id, id);
    return this.safeUser(user);
  }
  async unlockUser(token: string, id: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'iam.users.edit');
    await this.listUsers(token, { limit: 200 });
    const user = this.users.find(
      (candidate) =>
        candidate.id === id && candidate.tenantId === actor.tenantId,
    );
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f-]{36}$/i.test(actor.tenantId))
      await this.repository.clearAccountLockout(id);
    user.lockedUntil = undefined;
    this.loginFailures.delete(user.email.toLowerCase());
    this.record('ACCOUNT_UNLOCKED', actor.id, id);
    return this.safeUser(user);
  }
  async createDestructiveRequest(
    tenantId: string,
    godSessionId: string,
    action: string,
    targetId: string,
    payload: unknown,
    requester = 'platform-admin',
  ) {
    const session = await this.currentGodSession(godSessionId);
    if (session.tenantId !== tenantId)
      throw new ForbiddenException('GOD_TENANT_CONTEXT_MISMATCH');
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const expiresAt = Date.now() + 30 * 60_000;
    const request = {
      id: randomUUID(),
      tenantId,
      reason: session.reason,
      action,
      targetId,
      payload,
      payloadHash,
      status: 'REQUESTED' as const,
      requester,
      expiresAt,
    };
    const requesterAdminId = process.env.PLATFORM_ADMIN_ID;
    if (
      /^[0-9a-f-]{36}$/i.test(requesterAdminId ?? '') &&
      /^[0-9a-f-]{36}$/i.test(tenantId)
    )
      await this.repository.insertDestructiveRequest({
        id: request.id,
        requesterAdminId: requesterAdminId as string,
        tenantId,
        action,
        targetId,
        payload: payload as Record<string, unknown>,
        payloadHash,
        reason: session.reason,
        status: request.status,
        expiresAt: new Date(expiresAt).toISOString(),
      });
    this.destructiveRequests.push(request);
    this.record('DESTRUCTIVE_REQUESTED', requester, targetId);
    return request;
  }
  async approveDestructiveRequest(id: string, approver: string) {
    const request = await this.requirePendingRequest(id);
    if (request.status !== 'REQUESTED')
      throw new ConflictException('REQUEST_NOT_PENDING');
    if (request.requester === approver)
      throw new ConflictException('SELF_APPROVAL_FORBIDDEN');
    if (
      /^[0-9a-f-]{36}$/i.test(id) &&
      /^[0-9a-f-]{36}$/i.test(request.tenantId)
    )
      await this.repository.updateDestructiveRequest(
        id,
        request.tenantId,
        'APPROVED',
        /^[0-9a-f-]{36}$/i.test(approver) ? approver : undefined,
      );
    request.status = 'APPROVED';
    request.approver = approver;
    this.record('DESTRUCTIVE_APPROVED', approver, id);
    return request;
  }
  async rejectDestructiveRequest(id: string, approver: string) {
    const request = await this.requirePendingRequest(id);
    if (request.status !== 'REQUESTED')
      throw new ConflictException('REQUEST_NOT_PENDING');
    if (request.requester === approver)
      throw new ConflictException('SELF_APPROVAL_FORBIDDEN');
    if (
      /^[0-9a-f-]{36}$/i.test(id) &&
      /^[0-9a-f-]{36}$/i.test(request.tenantId)
    )
      await this.repository.updateDestructiveRequest(
        id,
        request.tenantId,
        'REJECTED',
        /^[0-9a-f-]{36}$/i.test(approver) ? approver : undefined,
      );
    request.status = 'REJECTED';
    request.approver = approver;
    this.record('DESTRUCTIVE_REJECTED', approver, id);
    return request;
  }
  async executeDestructiveRequest(id: string, actor: string, payload: unknown) {
    const request = await this.requirePendingRequest(id);
    if (request.status !== 'APPROVED')
      throw new ConflictException('REQUEST_NOT_APPROVED');
    if (!request.approver || request.approver === actor)
      throw new ConflictException('SECOND_APPROVER_REQUIRED');
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    if (payloadHash !== request.payloadHash)
      throw new ConflictException('APPROVED_PAYLOAD_CHANGED');
    if (request.action === 'TENANT_ARCHIVE') {
      if (request.targetId !== request.tenantId)
        throw new ConflictException('ARCHIVE_TARGET_MISMATCH');
      const tenant =
        this.tenants.find((item) => item.id === request.tenantId) ??
        (await this.repository.findTenant(request.tenantId));
      if (!tenant) throw new NotFoundException('TENANT_NOT_FOUND');
      if (/^[0-9a-f-]{36}$/i.test(request.tenantId))
        await this.repository.archiveTenant(request.tenantId);
      const localTenant = this.tenants.find(
        (item) => item.id === request.tenantId,
      );
      if (localTenant) {
        localTenant.status = 'ARCHIVED';
        localTenant.updatedAt = new Date().toISOString();
      }
      for (const [key, user] of this.sessions)
        if (user.tenantId === request.tenantId) {
          this.sessions.delete(key);
          this.sessionMetadata.delete(key);
        }
    }
    request.status = 'EXECUTED';
    if (
      /^[0-9a-f-]{36}$/i.test(id) &&
      /^[0-9a-f-]{36}$/i.test(request.tenantId)
    )
      await this.repository.updateDestructiveRequest(
        id,
        request.tenantId,
        'EXECUTED',
        undefined,
        true,
      );
    this.record('DESTRUCTIVE_EXECUTED', actor, id);
    return request;
  }
  async assignRoles(token: string, userId: string, roleIds: string[]) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'iam.assignments.configure');
    const user = this.users.find(
      (candidate) =>
        candidate.id === userId && candidate.tenantId === actor.tenantId,
    );
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    const roles = this.roles.filter(
      (role) => role.tenantId === actor.tenantId && roleIds.includes(role.id),
    );
    if (roles.length !== roleIds.length)
      throw new ConflictException('INVALID_ROLE_ASSIGNMENT');
    if (
      /^[0-9a-f-]{36}$/i.test(userId) &&
      /^[0-9a-f-]{36}$/i.test(actor.tenantId) &&
      roleIds.every((id) => /^[0-9a-f-]{36}$/i.test(id))
    )
      await this.repository.replaceUserRoles(actor.tenantId, userId, roleIds);
    user.roles = roles.map((role) => role.id);
    this.capabilityRevision += 1;
    this.record('USER_ROLES_CHANGED', actor.id, userId);
    return this.safeUser(user);
  }
  async currentGodSession(id: string) {
    let session = this.godSessions.get(id);
    if (!session && /^[0-9a-f-]{36}$/i.test(id)) {
      for (const tenant of this.tenants) {
        if (!/^[0-9a-f-]{36}$/i.test(tenant.id)) continue;
        const persisted = await this.repository
          .findGodSession(id, tenant.id)
          .catch(() => undefined);
        if (persisted) {
          session = {
            tenantId: persisted.tenantId,
            reason: persisted.reason,
            createdAt: new Date(persisted.reauthenticatedAt).getTime(),
            expiresAt: new Date(persisted.expiresAt).getTime(),
            lastActivityAt: new Date(persisted.lastActivityAt).getTime(),
          };
          this.godSessions.set(id, session);
          break;
        }
      }
    }
    const now = Date.now();
    if (
      !session ||
      session.expiresAt <= now ||
      session.lastActivityAt + 5 * 60_000 <= now
    ) {
      this.godSessions.delete(id);
      if (
        session &&
        /^[0-9a-f-]{36}$/i.test(id) &&
        /^[0-9a-f-]{36}$/i.test(session.tenantId)
      )
        void this.repository
          .endGodSession(id, session.tenantId)
          .catch(() => undefined);
      throw new UnauthorizedException('GOD_SESSION_EXPIRED');
    }
    session.lastActivityAt = now;
    if (
      /^[0-9a-f-]{36}$/i.test(id) &&
      /^[0-9a-f-]{36}$/i.test(session.tenantId)
    )
      void this.repository
        .touchGodSession(id, session.tenantId)
        .catch(() => undefined);
    return {
      id,
      tenantId: session.tenantId,
      reason: session.reason,
      createdAt: new Date(session.createdAt).toISOString(),
      lastActivityAt: new Date(session.lastActivityAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
    };
  }
  async endGodSession(id: string) {
    const session = this.godSessions.get(id);
    this.godSessions.delete(id);
    if (
      session &&
      /^[0-9a-f-]{36}$/i.test(id) &&
      /^[0-9a-f-]{36}$/i.test(session.tenantId)
    )
      await this.repository
        .endGodSession(id, session.tenantId)
        .catch(() => undefined);
    this.record('GOD_SESSION_ENDED', 'platform-admin', id);
    return null;
  }
  async suspendTenant(id: string, reason: string) {
    const tenant = await this.loadTenant(id);
    if (!tenant) throw new NotFoundException('TENANT_NOT_FOUND');
    if (!reason?.trim())
      throw new ConflictException('SUSPENSION_REASON_REQUIRED');
    if (tenant.status === 'ARCHIVED')
      throw new ConflictException('ARCHIVED_TENANT_IMMUTABLE');
    if (/^[0-9a-f-]{36}$/i.test(id)) {
      await this.repository.updateTenant(id, { status: 'SUSPENDED' });
      await this.repository.revokeTenantSessions(id);
      await this.repository.revokeTenantDevices(id);
    }
    tenant.status = 'SUSPENDED';
    tenant.updatedAt = new Date().toISOString();
    for (const [key, user] of this.sessions)
      if (user.tenantId === id) {
        this.sessions.delete(key);
        this.sessionMetadata.delete(key);
      }
    this.record('TENANT_SUSPENDED', 'platform-admin', id);
    return tenant;
  }
  async restoreTenant(id: string, reason: string) {
    const tenant = await this.loadTenant(id);
    if (!tenant) throw new NotFoundException('TENANT_NOT_FOUND');
    if (!reason?.trim()) throw new ConflictException('RESTORE_REASON_REQUIRED');
    if (tenant.status === 'ARCHIVED')
      throw new ConflictException('ARCHIVED_TENANT_IMMUTABLE');
    if (tenant.status === 'ACTIVE')
      throw new ConflictException('TENANT_ALREADY_ACTIVE');
    if (/^[0-9a-f-]{36}$/i.test(id))
      await this.repository.updateTenant(id, { status: 'ACTIVE' });
    tenant.status = 'ACTIVE';
    tenant.updatedAt = new Date().toISOString();
    this.record('TENANT_RESTORED', 'platform-admin', id);
    return tenant;
  }
  archiveTenantRequest(tenantId: string, reason: string, godSessionId: string) {
    return this.createDestructiveRequest(
      tenantId,
      godSessionId,
      'TENANT_ARCHIVE',
      tenantId,
      { tenantId, reason },
    );
  }
  async inviteUser(token: string, email: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'iam.users.invite');
    const invitationToken = randomUUID();
    const tokenHash = this.hashToken(invitationToken);
    const invitation = {
      tenantId: actor.tenantId,
      email: email.trim().toLowerCase(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60_000,
    };
    if (!invitation.email || !invitation.email.includes('@'))
      throw new ConflictException('INVALID_EMAIL');
    if (/^[0-9a-f-]{36}$/i.test(actor.tenantId))
      await this.repository.insertInvitation({
        id: randomUUID(),
        tenantId: actor.tenantId,
        email: invitation.email,
        tokenHash,
        expiresAt: new Date(invitation.expiresAt).toISOString(),
      });
    this.invitations.set(tokenHash, invitation);
    this.notifications.sendInvitation(invitation.email, invitationToken);
    this.record('INVITATION_CREATED', actor.id, invitation.email);
    return {
      expiresAt: new Date(invitation.expiresAt).toISOString(),
      invitationToken,
    };
  }
  async cancelInvitation(token: string, invitationToken: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'iam.users.invite');
    const key = this.hashToken(invitationToken);
    const invitation = this.invitations.get(key);
    if (!invitation || invitation.tenantId !== actor.tenantId)
      throw new NotFoundException('INVITATION_NOT_FOUND');
    if (/^[0-9a-f-]{36}$/i.test(actor.tenantId))
      await this.repository.cancelInvitation(actor.tenantId, key);
    this.invitations.delete(key);
    this.record('INVITATION_CANCELLED', actor.id, invitation.email);
    return null;
  }
  async reissueInvitation(token: string, invitationToken: string) {
    const actor = this.requireUser(token);
    this.requirePermission(actor, 'iam.users.invite');
    const key = this.hashToken(invitationToken);
    const invitation = this.invitations.get(key);
    if (!invitation || invitation.tenantId !== actor.tenantId)
      throw new NotFoundException('INVITATION_NOT_FOUND');
    if (/^[0-9a-f-]{36}$/i.test(actor.tenantId))
      await this.repository.cancelInvitation(actor.tenantId, key);
    this.invitations.delete(key);
    return this.inviteUser(token, invitation.email);
  }
  async acceptInvitation(token: string, password: string, name: string) {
    const tokenHash = this.hashToken(token);
    let invitation = this.invitations.get(tokenHash);
    if (!invitation && /^[0-9a-f-]{64}$/i.test(tokenHash)) {
      const persisted = await this.repository.findInvitation(tokenHash);
      if (persisted)
        invitation = {
          tenantId: persisted.tenantId,
          email: persisted.email,
          expiresAt: new Date(persisted.expiresAt).getTime(),
          acceptedAt: persisted.acceptedAt,
        };
    }
    if (
      !invitation ||
      invitation.expiresAt <= Date.now() ||
      invitation.acceptedAt
    )
      throw new ConflictException('INVITATION_INVALID');
    if (password.length < 10)
      throw new ConflictException('PASSWORD_POLICY_FAILED');
    const tenant = this.tenants.find((item) => item.id === invitation.tenantId);
    this.ensureLimit(
      tenant,
      'users',
      this.users.filter((user) => user.tenantId === invitation.tenantId).length,
    );
    const passwordHash = hashPassword(password);
    const user = {
      id: randomUUID(),
      email: invitation.email,
      name,
      password: passwordHash,
      tenantId: invitation.tenantId,
      active: true,
      roles: [],
    };
    if (
      /^[0-9a-f-]{36}$/i.test(user.id) &&
      /^[0-9a-f-]{36}$/i.test(user.tenantId)
    )
      await this.tenantContext.run(user.tenantId, user.id, () =>
        this.repository.acceptInvitation({
          userId: user.id,
          tenantId: user.tenantId,
          email: user.email,
          displayName: user.name,
          passwordHash,
          tokenHash,
        }),
      );
    this.users.push(user);
    this.invitations.delete(tokenHash);
    this.record('INVITATION_ACCEPTED', user.id, invitation.tenantId);
    return this.safeUser(user);
  }
  async addSupportNote(token: string, tenantId: string, note: string) {
    const actor = this.requireUser(token);
    if (actor.tenantId !== tenantId)
      throw new ForbiddenException('TENANT_SCOPE_REQUIRED');
    if (!note?.trim()) throw new ConflictException('NOTE_REQUIRED');
    const entry = {
      id: randomUUID(),
      note: note.trim(),
      actorId: actor.id,
      createdAt: new Date().toISOString(),
    };
    if (/^[0-9a-f-]{36}$/i.test(tenantId) && /^[0-9a-f-]{36}$/i.test(actor.id))
      await this.repository.insertSupportNote({
        id: entry.id,
        tenantId,
        actorId: actor.id,
        note: entry.note,
      });
    this.supportNotes.set(tenantId, [
      ...(this.supportNotes.get(tenantId) ?? []),
      entry,
    ]);
    this.record('SUPPORT_NOTE_ADDED', actor.id, tenantId);
    return entry;
  }
  async getSupportNotes(token: string, tenantId: string) {
    const actor = this.requireUser(token);
    if (actor.tenantId !== tenantId)
      throw new ForbiddenException('TENANT_SCOPE_REQUIRED');
    const local = this.supportNotes.get(tenantId);
    if (local?.length || !/^[0-9a-f-]{36}$/i.test(tenantId)) return local ?? [];
    return this.repository.findSupportNotes(tenantId);
  }
  async platformSupportNotes(tenantId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(tenantId))
      throw new NotFoundException('TENANT_NOT_FOUND');
    const tenant =
      this.tenants.find((item) => item.id === tenantId) ??
      (await this.repository.findTenant(tenantId));
    if (!tenant) throw new NotFoundException('TENANT_NOT_FOUND');
    return this.tenantContext.run(tenantId, undefined, () =>
      this.repository.findSupportNotes(tenantId),
    );
  }
  async addPlatformSupportNote(
    tenantId: string,
    actorId: string,
    note: string,
  ) {
    if (!/^[0-9a-f-]{36}$/i.test(tenantId) || !/^[0-9a-f-]{36}$/i.test(actorId))
      throw new ConflictException('PLATFORM_ADMIN_ID_REQUIRED');
    if (!note?.trim()) throw new ConflictException('NOTE_REQUIRED');
    const tenant =
      this.tenants.find((item) => item.id === tenantId) ??
      (await this.repository.findTenant(tenantId));
    if (!tenant) throw new NotFoundException('TENANT_NOT_FOUND');
    const entry = {
      id: randomUUID(),
      note: note.trim(),
      actorId,
      createdAt: new Date().toISOString(),
    };
    await this.tenantContext.run(tenantId, actorId, () =>
      this.repository.insertSupportNote({
        id: entry.id,
        tenantId,
        actorId,
        note: entry.note,
      }),
    );
    this.record('PLATFORM_SUPPORT_NOTE_ADDED', actorId, tenantId);
    return entry;
  }
  async uploadIntent(
    token: string,
    mime: string,
    size: number,
    checksum: string,
  ) {
    const user = this.requireUser(token);
    this.storage.validate(mime, size);
    const id = randomUUID();
    const key = this.storage.createKey(user.tenantId, id);
    const signed = await this.storage.presignPut(key, mime, size, checksum);
    const upload = {
      id,
      tenantId: user.tenantId,
      key,
      mime,
      size,
      checksum,
      status: 'PENDING',
    };
    if (/^[0-9a-f-]{36}$/i.test(user.tenantId))
      await this.repository.insertFile({
        id,
        tenantId: user.tenantId,
        objectKey: key,
        mime,
        size,
        checksum,
        actorId: user.id,
      });
    this.uploads.set(id, upload);
    await this.queue.publish(
      'file.upload_intent.created',
      { uploadId: id, mime, size },
      { tenantId: user.tenantId, actorId: user.id },
    );
    return { uploadId: id, key, ...signed };
  }
  async completeUpload(token: string, id: string, checksum: string) {
    const user = this.requireUser(token);
    let upload = this.uploads.get(id);
    if (
      (!upload || upload.tenantId !== user.tenantId) &&
      /^[0-9a-f-]{36}$/i.test(id) &&
      /^[0-9a-f-]{36}$/i.test(user.tenantId)
    ) {
      const persisted = await this.repository.findFile(id, user.tenantId);
      if (persisted) {
        upload = persisted;
        this.uploads.set(id, upload);
      }
    }
    if (!upload || upload.tenantId !== user.tenantId)
      throw new NotFoundException('UPLOAD_NOT_FOUND');
    if (upload.checksum !== checksum)
      throw new ConflictException('CHECKSUM_MISMATCH');
    if (upload.status === 'COMPLETED') return upload;
    if (/^[0-9a-f-]{36}$/i.test(id) && /^[0-9a-f-]{36}$/i.test(user.tenantId))
      await this.repository.completeFile(id, user.tenantId);
    upload.status = 'COMPLETED';
    await this.queue.publish(
      'file.upload.completed',
      { uploadId: id, checksum },
      { tenantId: user.tenantId, actorId: user.id },
    );
    return upload;
  }
  hashForIdempotency(token: string) {
    return this.hashToken(token);
  }
  private issueTokenPair(user: User, familyId: string = randomUUID()) {
    const accessToken = randomUUID();
    const refreshToken = randomUUID();
    const accessExpiresAt = Date.now() + 15 * 60_000;
    const refreshExpiresAt = Date.now() + 7 * 24 * 60 * 60_000;
    this.sessions.set(this.hashToken(accessToken), user);
    this.sessionMetadata.set(this.hashToken(accessToken), {
      familyId,
      tokenType: 'access',
      expiresAt: accessExpiresAt,
      revoked: false,
    });
    this.sessions.set(this.hashToken(refreshToken), user);
    this.sessionMetadata.set(this.hashToken(refreshToken), {
      familyId,
      tokenType: 'refresh',
      expiresAt: refreshExpiresAt,
      revoked: false,
    });
    void this.persistSession(
      user,
      accessToken,
      'access',
      accessExpiresAt,
      familyId,
    ).catch(() => undefined);
    void this.persistSession(
      user,
      refreshToken,
      'refresh',
      refreshExpiresAt,
      familyId,
    ).catch(() => undefined);
    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      refreshExpiresIn: 7 * 24 * 60 * 60,
    };
  }
  private async persistSession(
    user: User,
    token: string,
    tokenType: 'access' | 'refresh',
    expiresAt: number,
    familyId: string,
  ) {
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      !uuid.test(user.id) ||
      !uuid.test(user.tenantId) ||
      !uuid.test(familyId)
    )
      return;
    await this.tenantContext.run(user.tenantId, user.id, () =>
      this.repository.insertSession({
        id: randomUUID(),
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash: this.hashToken(token),
        tokenType,
        expiresAt: new Date(expiresAt).toISOString(),
        familyId,
      }),
    );
  }
  private requirePermission(user: User, permission: string) {
    if (!this.capabilitiesFor(user).includes(permission))
      throw new ForbiddenException('FORBIDDEN');
  }
  private ensureLimit(
    tenant: Tenant | undefined,
    resource: 'users' | 'branches' | 'tasks',
    current: number,
  ) {
    const limit = tenant?.limits?.[resource];
    if (limit !== undefined && current >= limit)
      throw new ConflictException(`${resource.toUpperCase()}_LIMIT_REACHED`);
  }
  private capabilitiesFor(user: User) {
    return [
      ...new Set(
        user.roles.flatMap(
          (id) => this.roles.find((role) => role.id === id)?.permissions ?? [],
        ),
      ),
    ];
  }
  private safeUser(user: User, memberships?: User['memberships']) {
    const tenant = this.tenants.find((item) => item.id === user.tenantId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      activeTenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            status: tenant.status,
            timezone: tenant.timezone,
          }
        : null,
      memberships:
        memberships ??
        user.memberships ??
        (tenant
          ? [
              {
                membershipId: user.tenantId,
                tenantId: tenant.id,
                name: tenant.name,
                status: tenant.status,
                timezone: tenant.timezone,
                active: true,
              },
            ]
          : []),
      roles: user.roles,
      devices: [...this.devices.values()]
        .filter((device) => device.userId === user.id)
        .map(({ id, name, lastSeenAt }) => ({ id, name, lastSeenAt })),
    };
  }
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private async requirePendingRequest(id: string) {
    let request = this.destructiveRequests.find((item) => item.id === id);
    if (!request && /^[0-9a-f-]{36}$/i.test(id)) {
      for (const tenant of this.tenants) {
        if (!/^[0-9a-f-]{36}$/i.test(tenant.id)) continue;
        const persisted = await this.repository
          .findDestructiveRequest(id, tenant.id)
          .catch(() => undefined);
        if (persisted) {
          request = {
            id: persisted.id,
            tenantId: persisted.tenantId,
            reason: persisted.reason,
            action: persisted.action,
            targetId: persisted.targetId,
            payload: persisted.payload,
            payloadHash: persisted.payloadHash,
            status: persisted.status,
            requester: persisted.requesterAdminId,
            approver: persisted.approverAdminId,
            expiresAt: new Date(persisted.expiresAt).getTime(),
          };
          this.destructiveRequests.push(request);
          break;
        }
      }
    }
    if (!request) throw new NotFoundException('REQUEST_NOT_FOUND');
    if (request.expiresAt <= Date.now() && request.status !== 'EXECUTED') {
      request.status = 'EXPIRED';
      if (
        /^[0-9a-f-]{36}$/i.test(request.id) &&
        /^[0-9a-f-]{36}$/i.test(request.tenantId)
      )
        void this.repository
          .updateDestructiveRequest(request.id, request.tenantId, 'EXPIRED')
          .catch(() => undefined);
      this.record('DESTRUCTIVE_EXPIRED', 'system', id);
      throw new ConflictException('REQUEST_EXPIRED');
    }
    if (request.status !== 'REQUESTED' && request.status !== 'APPROVED')
      throw new ConflictException('REQUEST_NOT_PENDING');
    return request;
  }
  private record(action: string, actorId: string, targetId: string) {
    const previousHash = this.audit.length
      ? String(this.audit[this.audit.length - 1].hash)
      : '';
    const occurredAt = new Date().toISOString();
    const id = randomUUID();
    const hash = createHash('sha256')
      .update(
        `${action}:${actorId}:${targetId}:${this.audit.length}:${previousHash}`,
      )
      .digest('hex');
    this.audit.push({
      id,
      action,
      actorId,
      targetId,
      occurredAt,
      previousHash,
      hash,
    });
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const tenantId = this.tenantContext.currentTenantId;
    if (uuid.test(actorId) && tenantId && uuid.test(tenantId))
      void this.repository
        .insertAudit({
          id,
          actorId,
          tenantId,
          action,
          targetId,
          previousHash,
          hash,
          occurredAt,
        })
        .catch(() => undefined);
  }
}
