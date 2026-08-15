import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database/database.service';
import type { Rule } from '../rule-engine';

type Row = Record<string, unknown>;

@Injectable()
export class WorkflowRuleRepository {
  constructor(private readonly db: DatabaseService) {}

  /** Return workflow schema (sections/fields/rules) for rule operations. */
  async getSchema(workflowId: string): Promise<{ revision: number; schema: Row }> {
    const rows = await this.db.tenantQuery<Row>(
      `SELECT revision, schema FROM workflow_drafts
       WHERE id = $1::uuid AND archived_at IS NULL`,
      [workflowId],
    );
    if (!rows[0]) throw new NotFoundException('WORKFLOW_NOT_FOUND');
    return { revision: rows[0].revision as number, schema: rows[0].schema as Row };
  }

  async addRule(workflowId: string, rule: Rule, revision: number): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE workflow_drafts
       SET schema = jsonb_set(schema, '{rules}',
         COALESCE(schema->'rules', '[]'::jsonb) || $1::jsonb),
           revision = revision + 1, updated_at = clock_timestamp()
       WHERE id = $2::uuid AND revision = $3 AND archived_at IS NULL
       RETURNING id::text AS id, revision, schema`,
      [JSON.stringify([rule]), workflowId, revision],
    );
    if (!rows[0]) throw new ConflictException('STALE_WORKFLOW_REVISION');
    return rows[0];
  }

  async patchRule(workflowId: string, ruleId: string, patch: Partial<Rule>, revision: number): Promise<Row> {
    const patchJson = JSON.stringify(patch);
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE workflow_drafts
       SET schema = jsonb_set(schema, '{rules}', (
         SELECT jsonb_agg(
           CASE WHEN r->>'id' = $1 THEN r || $2::jsonb ELSE r END
         ) FROM jsonb_array_elements(schema->'rules') AS r
       )), revision = revision + 1, updated_at = clock_timestamp()
       WHERE id = $3::uuid AND revision = $4 AND archived_at IS NULL
       RETURNING id::text AS id, revision, schema`,
      [ruleId, patchJson, workflowId, revision],
    );
    if (!rows[0]) throw new ConflictException('STALE_WORKFLOW_REVISION');
    return rows[0];
  }

  async deleteRule(workflowId: string, ruleId: string, revision: number): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE workflow_drafts
       SET schema = jsonb_set(schema, '{rules}', (
         SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
         FROM jsonb_array_elements(schema->'rules') AS r
         WHERE r->>'id' != $1
       )), revision = revision + 1, updated_at = clock_timestamp()
       WHERE id = $2::uuid AND revision = $3 AND archived_at IS NULL
       RETURNING id::text AS id, revision, schema`,
      [ruleId, workflowId, revision],
    );
    if (!rows[0]) throw new ConflictException('STALE_WORKFLOW_REVISION');
    return rows[0];
  }

  async replaceRules(workflowId: string, rules: Rule[], revision: number): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `UPDATE workflow_drafts
       SET schema = jsonb_set(schema, '{rules}', $1::jsonb),
           revision = revision + 1, updated_at = clock_timestamp()
       WHERE id = $2::uuid AND revision = $3 AND archived_at IS NULL
       RETURNING id::text AS id, revision, schema`,
      [JSON.stringify(rules), workflowId, revision],
    );
    if (!rows[0]) throw new ConflictException('STALE_WORKFLOW_REVISION');
    return rows[0];
  }

  async createSimulation(workflowId: string, name: string, answers: Record<string, unknown>, expectedOutcomes: Record<string, unknown>): Promise<Row> {
    const rows = await this.db.tenantQuery<Row>(
      `INSERT INTO workflow_simulations (tenant_id, workflow_id, name, answers, expected_outcomes)
       SELECT tenant_id, id, $2, $3::jsonb, $4::jsonb
       FROM workflow_drafts WHERE id = $1::uuid
       RETURNING id::text AS id, workflow_id::text AS "workflowId", name, answers, expected_outcomes AS "expectedOutcomes", created_at AS "createdAt"`,
      [workflowId, name, JSON.stringify(answers), JSON.stringify(expectedOutcomes)],
    );
    if (!rows[0]) throw new NotFoundException('WORKFLOW_NOT_FOUND');
    return rows[0];
  }

  async listSimulations(workflowId: string): Promise<Row[]> {
    return this.db.tenantQuery<Row>(
      `SELECT id::text AS id, workflow_id::text AS "workflowId", name, answers, expected_outcomes AS "expectedOutcomes", created_at AS "createdAt"
       FROM workflow_simulations WHERE workflow_id = $1::uuid
       ORDER BY created_at DESC`,
      [workflowId],
    );
  }
}
