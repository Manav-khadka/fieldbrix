import { ForbiddenException, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<{ tenantId: string; actorId?: string } | undefined>();
  run<T>(tenantId: string, actorId: string | undefined, callback: () => T) { if (!tenantId) throw new ForbiddenException('TENANT_CONTEXT_REQUIRED'); return this.storage.run({ tenantId, actorId }, callback); }
  enter(tenantId: string, actorId?: string) { if (!tenantId) throw new ForbiddenException('TENANT_CONTEXT_REQUIRED'); this.storage.enterWith({ tenantId, actorId }); }
  get tenantId() { const context = this.storage.getStore(); if (!context?.tenantId) throw new ForbiddenException('TENANT_CONTEXT_REQUIRED'); return context.tenantId; }
  get currentTenantId() { return this.storage.getStore()?.tenantId; }
  get actorId() { return this.storage.getStore()?.actorId; }
  clear() { this.storage.enterWith(undefined); }
}
