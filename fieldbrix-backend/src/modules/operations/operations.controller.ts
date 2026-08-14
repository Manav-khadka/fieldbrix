import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { Permission } from '../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../authorization/guards/permission/permission.guard';
import { ImportPreviewDto, MasterRecordDto, PublishWorkflowDto, TaskAssignmentDto, TaskAttachmentDto, TaskDto, TaskTransitionDto, WorkflowDto, WorkflowElementDto } from './operations.dto';

@Controller()
@UseGuards(PermissionGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}
  @Permission('master.customers.view') @Get('customers') customers(@Query() query: any) { return this.operations.master('customers', query); }
  @Permission('master.customers.create') @Post('customers') createCustomer(@Headers() headers: Record<string, string>, @Body() body: MasterRecordDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', '/customers', body, () => this.operations.createMaster('customers', body as any)); }
  @Permission('master.customers.edit') @Patch('customers/:id') updateCustomer(@Param('id') id: string, @Body() body: any) { return this.operations.updateMaster('customers', id, body); }
  @Permission('master.sites.view') @Get('sites') sites(@Query() query: any) { return this.operations.master('sites', query); }
  @Permission('master.sites.create') @Post('sites') createSite(@Headers() headers: Record<string, string>, @Body() body: MasterRecordDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', '/sites', body, () => this.operations.createMaster('sites', body as any)); }
  @Permission('master.sites.edit') @Patch('sites/:id') updateSite(@Param('id') id: string, @Body() body: any) { return this.operations.updateMaster('sites', id, body); }
  @Permission('master.targets.view') @Get('service-targets') targets(@Query() query: any) { return this.operations.master('targets', query); }
  @Permission('master.targets.create') @Post('service-targets') createTarget(@Headers() headers: Record<string, string>, @Body() body: MasterRecordDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', '/service-targets', body, () => this.operations.createMaster('targets', body as any)); }
  @Permission('master.targets.edit') @Patch('service-targets/:id') updateTarget(@Param('id') id: string, @Body() body: any) { return this.operations.updateMaster('targets', id, body); }
  @Permission('master.parts.view') @Get('parts') parts(@Query() query: any) { return this.operations.master('parts', query); }
  @Permission('master.parts.create') @Post('parts') createPart(@Headers() headers: Record<string, string>, @Body() body: MasterRecordDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', '/parts', body, () => this.operations.createMaster('parts', body as any)); }
  @Permission('master.parts.edit') @Patch('parts/:id') updatePart(@Param('id') id: string, @Body() body: any) { return this.operations.updateMaster('parts', id, body); }
  @Permission('master.targets.view') @Get('qr-identities/:code/resolve') qr(@Param('code') code: string) { return this.operations.resolveQr(code); }
  @Permission('master.imports.create') @Post('imports/preview') importPreview(@Headers() headers: Record<string, string>, @Body() body: ImportPreviewDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', '/imports/preview', body, () => this.operations.importPreview(body as any)); }
  @Permission('master.imports.commit') @Post('imports/:id/commit') importCommit(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: { previewRevision?: number }) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/imports/${id}/commit`, body, () => this.operations.commitImport(id, body.previewRevision ?? 1)); }
  @Permission('master.imports.view') @Get('imports/:id') importStatus(@Param('id') id: string) { return this.operations.importStatus(id); }
  @Permission('workflows.view') @Get('workflows') workflows() { return this.operations.workflowsList(); }
  @Permission('workflows.create') @Post('workflows') createWorkflow(@Headers() headers: Record<string, string>, @Body() body: WorkflowDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', '/workflows', body, () => this.operations.createWorkflow(body as any)); }
  @Permission('workflows.view') @Get('workflows/:id') workflow(@Param('id') id: string) { return this.operations.workflow(id); }
  @Permission('workflows.edit') @Patch('workflows/:id') updateWorkflow(@Param('id') id: string, @Body() body: WorkflowDto) { return this.operations.updateWorkflow(id, body as any, body.revision); }
  @Permission('workflows.edit') @Post('workflows/:id/sections') section(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: WorkflowElementDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/workflows/${id}/sections`, body, () => this.operations.addSection(id, body as any)); }
  @Permission('workflows.edit') @Post('workflows/:id/fields') field(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: WorkflowElementDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/workflows/${id}/fields`, body, () => this.operations.addField(id, body as any)); }
  @Permission('workflows.edit') @Post('workflows/:id/rules') rules(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: any) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/workflows/${id}/rules`, body, () => this.operations.updateRules(id, body)); }
  @Permission('workflows.edit') @Post('workflows/:id/rules/validate') validateRules(@Param('id') id: string) { return this.operations.validateRules(id); }
  @Permission('workflows.edit') @Post('workflows/:id/validate') validate(@Param('id') id: string) { return this.operations.validateWorkflow(id); }
  @Permission('workflows.view') @Post('workflows/:id/evaluate') evaluate(@Param('id') id: string, @Body() body: any) { return this.operations.evaluateWorkflow(id, body.answers ?? {}); }
  @Permission('workflows.view') @Get('workflows/:id/preview') preview(@Param('id') id: string) { return this.operations.previewWorkflow(id); }
  @Permission('workflows.publish') @Post('workflows/:id/publish') publish(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: PublishWorkflowDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/workflows/${id}/publish`, body, () => this.operations.publishWorkflow(id, body.notes, body.revision)); }
  @Permission('workflows.view') @Get('workflows/:id/versions') versions(@Param('id') id: string) { return this.operations.versions(id); }
  @Permission('workflows.create') @Post('workflows/:id/duplicate') duplicate(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: any) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/workflows/${id}/duplicate`, body, () => this.operations.duplicateWorkflow(id, body.name)); }
  @Permission('workflows.archive') @Post('workflows/:id/archive') archive(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: any) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/workflows/${id}/archive`, body, () => this.operations.archiveWorkflow(id, body.revision)); }
  @Permission('workflows.view') @Get('workflow-field-types') types() { return this.operations.fieldTypes(); }
  @Permission('workflows.view') @Get('platform/workflow-templates') templates() { return this.operations.templates(); }
  @Permission('workflows.create') @Post('platform/workflow-templates/:id/instantiate') instantiate(@Headers() headers: Record<string, string>, @Param('id') id: string) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/platform/workflow-templates/${id}/instantiate`, {}, () => this.operations.instantiateTemplate(id)); }
  @Permission('tasks.view') @Get('tasks') tasks(@Query() query: any) { return this.operations.taskList(query); }
  @Permission('tasks.create') @Post('tasks') createTask(@Headers() headers: Record<string, string>, @Body() body: TaskDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', '/tasks', body, () => this.operations.createTask(body as any)); }
  @Permission('tasks.view') @Get('tasks/:id') task(@Param('id') id: string) { return this.operations.task(id); }
  @Permission('tasks.edit') @Patch('tasks/:id') updateTask(@Param('id') id: string, @Body() body: any) { return this.operations.updateTask(id, body, body.revision); }
  @Permission('tasks.assign') @Post('tasks/:id/assignments') assign(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: TaskAssignmentDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/tasks/${id}/assignments`, body, () => this.operations.assignTask(id, body as any)); }
  @Permission('tasks.assign') @Post('tasks/:id/reassign') reassign(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: any) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/tasks/${id}/reassign`, body, () => this.operations.assignTask(id, { ...body, reassigned: true })); }
  @Permission('tasks.edit') @Post('tasks/:id/transitions') transition(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: TaskTransitionDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/tasks/${id}/transitions`, body, () => this.operations.transitionTask(id, body)); }
  @Permission('tasks.cancel') @Post('tasks/:id/cancel') cancel(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: any) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/tasks/${id}/cancel`, body, () => this.operations.transitionTask(id, { ...body, targetStatus: 'CANCELLED' })); }
  @Permission('tasks.reopen') @Post('tasks/:id/reopen') reopen(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: any) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/tasks/${id}/reopen`, body, () => this.operations.transitionTask(id, { ...body, targetStatus: 'REOPENED' })); }
  @Permission('tasks.edit') @Post('tasks/:id/attachments') attachment(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: TaskAttachmentDto) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/tasks/${id}/attachments`, body, () => this.operations.addAttachment(id, body as any)); }
  @Permission('tasks.request_action') @Post('tasks/:id/action-requests') actionRequest(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() body: any) { return this.operations.idempotent(headers['idempotency-key'], 'POST', `/tasks/${id}/action-requests`, body, () => this.operations.requestAction(id, body)); }
  @Permission('tasks.history.view') @Get('tasks/:id/history') history(@Param('id') id: string) { return this.operations.taskHistory(id); }
  @Permission('tasks.assign') @Get('scheduling/capacity') capacity() { return this.operations.capacity(); }
}
