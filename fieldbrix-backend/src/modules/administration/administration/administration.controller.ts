import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AdministrationService } from './administration.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { PlatformAdminGuard } from '../../authorization/guards/platform-admin/platform-admin.guard';
import { InviteUserDto } from '../dto/invite-user.dto/invite-user.dto';
import { CreateBranchDto } from '../dto/create-branch.dto/create-branch.dto';
import { CreateTeamDto } from '../dto/create-team.dto/create-team.dto';
import { CompanySettingsDto } from '../dto/company-settings.dto/company-settings.dto';
import { CreateTenantDto } from '../dto/create-tenant.dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto/update-tenant.dto';
import { TenantLimitsDto } from '../dto/tenant-limits.dto/tenant-limits.dto';
import { TenantReasonDto } from '../dto/tenant-reason.dto/tenant-reason.dto';
import { InvitationAcceptDto } from '../../auth/dto/invitation-accept.dto/invitation-accept.dto';
import { UpdateUserDto } from '../dto/update-user.dto/update-user.dto';
import { CreateSkillDto } from '../dto/create-skill.dto/create-skill.dto';
import { AssignSkillsDto } from '../dto/assign-skills.dto/assign-skills.dto';
import { SupportNoteDto } from '../dto/support-note.dto/support-note.dto';
import { UpdateBranchDto } from '../dto/update-branch.dto/update-branch.dto';
import { UpdateTeamDto } from '../dto/update-team.dto/update-team.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto/list-users-query.dto';
import { ListTenantsQueryDto } from '../dto/list-tenants-query.dto/list-tenants-query.dto';
import { ListDirectoryQueryDto } from '../dto/list-directory-query.dto/list-directory-query.dto';
import { MembershipDto } from '../dto/membership.dto/membership.dto';

@Controller()
@UseGuards(PermissionGuard)
export class AdministrationController {
  constructor(private readonly administration: AdministrationService) {}
  private token(headers: Record<string, string>) {
    const token = headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('UNAUTHORIZED');
    return token;
  }
  @UseGuards(PlatformAdminGuard) @Get('platform/tenants') tenants(
    @Query() query: ListTenantsQueryDto,
  ) {
    return this.administration.tenants(query);
  }
  @UseGuards(PlatformAdminGuard) @Get('platform/tenants/:id') tenantDetail(
    @Param('id') id: string,
  ) {
    return this.administration.tenantDetail(id);
  }
  @UseGuards(PlatformAdminGuard) @Post('platform/tenants') createTenant(
    @Headers() headers: Record<string, string>,
    @Body() body: CreateTenantDto,
  ) {
    return this.administration.createTenant(
      body.name,
      headers['idempotency-key'],
    );
  }
  @UseGuards(PlatformAdminGuard) @Patch('platform/tenants/:id') updateTenant(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: UpdateTenantDto,
  ) {
    return this.administration.updateTenant(
      id,
      { ...body },
      headers['idempotency-key'],
    );
  }
  @UseGuards(PlatformAdminGuard) @Get('platform/tenants/:id/usage') tenantUsage(
    @Param('id') id: string,
  ) {
    return this.administration.tenantUsage(id);
  }
  @UseGuards(PlatformAdminGuard)
  @Patch('platform/tenants/:id/limits')
  updateTenantLimits(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: TenantLimitsDto,
  ) {
    return this.administration.updateTenantLimits(
      id,
      body,
      headers['idempotency-key'],
    );
  }
  @UseGuards(PlatformAdminGuard)
  @Post('platform/tenants/:id/suspend')
  suspendTenant(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: TenantReasonDto,
  ) {
    return this.administration.suspendTenant(
      id,
      body.reason,
      headers['idempotency-key'],
    );
  }
  @UseGuards(PlatformAdminGuard)
  @Post('platform/tenants/:id/restore')
  restoreTenant(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: TenantReasonDto,
  ) {
    return this.administration.restoreTenant(
      id,
      body.reason,
      headers['idempotency-key'],
    );
  }
  @UseGuards(PlatformAdminGuard)
  @Post('platform/tenants/:id/archive-request')
  archiveRequest(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: TenantReasonDto,
  ) {
    const godSessionId = headers['x-god-session-id'];
    if (!godSessionId) throw new UnauthorizedException('GOD_SESSION_REQUIRED');
    return this.administration.archiveRequest(id, body.reason, godSessionId);
  }
  @Permission('company.settings.view') @Get('company') company(
    @Headers() headers: Record<string, string>,
  ) {
    return this.administration.company(this.token(headers));
  }
  @Permission('company.settings.edit') @Patch('company') updateCompany(
    @Headers() headers: Record<string, string>,
    @Body() body: CompanySettingsDto,
  ) {
    return this.administration.updateCompany(this.token(headers), { ...body });
  }
  @Permission('company.branches.view') @Get('branches') branches(
    @Headers() headers: Record<string, string>,
    @Query() query: ListDirectoryQueryDto,
  ) {
    return this.administration.branches(this.token(headers), query);
  }
  @Permission('company.branches.edit') @Post('branches') createBranch(
    @Headers() headers: Record<string, string>,
    @Body() body: CreateBranchDto,
  ) {
    return this.administration.createBranch(
      this.token(headers),
      body.name,
      body.timezone,
    );
  }
  @Permission('company.branches.edit') @Patch('branches/:id') updateBranch(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: UpdateBranchDto,
  ) {
    return this.administration.updateBranch(this.token(headers), id, body);
  }
  @Permission('company.branches.edit', 'branch')
  @Post('branches/:branchId/members')
  assignBranchMember(
    @Headers() headers: Record<string, string>,
    @Param('branchId') branchId: string,
    @Body() body: MembershipDto,
  ) {
    return this.administration.assignBranchMembership(
      this.token(headers),
      branchId,
      body.userId,
      headers['idempotency-key'],
    );
  }
  @Permission('company.branches.view', 'branch')
  @Get('branches/:branchId/members')
  branchMembers(
    @Headers() headers: Record<string, string>,
    @Param('branchId') branchId: string,
  ) {
    return this.administration.branchMemberships(this.token(headers), branchId);
  }
  @Permission('company.branches.edit', 'branch')
  @Delete('branches/:branchId/members/:userId')
  removeBranchMember(
    @Headers() headers: Record<string, string>,
    @Param('branchId') branchId: string,
    @Param('userId') userId: string,
  ) {
    return this.administration.endBranchMembership(
      this.token(headers),
      branchId,
      userId,
      headers['idempotency-key'],
    );
  }
  @Permission('company.teams.view') @Get('teams') teams(
    @Headers() headers: Record<string, string>,
    @Query() query: ListDirectoryQueryDto,
  ) {
    return this.administration.teams(this.token(headers), query);
  }
  @Permission('company.teams.edit') @Post('teams') createTeam(
    @Headers() headers: Record<string, string>,
    @Body() body: CreateTeamDto,
  ) {
    return this.administration.createTeam(
      this.token(headers),
      body.name,
      body.leadUserId,
    );
  }
  @Permission('company.teams.edit') @Patch('teams/:id') updateTeam(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: UpdateTeamDto,
  ) {
    return this.administration.updateTeam(this.token(headers), id, body);
  }
  @Permission('company.teams.edit', 'team')
  @Post('teams/:teamId/members')
  assignTeamMember(
    @Headers() headers: Record<string, string>,
    @Param('teamId') teamId: string,
    @Body() body: MembershipDto,
  ) {
    return this.administration.assignTeamMembership(
      this.token(headers),
      teamId,
      body.userId,
      headers['idempotency-key'],
    );
  }
  @Permission('company.teams.view', 'team')
  @Get('teams/:teamId/members')
  teamMembers(
    @Headers() headers: Record<string, string>,
    @Param('teamId') teamId: string,
  ) {
    return this.administration.teamMemberships(this.token(headers), teamId);
  }
  @Permission('company.teams.edit', 'team')
  @Delete('teams/:teamId/members/:userId')
  removeTeamMember(
    @Headers() headers: Record<string, string>,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.administration.endTeamMembership(
      this.token(headers),
      teamId,
      userId,
      headers['idempotency-key'],
    );
  }
  @Permission('iam.users.view') @Get('users') users(
    @Headers() headers: Record<string, string>,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.administration.users(this.token(headers), query);
  }
  @Permission('iam.users.edit') @Patch('users/:id') updateUser(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.administration.updateUser(this.token(headers), id, body);
  }
  @Permission('iam.users.view') @Get('skills') skills(
    @Headers() headers: Record<string, string>,
  ) {
    return this.administration.skills(this.token(headers));
  }
  @Permission('iam.users.edit') @Post('skills') createSkill(
    @Headers() headers: Record<string, string>,
    @Body() body: CreateSkillDto,
  ) {
    return this.administration.createSkill(this.token(headers), body.name);
  }
  @Permission('iam.users.view') @Get('users/:id/skills') userSkills(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    return this.administration.userSkills(this.token(headers), id);
  }
  @Permission('iam.users.edit') @Put('users/:id/skills') assignSkills(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: AssignSkillsDto,
  ) {
    return this.administration.assignSkills(
      this.token(headers),
      id,
      body.skillIds,
    );
  }
  @Permission('iam.users.invite') @Post('users/invite') invite(
    @Headers() headers: Record<string, string>,
    @Body() body: InviteUserDto,
  ) {
    return this.administration.invite(
      this.token(headers),
      body.email,
      body.idempotencyKey,
    );
  }
  @Permission('iam.users.invite')
  @Post('invitations/:token/cancel')
  cancelInvitation(
    @Headers() headers: Record<string, string>,
    @Param('token') token: string,
  ) {
    return this.administration.cancelInvitation(
      this.token(headers),
      token,
      headers['idempotency-key'],
    );
  }
  @Permission('iam.users.invite')
  @Post('invitations/:token/reissue')
  reissueInvitation(
    @Headers() headers: Record<string, string>,
    @Param('token') token: string,
  ) {
    return this.administration.reissueInvitation(
      this.token(headers),
      token,
      headers['idempotency-key'],
    );
  }
  @Permission('iam.users.deactivate') @Post('users/:id/deactivate') deactivate(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    return this.administration.deactivate(this.token(headers), id);
  }
  @Permission('iam.users.edit') @Post('users/:id/unlock') unlock(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    return this.administration.unlock(this.token(headers), id);
  }
  @Post('invitations/:token/accept') acceptInvitation(
    @Headers() headers: Record<string, string>,
    @Param('token') token: string,
    @Body() body: InvitationAcceptDto,
  ) {
    return this.administration.acceptInvitation(
      token,
      body.password,
      body.name,
      headers['idempotency-key'],
    );
  }
  @Permission('platform.support.notes')
  @Get('platform/tenants/:tenantId/support-notes')
  supportNotes(
    @Headers() headers: Record<string, string>,
    @Param('tenantId') tenantId: string,
  ) {
    return this.administration.supportNotes(this.token(headers), tenantId);
  }
  @Permission('platform.support.notes')
  @Post('platform/tenants/:tenantId/support-notes')
  addSupportNote(
    @Headers() headers: Record<string, string>,
    @Param('tenantId') tenantId: string,
    @Body() body: SupportNoteDto,
  ) {
    return this.administration.addSupportNote(
      this.token(headers),
      tenantId,
      body.note,
    );
  }
  @UseGuards(PlatformAdminGuard)
  @Get('platform/support-notes/:tenantId')
  platformSupportNotes(@Param('tenantId') tenantId: string) {
    return this.administration.platformSupportNotes(tenantId);
  }
  @UseGuards(PlatformAdminGuard)
  @Post('platform/support-notes/:tenantId')
  addPlatformSupportNote(
    @Headers() headers: Record<string, string>,
    @Param('tenantId') tenantId: string,
    @Body() body: SupportNoteDto,
  ) {
    const actorId = headers['x-platform-admin-id'] ?? '';
    return this.administration.addPlatformSupportNote(
      tenantId,
      actorId,
      body.note,
      headers['idempotency-key'],
    );
  }
}
