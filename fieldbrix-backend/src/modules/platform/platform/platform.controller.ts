import { Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { AuditQueryDto } from '../dto/audit-query.dto/audit-query.dto';
import { UploadIntentDto } from '../dto/upload-intent.dto/upload-intent.dto';
import { CompleteUploadDto } from '../dto/complete-upload.dto/complete-upload.dto';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';

@Controller()
export class PlatformController {
  constructor(private readonly platform: PlatformService, private readonly idempotency: IdempotencyService) {}
  private token(headers: Record<string, string>) { const token = headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) throw new UnauthorizedException('UNAUTHORIZED'); return token; }
  @Post('files/upload-intents') async uploadIntent(@Headers() headers: Record<string, string>, @Body() body: UploadIntentDto) { const token = this.token(headers); const key = headers['idempotency-key']; if (!key) return this.platform.uploadIntent(token, body.mime, body.size, body.checksum); const fingerprint = this.idempotency.fingerprint('POST', '/files/upload-intents', body); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.uploadIntent(token, body.mime, body.size, body.checksum))).response; }
  @Post('files/:id/complete') async completeUpload(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: CompleteUploadDto) { const token = this.token(headers); const key = headers['idempotency-key']; if (!key) return this.platform.completeUpload(token, id, body.checksum); const fingerprint = this.idempotency.fingerprint('POST', `/files/${id}/complete`, { id, ...body }); return (await this.idempotency.getOrCreateAsync(key, fingerprint, () => this.platform.completeUpload(token, id, body.checksum))).response; }
  @Get('audit-events') audit(@Headers() headers: Record<string, string>, @Query() query: AuditQueryDto) { return this.platform.auditEvents(this.token(headers), query); }
  @Get('audit-events/verify') verifyAudit(@Headers() headers: Record<string, string>) { return this.platform.verifyAuditChain(this.token(headers)); }
}
