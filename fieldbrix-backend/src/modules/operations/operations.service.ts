import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database/database.service';
import { OperationsRepository } from './operations.repository';
import { evaluateRules, validateRules, type Rule, type RuleValue } from './rule-engine';
import { IdempotencyService } from '../idempotency/idempotency/idempotency.service';

type RecordBase = { id: string; tenantId: string; createdAt: string; updatedAt: string; archived?: boolean; [key: string]: unknown };
type Workflow = RecordBase & { name: string; description: string; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; revision: number; sections: unknown[]; fields: unknown[]; rules: unknown[]; versions: unknown[]; currentVersionId?: string };
type Task = RecordBase & { number: string; status: string; flags: string[]; revision: number; history: unknown[]; assignments: unknown[]; workflowVersionId?: string };

const now = () => new Date().toISOString();
const id = () => randomUUID();
const base = (tenantId: string): RecordBase => ({ id: id(), tenantId, createdAt: now(), updatedAt: now() });
const clean = (value: string) => value.trim().toLowerCase();

@Injectable()
export class OperationsService {
  readonly tenantId = 'tenant-demo';
  private readonly customers: RecordBase[] = [
    { ...base(this.tenantId), name: 'Al Noor Facilities', code: 'ALN-001', contactName: 'Mariam Al Balushi', email: 'ops@alnoor.example', phone: '+968 2400 1000', address: 'Al Khuwair, Muscat' },
    { ...base(this.tenantId), name: 'Gulf Hospitality Group', code: 'GHG-014', contactName: 'Omar Said', email: 'facilities@gulf.example', phone: '+968 2400 1400', address: 'Qurum, Muscat' },
  ];
  private readonly sites: RecordBase[] = [
    { ...base(this.tenantId), name: 'Al Noor HQ', code: 'SITE-001', customerId: this.customers[0].id, address: 'Al Khuwair, Muscat', branch: 'Muscat' },
    { ...base(this.tenantId), name: 'Gulf Bay Hotel', code: 'SITE-014', customerId: this.customers[1].id, address: 'Qurum, Muscat', branch: 'Muscat' },
  ];
  private readonly targets: RecordBase[] = [{ ...base(this.tenantId), name: 'Chiller Plant A', code: 'AST-001', siteId: this.sites[0].id, type: 'HVAC', condition: 'Good', nextDue: '2026-09-02', qrCode: 'fbx_7JQ4H2' }];
  private readonly parts: RecordBase[] = [{ ...base(this.tenantId), name: 'Compressor belt 42B', code: 'PART-042', unit: 'piece', stock: 18, active: true, compatibility: 'Carrier 30XA' }];
  private readonly workflows: Workflow[] = [{ ...base(this.tenantId), name: 'Preventive HVAC Visit', description: 'A clear, repeatable checklist for scheduled HVAC service.', status: 'DRAFT', revision: 1, sections: [{ id: 'sec-1', title: 'Arrival & safety', position: 0 }], fields: [{ id: 'field-1', key: 'arrival_note', label: 'Arrival notes', type: 'LONG_TEXT', required: false, sectionId: 'sec-1' }], rules: [], versions: [] } as Workflow];
  private readonly templateCatalog: RecordBase[] = [{ ...base('platform'), name: 'Quarterly HVAC inspection', description: 'Ready-to-use inspection workflow for cooling equipment.', category: 'Maintenance', fieldCount: 12, status: 'PUBLISHED' }];
  private readonly tasks: Task[] = [];
  private importJobs: RecordBase[] = [];
  private sequence = 1000;

  constructor(
    private readonly database: DatabaseService,
    private readonly repository: OperationsRepository,
    private readonly idempotency: IdempotencyService,
  ) {}

  async idempotent<T>(key: string | undefined, method: string, path: string, body: unknown, factory: () => Promise<T> | T) {
    if (!key) return factory();
    const fingerprint = this.idempotency.fingerprint(method, path, body);
    return (await this.idempotency.getOrCreateAsync(key, fingerprint, factory)).response;
  }

  private list(items: RecordBase[], query: { search?: string; status?: string; customerId?: string; siteId?: string }) {
    const search = query.search ? clean(query.search) : '';
    return items.filter((item) => !item.archived && (!search || [item.name, item.code, item.email].some((v) => typeof v === 'string' && clean(v).includes(search))) && (!query.status || item.status === query.status) && (!query.customerId || item.customerId === query.customerId) && (!query.siteId || item.siteId === query.siteId));
  }
  private find(items: RecordBase[], itemId: string) { const result = items.find((item) => item.id === itemId && !item.archived); if (!result) throw new NotFoundException('RECORD_NOT_FOUND'); return result; }
  private create(items: RecordBase[], payload: Record<string, unknown>) { const item = { ...base(this.tenantId), ...payload }; items.unshift(item); return item; }
  private createQrIdentity() { const nonce = randomUUID().replaceAll('-', ''); const prefix = `fbx1.${nonce}`; return `${prefix}.${createHash('sha256').update(prefix).digest('hex').slice(0, 8)}`; }
  private isQrIdentityValid(value: string) { if (/^fbx_[A-Za-z0-9]+$/.test(value)) return true; const match = /^fbx1\.([a-f0-9]{32})\.([a-f0-9]{8})$/i.exec(value); return Boolean(match && createHash('sha256').update(`fbx1.${match[1]}`).digest('hex').slice(0, 8).toLowerCase() === match[2].toLowerCase()); }
  private update(items: RecordBase[], itemId: string, patch: Record<string, unknown>) { const item = this.find(items, itemId); Object.assign(item, patch, { updatedAt: now() }); return item; }

  async master(entity: 'customers' | 'sites' | 'targets' | 'parts', query: { search?: string; customerId?: string; siteId?: string }) { if (this.repository.enabled) return this.repository.master(entity, query); return this.list(this[entity], query); }
  async createMaster(entity: 'customers' | 'sites' | 'targets' | 'parts', payload: Record<string, unknown>) { if (!payload.name || !payload.code) throw new BadRequestException('NAME_AND_CODE_REQUIRED'); if (entity === 'targets' && !payload.siteId) throw new BadRequestException('SITE_REQUIRED'); const qrIdentity = entity === 'targets' ? this.createQrIdentity() : undefined; const record = entity === 'targets' ? { ...payload, qrIdentity, qrCode: qrIdentity } : payload; if (this.repository.enabled) return this.repository.createMaster(entity, record); return this.create(this[entity], record); }
  async updateMaster(entity: 'customers' | 'sites' | 'targets' | 'parts', itemId: string, payload: Record<string, unknown>) { if (this.repository.enabled) return this.repository.updateMaster(entity, itemId, payload); return this.update(this[entity], itemId, payload); }
  async resolveQr(code: string) { if (!this.isQrIdentityValid(code)) throw new NotFoundException('QR_NOT_FOUND'); if (this.repository.enabled) return this.repository.resolveQr(code); const item = this.targets.find((target) => target.qrCode === code && !target.archived); if (!item) throw new NotFoundException('QR_NOT_FOUND'); return { type: 'service_target', record: item, site: this.find(this.sites, String(item.siteId)) }; }
  async importPreview(payload: { entityType: string; rows: Record<string, unknown>[]; duplicateMode?: string; uploadId?: string; sourceChecksum?: string }) { if (this.repository.enabled) return this.repository.importPreview({ ...payload, rows: payload.rows ?? [] }); const rows = payload.rows ?? []; const errors = rows.flatMap((row, index) => !row.name || !row.code ? [{ row: index + 1, code: 'REQUIRED_FIELD', message: 'Name and code are required' }] : []); const job = this.create(this.importJobs, { entityType: payload.entityType, status: 'PREVIEWED', totalRows: rows.length, validRows: rows.length - errors.length, errors, previewRevision: 1 }); return job; }
  async commitImport(importId: string, previewRevision = 1) { if (this.repository.enabled) return this.repository.commitImport(importId, previewRevision); const job = this.find(this.importJobs, importId); if (job.previewRevision !== previewRevision) throw new ConflictException('IMPORT_PREVIEW_REVISION_CONFLICT'); job.status = 'QUEUED'; job.updatedAt = now(); return job; }
  async importStatus(importId: string) { if (this.repository.enabled) return this.repository.importStatus(importId); return this.find(this.importJobs, importId); }

  async workflowsList() { if (this.repository.enabled) return this.repository.workflows(); return this.workflows.filter((workflow) => !workflow.archived); }
  async workflow(idValue: string) { if (this.repository.enabled) return this.repository.workflow(idValue); return this.find(this.workflows, idValue) as Workflow; }
  async createWorkflow(payload: Record<string, unknown>) { if (this.repository.enabled) return this.repository.createWorkflow(payload); return this.create(this.workflows as RecordBase[], { name: payload.name ?? 'Untitled workflow', description: payload.description ?? '', status: 'DRAFT', revision: 1, sections: [], fields: [], rules: [], versions: [] }) as Workflow; }
  async updateWorkflow(idValue: string, payload: Record<string, unknown>, revision?: number) { const workflow = await this.workflow(idValue); if (revision !== undefined && revision !== workflow.revision) throw new ConflictException('STALE_WORKFLOW_REVISION'); if (this.repository.enabled) return this.repository.saveWorkflow(idValue, payload, revision ?? workflow.revision); workflow.revision += 1; Object.assign(workflow, payload, { updatedAt: now() }); return workflow; }
  async addSection(idValue: string, payload: Record<string, unknown>) { const workflow = await this.workflow(idValue); if (this.repository.enabled) return this.repository.addToWorkflow(idValue, 'sections', payload, workflow.revision); workflow.sections.push({ id: id(), position: workflow.sections.length, ...payload }); workflow.revision += 1; return workflow; }
  async addField(idValue: string, payload: Record<string, unknown>) { const workflow = await this.workflow(idValue); if (!payload.key || !payload.type || !payload.label) throw new BadRequestException('FIELD_KEY_TYPE_LABEL_REQUIRED'); if (this.repository.enabled) return this.repository.addToWorkflow(idValue, 'fields', payload, workflow.revision); workflow.fields.push({ id: id(), ...payload }); workflow.revision += 1; return workflow; }
  async updateRules(idValue: string, payload: Record<string, unknown>) { const workflow = await this.workflow(idValue); const rules = Array.isArray(payload.rules) ? payload.rules as Rule[] : []; const fields = Array.isArray(workflow.fields) ? workflow.fields : Array.isArray((workflow.schema as any)?.fields) ? (workflow.schema as any).fields : []; const diagnostics = validateRules(rules, new Set(fields.map((field: any) => field.key))); if (!diagnostics.valid) throw new BadRequestException(diagnostics); if (this.repository.enabled) return this.repository.replaceRules(idValue, rules, workflow.revision); workflow.rules = rules; workflow.revision += 1; return { workflow, diagnostics }; }
  fieldTypes() { return ['TEXT', 'LONG_TEXT', 'NUMBER', 'BOOLEAN', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DATE', 'TIME', 'DATETIME', 'GPS', 'IMAGE', 'FILE', 'SIGNATURE', 'CALCULATION']; }
  async validateWorkflow(idValue: string) { const workflow = await this.workflow(idValue); return { valid: Boolean(workflow.name), errors: workflow.name ? [] : [{ path: 'name', message: 'Workflow name is required' }], warnings: [] }; }
  async previewWorkflow(idValue: string) { const workflow = await this.workflow(idValue); const schema = workflow.schema ?? { sections: workflow.sections, fields: workflow.fields, rules: workflow.rules }; return { id: workflow.id, version: workflow.currentVersionId ?? 'draft', ...(schema as Record<string, unknown>) }; }
  async evaluateWorkflow(idValue: string, answers: Record<string, RuleValue>) { const workflow = await this.workflow(idValue); const schema = (workflow.schema ?? { rules: workflow.rules }) as any; return { schemaVersion: 1, outcomes: evaluateRules((schema.rules ?? []) as Rule[], answers) }; }
  async validateRules(idValue: string) { const workflow = await this.workflow(idValue); const schema = (workflow.schema ?? { fields: workflow.fields, rules: workflow.rules }) as any; return validateRules((schema.rules ?? []) as Rule[], new Set((schema.fields ?? []).map((field: any) => field.key))); }
  async publishWorkflow(idValue: string, notes?: string, revision?: number) { const workflow = await this.workflow(idValue); const validation = await this.validateWorkflow(idValue); if (!validation.valid) throw new BadRequestException('WORKFLOW_INVALID'); if (this.repository.enabled) return this.repository.publishWorkflow(idValue, revision ?? workflow.revision, notes ?? ''); const snapshot = JSON.stringify({ sections: workflow.sections, fields: workflow.fields, rules: workflow.rules }); const version = { id: id(), version: workflow.versions.length + 1, status: 'PUBLISHED', notes: notes ?? '', hash: createHash('sha256').update(snapshot).digest('hex'), snapshot, createdAt: now() }; workflow.versions.push(version); workflow.currentVersionId = version.id; workflow.status = 'PUBLISHED'; workflow.revision += 1; return version; }
  async versions(idValue: string) { if (this.repository.enabled) return this.repository.versions(idValue); return (await this.workflow(idValue) as Workflow).versions; }
  async duplicateWorkflow(idValue: string, name?: string) { const source = await this.workflow(idValue); return this.createWorkflow({ name: name ?? `${source.name} copy`, description: source.description }); }
  async archiveWorkflow(idValue: string, revision?: number) { const workflow = await this.workflow(idValue); if (this.repository.enabled) return this.repository.archiveWorkflow(idValue, revision ?? workflow.revision); workflow.status = 'ARCHIVED'; workflow.archived = true; return workflow; }
  templates() { return this.templateCatalog.filter((item) => !item.archived); }
  instantiateTemplate(templateId: string) { const template = this.find(this.templateCatalog, templateId); return this.createWorkflow({ name: template.name, description: template.description }); }

  async taskList(query: { search?: string; status?: string }) { if (this.repository.enabled) return this.repository.tasks(query); return this.list(this.tasks, query); }
  async task(idValue: string) { if (this.repository.enabled) return this.repository.task(idValue); return this.find(this.tasks, idValue) as Task; }
  async createTask(payload: Record<string, unknown>) { if (this.repository.enabled) return this.repository.createTask(payload); const workflow = payload.workflowId ? await this.workflow(String(payload.workflowId)) : this.workflows.find((item) => item.status === 'PUBLISHED'); if (!workflow?.currentVersionId) throw new BadRequestException('PUBLISHED_WORKFLOW_REQUIRED'); const task = this.create(this.tasks as RecordBase[], { ...payload, number: `FBX-${++this.sequence}`, status: 'DRAFT', flags: [], revision: 1, history: [], assignments: [], workflowVersionId: workflow.currentVersionId }) as Task; task.history.push({ id: id(), event: 'TASK_CREATED', at: now(), actor: 'admin' }); return task; }
  async updateTask(idValue: string, payload: Record<string, unknown>, revision?: number) { const task = await this.task(idValue); if (revision !== undefined && revision !== task.revision) throw new ConflictException('STALE_TASK_REVISION'); const immutable = ['number', 'workflowVersionId']; if (immutable.some((key) => key in payload)) throw new BadRequestException('IMMUTABLE_TASK_FIELD'); if (this.repository.enabled) return this.repository.updateTask(idValue, payload, revision ?? task.revision); task.revision += 1; Object.assign(task, payload, { updatedAt: now() }); return task; }
  async assignTask(idValue: string, payload: Record<string, unknown>) { if (!payload.workerId && !payload.teamId) throw new BadRequestException('ASSIGNMENT_TARGET_REQUIRED'); if (this.repository.enabled) return this.repository.assignTask(idValue, payload); const task = await this.task(idValue) as Task; const assignment = { id: id(), ...payload, assignedAt: now(), active: true }; task.assignments.forEach((entry: any) => { entry.active = false; entry.endedAt = now(); }); task.assignments.push(assignment); task.revision += 1; task.history.push({ id: id(), event: 'TASK_ASSIGNED', at: now(), payload }); return task; }
  async transitionTask(idValue: string, payload: { targetStatus: string; reason?: string; revision?: number }) { if (this.repository.enabled) return this.repository.transitionTask(idValue, payload.targetStatus, payload.reason ?? '', payload.revision ?? 0); const task = await this.task(idValue) as Task; if (payload.revision !== undefined && payload.revision !== task.revision) throw new ConflictException('STALE_TASK_REVISION'); const allowed: Record<string, string[]> = { DRAFT: ['SCHEDULED', 'CANCELLED'], SCHEDULED: ['ASSIGNED', 'CANCELLED'], ASSIGNED: ['IN_PROGRESS', 'CANCELLED'], IN_PROGRESS: ['COMPLETED', 'PAUSED', 'CANCELLED'], PAUSED: ['IN_PROGRESS', 'CANCELLED'], COMPLETED: ['REOPENED'], REOPENED: ['IN_PROGRESS'] }; if (!allowed[task.status]?.includes(payload.targetStatus)) throw new ConflictException('INVALID_TASK_TRANSITION'); const from = task.status; task.status = payload.targetStatus; task.revision += 1; task.history.push({ id: id(), event: 'TASK_TRANSITIONED', from, to: task.status, reason: payload.reason, at: now() }); return task; }
  async requestAction(idValue: string, payload: Record<string, unknown>) { if (this.repository.enabled) return this.repository.appendAction(idValue, 'ACTION_REQUESTED', payload); const task = await this.task(idValue) as Task; task.history.push({ id: id(), event: 'ACTION_REQUESTED', ...payload, at: now() }); return task; }
  async addAttachment(idValue: string, payload: Record<string, unknown>) { if (this.repository.enabled) return this.repository.appendAttachment(idValue, payload); const task = await this.task(idValue) as Task; const attachments = (task.attachments as unknown[] | undefined) ?? []; attachments.push({ id: id(), ...payload, createdAt: now() }); task.attachments = attachments; return task; }
  async taskHistory(idValue: string) { if (this.repository.enabled) return this.repository.history(idValue); return (await this.task(idValue) as Task).history; }
  capacity() { return { window: 'This week', teams: [{ name: 'Muscat Service Team', scheduled: 14, capacity: 20, utilization: 70 }, { name: 'Response Crew', scheduled: 8, capacity: 12, utilization: 67 }] }; }
}
