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
  UseGuards,
} from '@nestjs/common';
import { WorkflowDraftService } from './workflow-draft.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';
import {
  ArchiveWorkflowDto,
  CreateFieldDto,
  CreateSectionDto,
  CreateWorkflowDto,
  DuplicateWorkflowDto,
  ReorderDto,
  UpdateFieldDto,
  UpdateSectionDto,
  UpdateWorkflowDto,
  WorkflowQueryDto,
} from './workflow.dto';

@Controller()
@UseGuards(PermissionGuard)
export class WorkflowDraftController {
  constructor(
    private readonly drafts: WorkflowDraftService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Permission('workflows.view')
  @Get('workflows')
  list(@Query() query: WorkflowQueryDto) {
    return this.drafts.list(
      query.search,
      query.status,
      query.page,
      query.limit,
    );
  }

  @Permission('workflows.create')
  @Post('workflows')
  create(
    @Headers() headers: Record<string, string>,
    @Body() body: CreateWorkflowDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint('POST', '/workflows', body);
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.drafts.create(body))
      .then((r) => r.response);
  }

  @Permission('workflows.view')
  @Get('workflows/:id')
  get(@Param('id') id: string) {
    return this.drafts.get(id);
  }

  @Permission('workflows.edit')
  @Patch('workflows/:id')
  update(@Param('id') id: string, @Body() body: UpdateWorkflowDto) {
    return this.drafts.update(id, body);
  }

  @Permission('workflows.edit')
  @Post('workflows/:id/sections')
  addSection(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: CreateSectionDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/workflows/${id}/sections`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.drafts.addSection(id, body))
      .then((r) => r.response);
  }

  @Permission('workflows.edit')
  @Patch('workflows/:id/sections/:sectionId')
  patchSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() body: UpdateSectionDto,
  ) {
    return this.drafts.patchSection(id, sectionId, body);
  }

  @Permission('workflows.edit')
  @Delete('workflows/:id/sections/:sectionId')
  removeSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { revision?: number },
  ) {
    return this.drafts.removeSection(id, sectionId, body.revision);
  }

  @Permission('workflows.edit')
  @Post('workflows/:id/fields')
  addField(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: CreateFieldDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/workflows/${id}/fields`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.drafts.addField(id, body))
      .then((r) => r.response);
  }

  @Permission('workflows.edit')
  @Patch('workflows/:id/fields/:fieldId')
  patchField(
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @Body() body: UpdateFieldDto,
  ) {
    return this.drafts.patchField(id, fieldId, body);
  }

  @Permission('workflows.edit')
  @Delete('workflows/:id/fields/:fieldId')
  removeField(
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @Body() body: { revision?: number },
  ) {
    return this.drafts.removeField(id, fieldId, body.revision);
  }

  @Permission('workflows.edit')
  @Put('workflows/:id/order')
  reorder(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: ReorderDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'PUT',
      `/workflows/${id}/order`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.drafts.reorder(id, body))
      .then((r) => r.response);
  }

  @Permission('workflows.edit')
  @Post('workflows/:id/validate')
  validate(@Param('id') id: string) {
    return this.drafts.validate(id);
  }

  @Permission('workflows.view')
  @Get('workflows/:id/preview')
  preview(@Param('id') id: string) {
    return this.drafts.preview(id);
  }

  // Archive lives here (governance action on a draft)
  @Permission('workflows.archive')
  @Post('workflows/:id/archive')
  archive(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: ArchiveWorkflowDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/workflows/${id}/archive`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.drafts.update(id, { ...body }))
      .then((r) => r.response);
  }

  // Duplicate — creates a new independent draft
  @Permission('workflows.create')
  @Post('workflows/:id/duplicate')
  duplicate(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: DuplicateWorkflowDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint(
      'POST',
      `/workflows/${id}/duplicate`,
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fp, async () => {
        const source = await this.drafts.get(id);
        return this.drafts.create({
          name: body.name ?? `${source.name as string} copy`,
          description: source.description as string,
        });
      })
      .then((r) => r.response);
  }
}
