import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WorkflowRuleRepository } from './workflow-rule.repository';
import {
  evaluateRules,
  validateRules,
  type Rule,
  type RuleValue,
} from '../rule-engine';
import { getFieldTypeRegistry } from '../field-type.registry';

@Injectable()
export class WorkflowRuleService {
  constructor(private readonly repo: WorkflowRuleRepository) {}

  /** GET /workflow-field-types */
  getFieldTypes() {
    return getFieldTypeRegistry();
  }

  /** POST /workflows/:id/rules — add one rule */
  async addRule(
    workflowId: string,
    rulePayload: Partial<Rule> & {
      conditions?: Rule['conditions'];
      actions?: Rule['actions'];
    },
    revision?: number,
  ) {
    const { revision: storedRevision, schema } =
      await this.repo.getSchema(workflowId);
    const rev = revision ?? storedRevision;
    const rule: Rule = {
      id: rulePayload.id ?? randomUUID(),
      priority: rulePayload.priority ?? 0,
      conditions: rulePayload.conditions ?? [],
      actions: rulePayload.actions ?? [],
    };
    const fieldKeys = this.extractFieldKeys(schema);
    const diagnostics = validateRules([rule], fieldKeys);
    if (!diagnostics.valid) throw new BadRequestException(diagnostics);
    return this.repo.addRule(workflowId, rule, rev);
  }

  /** PATCH /workflows/:id/rules/:ruleId — update one rule */
  async patchRule(
    workflowId: string,
    ruleId: string,
    patch: Partial<Rule>,
    revision?: number,
  ) {
    const { revision: storedRevision } = await this.repo.getSchema(workflowId);
    const rev = revision ?? storedRevision;
    return this.repo.patchRule(workflowId, ruleId, patch, rev);
  }

  /** DELETE /workflows/:id/rules/:ruleId */
  async deleteRule(workflowId: string, ruleId: string, revision?: number) {
    const { revision: storedRevision } = await this.repo.getSchema(workflowId);
    const rev = revision ?? storedRevision;
    return this.repo.deleteRule(workflowId, ruleId, rev);
  }

  /** PUT /workflows/:id/rules/order */
  async reorderRules(
    workflowId: string,
    orderedIds: string[],
    revision?: number,
  ) {
    const { revision: storedRevision, schema } =
      await this.repo.getSchema(workflowId);
    const rev = revision ?? storedRevision;
    const existingRules = (schema.rules as Rule[]) ?? [];
    const byId = new Map(existingRules.map((r) => [r.id, r]));
    const reordered = orderedIds
      .map((rid, idx) => ({
        ...(byId.get(rid) ?? { id: rid, conditions: [], actions: [] }),
        priority: orderedIds.length - idx,
      }))
      .filter((r) => r.id);
    return this.repo.replaceRules(workflowId, reordered, rev);
  }

  /** POST /workflows/:id/rules/validate */
  async validateRules(workflowId: string) {
    const { schema } = await this.repo.getSchema(workflowId);
    const rules = (schema.rules as Rule[]) ?? [];
    const fieldKeys = this.extractFieldKeys(schema);
    return validateRules(rules, fieldKeys);
  }

  /** POST /workflows/:id/evaluate */
  async evaluate(workflowId: string, answers: Record<string, RuleValue>) {
    const { schema } = await this.repo.getSchema(workflowId);
    const rules = (schema.rules as Rule[]) ?? [];
    return {
      schemaVersion: 1,
      outcomes: evaluateRules(rules, answers),
    };
  }

  /** POST /workflows/:id/simulations */
  async createSimulation(
    workflowId: string,
    payload: {
      name: string;
      answers: Record<string, unknown>;
      expectedOutcomes?: Record<string, unknown>;
    },
  ) {
    if (!payload.name?.trim())
      throw new BadRequestException('SIMULATION_NAME_REQUIRED');
    return this.repo.createSimulation(
      workflowId,
      payload.name.trim(),
      payload.answers ?? {},
      payload.expectedOutcomes ?? {},
    );
  }

  private extractFieldKeys(schema: Record<string, unknown>): Set<string> {
    const fields = (schema.fields as Array<{ key?: string }>) ?? [];
    return new Set(fields.map((f) => f.key).filter(Boolean) as string[]);
  }
}
