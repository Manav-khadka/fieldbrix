import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ImportsService } from './imports.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { ImportCommitDto, ImportPreviewDto } from '../dto/import.dto';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';

@Controller('imports')
@UseGuards(PermissionGuard)
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Permission('master.imports.create')
  @Post('preview')
  preview(
    @Headers() headers: Record<string, string>,
    @Body() body: ImportPreviewDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      '/imports/preview',
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fingerprint, () => this.imports.preview(body))
      .then((result) => result.response);
  }

  @Permission('master.imports.commit')
  @Post(':id/commit')
  commit(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: ImportCommitDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      `/imports/${id}/commit`,
      body,
    );
    const actorToken = headers.authorization?.replace(/^Bearer\s+/i, '');
    return this.idempotency
      .getOrCreateAsync(key, fingerprint, () =>
        this.imports.commit(id, body.previewRevision ?? 1, actorToken),
      )
      .then((result) => result.response);
  }

  @Permission('master.imports.view')
  @Get(':id')
  status(@Param('id') id: string) {
    return this.imports.status(id);
  }
}
