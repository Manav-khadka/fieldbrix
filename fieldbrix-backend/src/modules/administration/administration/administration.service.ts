import { Injectable } from '@nestjs/common';
import { PlatformService } from '../../platform/platform/platform.service';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';

@Injectable()
export class AdministrationService {
  constructor(private readonly platform: PlatformService, private readonly idempotency: IdempotencyService) {}
  tenants(query: { offset?: number; limit?: number; search?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' }) { return this.platform.listTenants(query); }
  tenantDetail(id: string) { return this.platform.tenantDetail(id); }
  async createTenant(name: string, key?: string) { if (!key) return this.platform.createTenant(name); const fingerprint = this.idempotency.fingerprint('POST', '/platform/tenants', { name }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.createTenant(name))).response; }
  async updateTenant(id: string, patch: Record<string, unknown>, key?: string) { if (!key) return this.platform.updateTenant(id, patch); const fingerprint = this.idempotency.fingerprint('PATCH', `/platform/tenants/${id}`, { id, patch }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.updateTenant(id, patch))).response; }
  tenantUsage(id: string) { return this.platform.tenantUsage(id); }
  async updateTenantLimits(id: string, limits: { users: number; branches: number; tasks: number }, key?: string) { if (!key) return this.platform.updateTenantLimits(id, limits); const fingerprint = this.idempotency.fingerprint('PATCH', `/platform/tenants/${id}/limits`, { id, limits }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.updateTenantLimits(id, limits))).response; }
  company(token: string) { return this.platform.getCompany(token); }
  updateCompany(token: string, patch: Record<string, unknown>) { return this.platform.updateCompany(token, patch); }
  branches(token: string, query: { offset?: number; limit?: number; search?: string }) { return this.platform.listBranches(token, query); }
  createBranch(token: string, name: string, timezone?: string) { return this.platform.createBranch(token, name, timezone); }
  updateBranch(token: string, id: string, patch: { name?: string; timezone?: string; active?: boolean }) { return this.platform.updateBranch(token, id, patch); }
  teams(token: string, query: { offset?: number; limit?: number; search?: string }) { return this.platform.listTeams(token, query); }
  createTeam(token: string, name: string, leadUserId?: string) { return this.platform.createTeam(token, name, leadUserId); }
  updateTeam(token: string, id: string, patch: { name?: string; leadUserId?: string; active?: boolean }) { return this.platform.updateTeam(token, id, patch); }
  async assignBranchMembership(token: string, branchId: string, userId: string, key?: string) { if (!key) return this.platform.assignBranchMembership(token, branchId, userId); this.platform.capabilities(token); const fingerprint = this.idempotency.fingerprint('POST', `/branches/${branchId}/members`, { branchId, userId }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.assignBranchMembership(token, branchId, userId))).response; }
  async assignTeamMembership(token: string, teamId: string, userId: string, key?: string) { if (!key) return this.platform.assignTeamMembership(token, teamId, userId); this.platform.capabilities(token); const fingerprint = this.idempotency.fingerprint('POST', `/teams/${teamId}/members`, { teamId, userId }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.assignTeamMembership(token, teamId, userId))).response; }
  async endBranchMembership(token: string, branchId: string, userId: string, key?: string) { if (!key) return this.platform.endBranchMembership(token, branchId, userId); this.platform.capabilities(token); const fingerprint = this.idempotency.fingerprint('DELETE', `/branches/${branchId}/members/${userId}`, { branchId, userId }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.endBranchMembership(token, branchId, userId))).response; }
  async endTeamMembership(token: string, teamId: string, userId: string, key?: string) { if (!key) return this.platform.endTeamMembership(token, teamId, userId); this.platform.capabilities(token); const fingerprint = this.idempotency.fingerprint('DELETE', `/teams/${teamId}/members/${userId}`, { teamId, userId }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.endTeamMembership(token, teamId, userId))).response; }
  branchMemberships(token: string, branchId: string) { return this.platform.branchMembershipsFor(token, branchId); }
  teamMemberships(token: string, teamId: string) { return this.platform.teamMembershipsFor(token, teamId); }
  users(token: string, query: { offset?: number; limit?: number; search?: string }) { return this.platform.listUsers(token, query); }
  updateUser(token: string, id: string, patch: { name?: string; active?: boolean }) { return this.platform.updateUser(token, id, patch); }
  skills(token: string) { return this.platform.listSkills(token); }
  createSkill(token: string, name: string) { return this.platform.createSkill(token, name); }
  assignSkills(token: string, userId: string, skillIds: string[]) { return this.platform.assignUserSkills(token, userId, skillIds); }
  userSkills(token: string, userId: string) { return this.platform.getUserSkills(token, userId); }
  deactivate(token: string, id: string) { return this.platform.deactivateUser(token, id); }
  unlock(token: string, id: string) { return this.platform.unlockUser(token, id); }
  async suspendTenant(id: string, reason: string, key?: string) { if (!key) return this.platform.suspendTenant(id, reason); const fingerprint = this.idempotency.fingerprint('POST', `/platform/tenants/${id}/suspend`, { id, reason }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.suspendTenant(id, reason))).response; }
  async restoreTenant(id: string, reason: string, key?: string) { if (!key) return this.platform.restoreTenant(id, reason); const fingerprint = this.idempotency.fingerprint('POST', `/platform/tenants/${id}/restore`, { id, reason }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.restoreTenant(id, reason))).response; }
  archiveRequest(tenantId: string, reason: string, godSessionId: string) { return this.platform.archiveTenantRequest(tenantId, reason, godSessionId); }
  async invite(token: string, email: string, idempotencyKey?: string) { if (!idempotencyKey) return this.platform.inviteUser(token, email); this.platform.capabilities(token); const fingerprint = this.idempotency.fingerprint('POST', '/users/invite', { email: email.trim().toLowerCase() }); return (await this.idempotency.getOrCreateAsync(idempotencyKey, fingerprint, () => this.platform.inviteUser(token, email))).response; }
  async cancelInvitation(token: string, invitationToken: string, key?: string) { if (!key) return this.platform.cancelInvitation(token, invitationToken); this.platform.capabilities(token); const fingerprint = this.idempotency.fingerprint('POST', '/invitations/{token}/cancel', { tokenHash: this.platform.hashForIdempotency(invitationToken) }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.cancelInvitation(token, invitationToken))).response; }
  async reissueInvitation(token: string, invitationToken: string, key?: string) { if (!key) return this.platform.reissueInvitation(token, invitationToken); this.platform.capabilities(token); const fingerprint = this.idempotency.fingerprint('POST', '/invitations/{token}/reissue', { tokenHash: this.platform.hashForIdempotency(invitationToken) }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.reissueInvitation(token, invitationToken))).response; }
  async acceptInvitation(token: string, password: string, name: string, key?: string) { if (!key) return this.platform.acceptInvitation(token, password, name); const fingerprint = this.idempotency.fingerprint('POST', '/invitations/{token}/accept', { tokenHash: this.platform.hashForIdempotency(token), password, name }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.acceptInvitation(token, password, name))).response; }
  addSupportNote(token: string, tenantId: string, note: string) { return this.platform.addSupportNote(token, tenantId, note); }
  supportNotes(token: string, tenantId: string) { return this.platform.getSupportNotes(token, tenantId); }
  platformSupportNotes(tenantId: string) { return this.platform.platformSupportNotes(tenantId); }
  async addPlatformSupportNote(tenantId: string, actorId: string, note: string, key?: string) { if (!key) return this.platform.addPlatformSupportNote(tenantId, actorId, note); const fingerprint = this.idempotency.fingerprint('POST', `/platform/support-notes/${tenantId}`, { tenantId, note: note.trim() }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.addPlatformSupportNote(tenantId, actorId, note))).response; }
}
