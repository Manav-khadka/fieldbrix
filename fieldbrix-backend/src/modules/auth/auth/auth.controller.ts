import { Body, Controller, Delete, Get, Headers, Param, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RateLimitGuard } from '../../platform/guards/rate-limit/rate-limit.guard';
import { LoginDto } from '../dto/login.dto/login.dto';
import { PasswordResetDto } from '../dto/password-reset.dto/password-reset.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto/refresh-token.dto';
import { DeviceRegistrationDto } from '../dto/device-registration.dto/device-registration.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto/forgot-password.dto';
import { TenantContextDto } from '../dto/tenant-context.dto/tenant-context.dto';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private token(headers: Record<string, string>) { const token = headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) throw new UnauthorizedException('UNAUTHORIZED'); return token; }
  @UseGuards(RateLimitGuard) @Post('auth/login') login(@Headers() headers: Record<string, string>, @Body() body: LoginDto) { return this.auth.login(body.identifier, body.password, body.deviceName, headers['idempotency-key']); }
  @Post('auth/refresh') refresh(@Headers() headers: Record<string, string>, @Body() body: RefreshTokenDto) { return this.auth.refresh(body.refreshToken, headers['idempotency-key']); }
  @Post('auth/logout') logout(@Headers() headers: Record<string, string>) { return this.auth.logout(this.token(headers), headers['idempotency-key']); }
  @Post('auth/logout-all') logoutAll(@Headers() headers: Record<string, string>) { return this.auth.logoutAll(this.token(headers), headers['idempotency-key']); }
  @UseGuards(RateLimitGuard) @Post('auth/password/forgot') forgot(@Headers() headers: Record<string, string>, @Body() body: ForgotPasswordDto) { return this.auth.forgot(body.identifier, headers['idempotency-key']); }
  @UseGuards(RateLimitGuard) @Post('auth/password/reset') reset(@Headers() headers: Record<string, string>, @Body() body: PasswordResetDto) { return this.auth.reset(body.token, body.password, headers['idempotency-key']); }
  @Get('me') me(@Headers() headers: Record<string, string>) { return this.auth.me(this.token(headers)); }
  @Post('me/tenant-context') selectTenant(@Headers() headers: Record<string, string>, @Body() body: TenantContextDto) { return this.auth.selectTenant(this.token(headers), body.membershipId, headers['idempotency-key']); }
  @Get('me/sessions') sessions(@Headers() headers: Record<string, string>) { return this.auth.sessions(this.token(headers)); }
  @Delete('me/sessions/:id') revokeSession(@Headers() headers: Record<string, string>, @Param('id') id: string) { return this.auth.revokeSession(this.token(headers), id); }
  @Post('devices/register') device(@Headers() headers: Record<string, string>, @Body() body: DeviceRegistrationDto) { return this.auth.device(this.token(headers), body.name, headers['idempotency-key']); }
  @Delete('devices/:id') revokeDevice(@Headers() headers: Record<string, string>, @Param('id') id: string) { return this.auth.revokeDevice(this.token(headers), id); }
}
