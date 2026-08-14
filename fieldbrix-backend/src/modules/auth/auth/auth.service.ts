import { Injectable } from '@nestjs/common';
import { PlatformService } from '../../platform/platform/platform.service';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly platform: PlatformService,
    private readonly idempotency: IdempotencyService,
  ) {}
  async login(
    identifier: string,
    password: string,
    deviceName?: string,
    key?: string,
  ) {
    if (!key) return this.platform.login(identifier, password, deviceName);
    const fingerprint = this.idempotency.fingerprint('POST', '/auth/login', {
      identifier: identifier.trim().toLowerCase(),
      password,
      deviceName,
    });
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.login(identifier, password, deviceName),
      )
    ).response;
  }
  async refresh(refreshToken: string, key?: string) {
    if (!key) return this.platform.refresh(refreshToken);
    const fingerprint = this.idempotency.fingerprint('POST', '/auth/refresh', {
      refreshToken,
    });
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.refresh(refreshToken),
      )
    ).response;
  }
  async logout(token: string, key?: string) {
    if (!key) return this.platform.logout(token);
    const fingerprint = this.idempotency.fingerprint('POST', '/auth/logout', {
      tokenHash: this.platform.hashForIdempotency(token),
    });
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.logout(token),
      )
    ).response;
  }
  async logoutAll(token: string, key?: string) {
    if (!key) return this.platform.logoutAll(token);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      '/auth/logout-all',
      { tokenHash: this.platform.hashForIdempotency(token) },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.logoutAll(token),
      )
    ).response;
  }
  async forgot(identifier: string, key?: string) {
    if (!key) return this.platform.forgotPassword(identifier);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      '/auth/password/forgot',
      { identifier: identifier.trim().toLowerCase() },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.forgotPassword(identifier),
      )
    ).response;
  }
  async reset(token: string, password: string, key?: string) {
    if (!key) return this.platform.resetPassword(token, password);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      '/auth/password/reset',
      { token, password },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.resetPassword(token, password),
      )
    ).response;
  }
  me(token: string) {
    return this.platform.me(token);
  }
  async selectTenant(token: string, tenantId: string, key?: string) {
    if (!key) return this.platform.selectTenant(token, tenantId);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      '/me/tenant-context',
      { tokenHash: this.platform.hashForIdempotency(token), tenantId },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.selectTenant(token, tenantId),
      )
    ).response;
  }
  sessions(token: string) {
    return this.platform.sessionsFor(token);
  }
  revokeSession(token: string, id: string) {
    return this.platform.revokeSession(token, id);
  }
  async device(token: string, name: string, key?: string) {
    if (!key) return this.platform.registerDevice(token, name);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      '/devices/register',
      { tokenHash: this.platform.hashForIdempotency(token), name },
    );
    return (
      await this.idempotency.getOrCreateAsync(key, fingerprint, () =>
        this.platform.registerDevice(token, name),
      )
    ).response;
  }
  revokeDevice(token: string, id: string) {
    return this.platform.revokeDevice(token, id);
  }
}
