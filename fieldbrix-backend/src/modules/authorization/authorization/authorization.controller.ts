import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { Permission } from '../decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../guards/permission/permission.guard';
import { PlatformAdminGuard } from '../guards/platform-admin/platform-admin.guard';
import { CreateRoleDto } from '../dto/create-role.dto/create-role.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto/update-role-permissions.dto';
import { AssignRolesDto } from '../dto/assign-roles.dto/assign-roles.dto';
import { GodSessionDto } from '../dto/god-session.dto/god-session.dto';
import { DestructiveRequestDto } from '../dto/destructive-request.dto/destructive-request.dto';
import { DestructiveExecutionDto } from '../dto/destructive-execution.dto/destructive-execution.dto';
import { UpdateRoleDto } from '../dto/update-role.dto/update-role.dto';

@Controller()
@UseGuards(PermissionGuard)
export class AuthorizationController {
  constructor(private readonly authorization: AuthorizationService) {}
  private token(headers: Record<string, string>) { const token = headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) throw new UnauthorizedException('UNAUTHORIZED'); return token; }
  @Get('me/capabilities') capabilities(@Headers() headers: Record<string, string>) { return this.authorization.capabilities(this.token(headers)); }
  @Permission('iam.roles.view') @Get('roles') roles(@Headers() headers: Record<string, string>) { return this.authorization.roles(this.token(headers)); }
  @Permission('iam.roles.view') @Get('roles/:id') role(@Headers() headers: Record<string, string>, @Param('id') id: string) { return this.authorization.role(this.token(headers), id); }
  @Permission('iam.roles.edit') @Patch('roles/:id') updateRoleMetadata(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: UpdateRoleDto) { return this.authorization.updateRoleMetadata(this.token(headers), id, body.name, body.revision, headers['idempotency-key']); }
  @Permission('iam.roles.view') @Get('permissions') permissions(@Headers() headers: Record<string, string>) { return this.authorization.permissions(this.token(headers)); }
  @Permission('iam.roles.create') @Post('roles') createRole(@Headers() headers: Record<string, string>, @Body() body: CreateRoleDto) { return this.authorization.createRole(this.token(headers), body.name, body.cloneFrom, body.idempotencyKey); }
  @Permission('iam.roles.configure') @Put('roles/:id/permissions') updateRole(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: UpdateRolePermissionsDto) { return this.authorization.updateRole(this.token(headers), id, body.permissions, body.grants, body.revision, headers['idempotency-key']); }
  @Permission('iam.roles.configure') @Delete('roles/:id') deleteRole(@Headers() headers: Record<string, string>, @Param('id') id: string) { return this.authorization.deleteRole(this.token(headers), id, headers['idempotency-key']); }
  @Permission('iam.roles.create') @Post('roles/:id/clone') cloneRole(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: CreateRoleDto) { return this.authorization.cloneRole(this.token(headers), id, body.name, headers['idempotency-key']); }
  @Permission('iam.assignments.configure') @Put('users/:userId/roles') assignRoles(@Headers() headers: Record<string, string>, @Param('userId') userId: string, @Body() body: AssignRolesDto) { return this.authorization.assignRoles(this.token(headers), userId, body.roleIds, headers['idempotency-key']); }
  @UseGuards(PlatformAdminGuard) @Post('platform/god-sessions') god(@Body() body: GodSessionDto) { return this.authorization.god(body); }
  @UseGuards(PlatformAdminGuard) @Post('platform/destructive-requests') destructive(@Headers() headers: Record<string, string>, @Body() body: DestructiveRequestDto) { return this.authorization.destructive({ ...body, requester: this.platformActor(headers) }, headers['idempotency-key']); }
  @UseGuards(PlatformAdminGuard) @Post('platform/destructive-requests/:id/approve') approve(@Headers() headers: Record<string, string>, @Param('id') id: string) { return this.authorization.approve(id, this.platformActor(headers), headers['idempotency-key']); }
  @UseGuards(PlatformAdminGuard) @Post('platform/destructive-requests/:id/reject') reject(@Headers() headers: Record<string, string>, @Param('id') id: string) { return this.authorization.reject(id, this.platformActor(headers), headers['idempotency-key']); }
  @UseGuards(PlatformAdminGuard) @Post('platform/destructive-requests/:id/execute') execute(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: DestructiveExecutionDto) { return this.authorization.execute(id, this.platformActor(headers), body.payload, headers['idempotency-key']); }
  @UseGuards(PlatformAdminGuard) @Get('platform/god-sessions/:id') currentGod(@Param('id') id: string) { return this.authorization.currentGod(id); }
  @UseGuards(PlatformAdminGuard) @Get('platform/god-sessions/current') currentGodFromHeader(@Headers('x-god-session-id') id?: string) { return this.authorization.currentGodFromHeader(id); }
  @UseGuards(PlatformAdminGuard) @Post('platform/god-sessions/:id/end') endGod(@Param('id') id: string) { return this.authorization.endGod(id); }
  @UseGuards(PlatformAdminGuard) @Delete('platform/god-sessions/current') endCurrentGod(@Headers('x-god-session-id') id?: string) { return this.authorization.endGod(id ?? ''); }
  private platformActor(headers: Record<string, string>) { return headers['x-platform-admin-id']?.trim() || 'platform-admin'; }
}
