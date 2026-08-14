import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DependencyHealthService } from './health/dependency-health.service';

@Injectable()
export class AppService {
  constructor(
    private readonly config: ConfigService,
    private readonly dependencies: DependencyHealthService,
  ) {}

  getService() {
    return {
      service: 'fieldbrix-api',
      status: 'online',
      environment: this.config.get<string>('APP_ENV'),
    };
  }

  getLiveness() {
    return { status: 'live' };
  }

  async getReadiness() {
    const dependencies = await this.dependencies.check();
    if (Object.values(dependencies).some((status) => status !== 'ok')) {
      throw new ServiceUnavailableException(
        'Required dependencies are unavailable',
      );
    }
    return { status: 'ready', ...dependencies };
  }

  getVersion() {
    return {
      service: 'fieldbrix-api',
      version: this.config.get<string>('APP_VERSION'),
      commitSha: this.config.get<string>('APP_COMMIT_SHA'),
      buildTime: this.config.get<string>('APP_BUILD_TIME') || null,
    };
  }

  getOpenApi() {
    if (this.config.get<string>('OPENAPI_ENABLED', 'true') !== 'true') throw new NotFoundException();
    return {
      openapi: '3.0.3',
      info: { title: 'FieldBrix API', version: this.config.get<string>('APP_VERSION', '0.0.1') },
      servers: [{ url: '/' }],
      paths: {
        '/health/live': { get: { summary: 'Liveness probe' } },
        '/health/ready': { get: { summary: 'Dependency readiness probe' } },
        '/auth/login': { post: { summary: 'Password login' } },
        '/auth/refresh': { post: { summary: 'Rotate refresh session' } },
        '/auth/logout': { post: { summary: 'Revoke the current session' } },
        '/auth/logout-all': { post: { summary: 'Revoke all sessions' } },
        '/auth/password/forgot': { post: { summary: 'Request a password reset' } },
        '/auth/password/reset': { post: { summary: 'Complete a password reset' } },
        '/me': { get: { summary: 'Current workforce identity' } },
        '/me/sessions': { get: { summary: 'List current user sessions' } },
        '/me/sessions/{id}': { delete: { summary: 'Revoke one owned session' } },
        '/me/tenant-context': { post: { summary: 'Select an active membership context' } },
        '/devices/register': { post: { summary: 'Register a device installation' } },
        '/devices/{id}': { delete: { summary: 'Revoke a device installation' } },
        '/me/capabilities': { get: { summary: 'Effective capability grants' } },
        '/roles': { get: { summary: 'List roles' }, post: { summary: 'Create role' } },
        '/roles/{id}': { get: { summary: 'Read a role' }, patch: { summary: 'Update role metadata' }, delete: { summary: 'Delete a role' } },
        '/roles/{id}/permissions': { put: { summary: 'Replace role grants' } },
        '/roles/{id}/clone': { post: { summary: 'Clone a role' } },
        '/users/{userId}/roles': { put: { summary: 'Replace tenant role assignments' } },
        '/permissions': { get: { summary: 'List permission and scope registry' } },
        '/platform/tenants': { get: { summary: 'List tenants' }, post: { summary: 'Provision tenant' } },
        '/platform/tenants/{id}': { get: { summary: 'Read tenant profile' }, patch: { summary: 'Update tenant profile' } },
        '/platform/tenants/{id}/usage': { get: { summary: 'Read tenant usage' } },
        '/platform/tenants/{id}/limits': { patch: { summary: 'Update tenant limits' } },
        '/platform/tenants/{id}/suspend': { post: { summary: 'Suspend a tenant and revoke active sessions' } },
        '/platform/tenants/{id}/restore': { post: { summary: 'Restore a suspended tenant' } },
        '/platform/tenants/{id}/archive-request': { post: { summary: 'Request tenant archival through approval' } },
        '/platform/tenants/{tenantId}/support-notes': { get: { summary: 'List support notes' }, post: { summary: 'Append a support note' } },
        '/platform/support-notes/{tenantId}': { get: { summary: 'Platform support: list tenant notes' }, post: { summary: 'Platform support: append tenant note' } },
        '/company': { get: { summary: 'Read company settings' }, patch: { summary: 'Update company settings' } },
        '/files/upload-intents': { post: { summary: 'Create a presigned upload intent' } },
        '/files/{id}/complete': { post: { summary: 'Complete an uploaded file' } },
        '/audit-events': { get: { summary: 'List filtered audit events' } },
        '/audit-events/verify': { get: { summary: 'Verify the audit hash chain' } },
        '/invitations/{token}/accept': { post: { summary: 'Accept a workforce invitation' } },
        '/users/invite': { post: { summary: 'Invite a workforce user' } },
        '/branches': { get: { summary: 'List company branches' }, post: { summary: 'Create a company branch' } },
        '/branches/{branchId}/members': { get: { summary: 'List branch membership history' }, post: { summary: 'Assign a user to a branch' } },
        '/branches/{branchId}/members/{userId}': { delete: { summary: 'End a branch membership interval' } },
        '/teams': { get: { summary: 'List company teams' }, post: { summary: 'Create a company team' } },
        '/teams/{teamId}/members': { get: { summary: 'List team membership history' }, post: { summary: 'Assign a user to a team' } },
        '/teams/{teamId}/members/{userId}': { delete: { summary: 'End a team membership interval' } },
        '/users': { get: { summary: 'List workforce users' } },
        '/users/{id}': { patch: { summary: 'Update workforce profile' } },
        '/users/{id}/deactivate': { post: { summary: 'Deactivate workforce user' } },
        '/users/{id}/unlock': { post: { summary: 'Unlock workforce user' } },
        '/users/{id}/skills': { get: { summary: 'List user skills' }, put: { summary: 'Replace user skills' } },
        '/skills': { get: { summary: 'List skills' }, post: { summary: 'Create a skill' } },
        '/invitations/{token}/cancel': { post: { summary: 'Cancel an invitation' } },
        '/invitations/{token}/reissue': { post: { summary: 'Reissue an invitation' } },
        '/platform/god-sessions/{id}': { get: { summary: 'Inspect a God Mode session' } },
        '/platform/god-sessions/current': { get: { summary: 'Inspect current God Mode context' }, delete: { summary: 'End current God Mode context' } },
        '/platform/god-sessions/{id}/end': { post: { summary: 'End a God Mode session' } },
        '/platform/god-sessions': { post: { summary: 'Start a platform god session' } },
        '/platform/destructive-requests': { post: { summary: 'Create a destructive approval request' } },
        '/platform/destructive-requests/{id}/approve': { post: { summary: 'Approve a destructive request' } },
        '/platform/destructive-requests/{id}/reject': { post: { summary: 'Reject a destructive request' } },
        '/platform/destructive-requests/{id}/execute': { post: { summary: 'Execute an approved destructive request' } },
      },
    };
  }
}
