import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PlatformService } from '../../platform/platform/platform.service';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';

@Injectable()
export class AuthorizationService {
  constructor(
    @Inject(forwardRef(() => PlatformService))
    private readonly platform: PlatformService,
    private readonly idempotency: IdempotencyService,
  ) {}
  capabilities(token: string) {
    return this.platform.capabilities(token);
  }
  roles(token: string) {
    return this.platform.listRoles(token);
  }
  role(token: string, id: string) {
    return this.platform.getRole(token, id);
  }
  async updateRoleMetadata(
    token: string,
    id: string,
    name?: string,
    revision?: number,
    key?: string,
  ) {
    if (!key)
      return this.platform.updateRoleMetadata(token, id, name, revision);
    this.platform.capabilities(token);
    const fingerprint = this.idempotency.fingerprint('PATCH', `/roles/${id}`, {
      id,
      name,
      revision,
    });
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.updateRoleMetadata(token, id, name, revision),
      )
    ).response;
  }
  permissions(token: string) {
    return this.platform.permissionsCatalog(token);
  }
  async createRole(
    token: string,
    name: string,
    cloneFrom?: string,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey)
      return this.platform.createRole(token, name, cloneFrom);
    this.platform.capabilities(token);
    const fingerprint = this.idempotency.fingerprint('POST', '/roles', {
      name,
      cloneFrom,
    });
    return (
      await this.idempotency.getOrCreateAsync(idempotencyKey, fingerprint, () =>
        this.platform.createRole(token, name, cloneFrom),
      )
    ).response;
  }
  async updateRole(
    token: string,
    id: string,
    permissions: string[],
    grants?: Array<{ key: string; scope: 'own' | 'team' | 'branch' | 'all' }>,
    revision?: number,
    key?: string,
  ) {
    if (!key)
      return this.platform.updateRole(token, id, permissions, grants, revision);
    this.platform.capabilities(token);
    const fingerprint = this.idempotency.fingerprint(
      'PUT',
      `/roles/${id}/permissions`,
      { id, permissions, grants, revision },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.updateRole(token, id, permissions, grants, revision),
      )
    ).response;
  }
  async deleteRole(token: string, id: string, key?: string) {
    if (!key) return this.platform.deleteRole(token, id);
    this.platform.capabilities(token);
    const fingerprint = this.idempotency.fingerprint('DELETE', `/roles/${id}`, {
      id,
    });
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.deleteRole(token, id),
      )
    ).response;
  }
  async cloneRole(token: string, id: string, name: string, key?: string) {
    if (!key) return this.platform.cloneRole(token, id, name);
    this.platform.capabilities(token);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      `/roles/${id}/clone`,
      { id, name },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.cloneRole(token, id, name),
      )
    ).response;
  }
  god(body: { tenantId: string; reason: string; reauthSecret: string }) {
    return this.platform.startGodSession(
      body.tenantId,
      body.reason,
      body.reauthSecret,
    );
  }
  async destructive(
    body: {
      tenantId: string;
      godSessionId: string;
      action: string;
      targetId: string;
      payload: unknown;
      requester?: string;
    },
    key?: string,
  ) {
    if (!key)
      return this.platform.createDestructiveRequest(
        body.tenantId,
        body.godSessionId,
        body.action,
        body.targetId,
        body.payload,
        body.requester,
      );
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      '/platform/destructive-requests',
      body,
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.createDestructiveRequest(
          body.tenantId,
          body.godSessionId,
          body.action,
          body.targetId,
          body.payload,
          body.requester,
        ),
      )
    ).response;
  }
  async approve(id: string, approver: string, key?: string) {
    if (!key) return this.platform.approveDestructiveRequest(id, approver);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      `/platform/destructive-requests/${id}/approve`,
      { id, approver },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.approveDestructiveRequest(id, approver),
      )
    ).response;
  }
  async reject(id: string, approver: string, key?: string) {
    if (!key) return this.platform.rejectDestructiveRequest(id, approver);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      `/platform/destructive-requests/${id}/reject`,
      { id, approver },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.rejectDestructiveRequest(id, approver),
      )
    ).response;
  }
  async execute(id: string, actor: string, payload: unknown, key?: string) {
    if (!key)
      return this.platform.executeDestructiveRequest(id, actor, payload);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      `/platform/destructive-requests/${id}/execute`,
      { id, actor, payload },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.executeDestructiveRequest(id, actor, payload),
      )
    ).response;
  }
  async assignRoles(
    token: string,
    userId: string,
    roleIds: string[],
    key?: string,
  ) {
    if (!key) return this.platform.assignRoles(token, userId, roleIds);
    this.platform.capabilities(token);
    const fingerprint = this.idempotency.fingerprint(
      'PUT',
      `/users/${userId}/roles`,
      { userId, roleIds },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.assignRoles(token, userId, roleIds),
      )
    ).response;
  }
  currentGod(id: string) {
    return this.platform.currentGodSession(id);
  }
  endGod(id: string) {
    return this.platform.endGodSession(id);
  }
  currentGodFromHeader(id: string | undefined) {
    if (!id) throw new UnauthorizedException('GOD_SESSION_REQUIRED');
    return this.platform.currentGodSession(id);
  }
}
