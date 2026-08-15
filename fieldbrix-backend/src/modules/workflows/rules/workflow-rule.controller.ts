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
  UseGuards,
} from '@nestjs/common';
import { WorkflowRuleService } from './workflow-rule.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';
import type { Rule, RuleValue } from '../rule-engine';

@Controller()
@UseGuards(PermissionGuard)
export class WorkflowRuleController {
  constructor(
    private readonly rules: WorkflowRuleService,
    private readonly idempotency: IdempotencyService,
  ) {}

  /** GET /workflow-field-types — typed versioned field registry */
  @Permission('workflows.view')
  @Get('workflow-field-types')
  fieldTypes() {
    return this.rules.getFieldTypes();
  }

  /** POST /workflows/:id/rules — add a single rule */
  @Permission('workflows.edit')
  @Post('workflows/:id/rules')
  addRule(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: Partial<Rule> & { revision?: number },
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint('POST', `/workflows/${id}/rules`, body);
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.rules.addRule(id, body, body.revision))
      .then((r) => r.response);
  }

  /** PATCH /workflows/:id/rules/:ruleId — update a single rule */
  @Permission('workflows.edit')
  @Patch('workflows/:id/rules/:ruleId')
  patchRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Body() body: Partial<Rule> & { revision?: number },
  ) {
    return this.rules.patchRule(id, ruleId, body, body.revision);
  }

  /** DELETE /workflows/:id/rules/:ruleId */
  @Permission('workflows.edit')
  @Delete('workflows/:id/rules/:ruleId')
  deleteRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Body() body: { revision?: number },
  ) {
    return this.rules.deleteRule(id, ruleId, body.revision);
  }

  /** PUT /workflows/:id/rules/order — reorder rules by priority */
  @Permission('workflows.edit')
  @Put('workflows/:id/rules/order')
  reorderRules(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: { orderedIds: string[]; revision?: number },
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint('PUT', `/workflows/${id}/rules/order`, body);
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.rules.reorderRules(id, body.orderedIds ?? [], body.revision))
      .then((r) => r.response);
  }

  /** POST /workflows/:id/rules/validate */
  @Permission('workflows.edit')
  @Post('workflows/:id/rules/validate')
  validateRules(@Param('id') id: string) {
    return this.rules.validateRules(id);
  }

  /** POST /workflows/:id/evaluate — stateless evaluation */
  @Permission('workflows.view')
  @Post('workflows/:id/evaluate')
  evaluate(
    @Param('id') id: string,
    @Body() body: { answers?: Record<string, RuleValue> },
  ) {
    return this.rules.evaluate(id, body.answers ?? {});
  }

  /** POST /workflows/:id/simulations — persist named test vector */
  @Permission('workflows.edit')
  @Post('workflows/:id/simulations')
  createSimulation(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: { name: string; answers: Record<string, unknown>; expectedOutcomes?: Record<string, unknown> },
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fp = this.idempotency.fingerprint('POST', `/workflows/${id}/simulations`, body);
    return this.idempotency
      .getOrCreateAsync(key, fp, () => this.rules.createSimulation(id, body))
      .then((r) => r.response);
  }
}
