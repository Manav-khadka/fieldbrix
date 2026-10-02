import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { PlatformAdminGuard } from '../../authorization/guards/platform-admin/platform-admin.guard';
import {
  CreatePlatformStaffDto,
  UpdateDepartmentGovernanceDto,
  UpdateWorkforceProfileDto,
} from '../dto/workforce.dto';
import { WorkforceService } from './workforce.service';

@Controller()
@UseGuards(PermissionGuard)
export class WorkforceController {
  constructor(private readonly workforce: WorkforceService) {}
  private token(headers: Record<string, string>) {
    const token = headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('UNAUTHORIZED');
    return token;
  }

  @Permission('iam.users.view')
  @Get('workforce-directory')
  directory(@Headers() headers: Record<string, string>) {
    return this.workforce.directory(this.token(headers));
  }

  @Permission('iam.users.edit')
  @Put('users/:id/workforce-profile')
  updateProfile(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: UpdateWorkforceProfileDto,
  ) {
    return this.workforce.updateProfile(this.token(headers), id, body);
  }

  @Permission('company.teams.edit')
  @Put('teams/:id/governance')
  updateDepartment(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: UpdateDepartmentGovernanceDto,
  ) {
    return this.workforce.updateDepartment(this.token(headers), id, body);
  }

  @UseGuards(PlatformAdminGuard)
  @Get('platform/staff')
  platformStaff() {
    return this.workforce.platformStaff();
  }

  @UseGuards(PlatformAdminGuard)
  @Post('platform/staff')
  createPlatformStaff(@Body() body: CreatePlatformStaffDto) {
    return this.workforce.createPlatformStaff(body);
  }
}
