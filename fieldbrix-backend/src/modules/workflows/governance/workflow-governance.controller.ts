import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkflowGovernanceService } from './workflow-governance.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';
import type { PublishWorkflowDto } from '../draft/workflow.dto';

@Controller()
@UseGuards(PermissionGuard)
export class WorkflowGovernanceController {
  constructor(
    private readonly governance: WorkflowGovernanceService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Permission('workflows.publish')
  @Post('workflows/:id/publish')
  publish(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: PublishWorkflowDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/workflows/${id}/publish`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, () =>
        this.governance.publish(id, body.notes ?? '', body.revision),
      )
      .then((r) => r.response);
  }

  @Permission('workflows.view')
  @Get('workflows/:id/versions')
  versions(@Param('id') id: string) {
    return this.governance.versions(id);
  }

  @Permission('workflows.view')
  @Get('workflow-versions/:versionId')
  getVersion(@Param('versionId') versionId: string) {
    return this.governance.getVersion(versionId);
  }

  @Permission('workflows.archive')
  @Post('workflows/:id/archive')
  archive(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: { revision: number; reason?: string },
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/workflows/${id}/archive`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, () =>
        this.governance.archive(id, body.revision),
      )
      .then((r) => r.response);
  }

  @Permission('workflows.view')
  @Get('platform/workflow-templates')
  templates() {
    return this.governance.templates();
  }

  @Permission('workflows.create')
  @Post('platform/workflow-templates/:id/instantiate')
  instantiate(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/platform/workflow-templates/${id}/instantiate`,
      {},
    );
    return this.idempotency
      .getOrCreateAsync(
        key,
        fp,
        () => this.governance.instantiateTemplate(id, ''), // tenantId resolved from context
      )
      .then((r) => r.response);
  }
}
