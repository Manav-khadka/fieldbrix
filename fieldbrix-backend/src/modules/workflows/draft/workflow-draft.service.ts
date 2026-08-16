import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WorkflowDraftRepository } from './workflow-draft.repository';
import { getFieldTypeRegistry, isKnownFieldType } from '../field-type.registry';
import type {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateFieldDto,
  UpdateFieldDto,
  ReorderDto,
} from './workflow.dto';

const FIELD_LABEL_MAX_LENGTH = 200;
const FIELD_HELP_MAX_LENGTH = 1000;

@Injectable()
export class WorkflowDraftService {
  constructor(private readonly repo: WorkflowDraftRepository) {}

  list(search?: string, status?: string, page = 1, limit = 20) {
    return this.repo.list(search, status, page, limit);
  }

  get(id: string) {
    return this.repo.findById(id);
  }

  create(dto: CreateWorkflowDto) {
    if (!dto.name?.trim()) throw new BadRequestException('NAME_REQUIRED');
    return this.repo.create({ ...dto, name: dto.name.trim() });
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    const current = await this.repo.findById(id);
    const revision = dto.revision ?? (current.revision as number);
    return this.repo.update(
      id,
      dto as unknown as Record<string, unknown>,
      revision,
    );
  }

  async addSection(id: string, dto: CreateSectionDto, revision?: number) {
    const current = await this.repo.findById(id);
    const rev = revision ?? (current.revision as number);
    const schema = current.schema as Record<string, unknown>;
    const sections = (schema.sections as unknown[]) ?? [];
    const position = dto.position ?? sections.length;
    return this.repo.addToSchema(id, 'sections', { ...dto, position }, rev);
  }

  async patchSection(
    workflowId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ) {
    const current = await this.repo.findById(workflowId);
    const revision = dto.revision ?? (current.revision as number);
    return this.repo.patchSchemaElement(
      workflowId,
      'sections',
      sectionId,
      dto as unknown as Record<string, unknown>,
      revision,
    );
  }

  async removeSection(
    workflowId: string,
    sectionId: string,
    revision?: number,
  ) {
    const current = await this.repo.findById(workflowId);
    const rev = revision ?? (current.revision as number);
    return this.repo.removeSchemaElement(
      workflowId,
      'sections',
      sectionId,
      rev,
    );
  }

  async addField(id: string, dto: CreateFieldDto, revision?: number) {
    if (!dto.key?.trim() || !dto.type?.trim() || !dto.label?.trim())
      throw new BadRequestException('FIELD_KEY_TYPE_LABEL_REQUIRED');
    if (!isKnownFieldType(dto.type))
      throw new BadRequestException(`UNKNOWN_FIELD_TYPE: ${String(dto.type)}`);
    if (dto.label.length > FIELD_LABEL_MAX_LENGTH)
      throw new BadRequestException(
        `FIELD_LABEL_TOO_LONG: max ${FIELD_LABEL_MAX_LENGTH} characters`,
      );
    if (dto.help && dto.help.length > FIELD_HELP_MAX_LENGTH)
      throw new BadRequestException(
        `FIELD_HELP_TOO_LONG: max ${FIELD_HELP_MAX_LENGTH} characters`,
      );
    const current = await this.repo.findById(id);
    const rev = revision ?? (current.revision as number);
    const schema = current.schema as Record<string, unknown>;
    const fields = (schema.fields as Array<Record<string, unknown>>) ?? [];
    if (fields.some((field) => field.key === dto.key))
      throw new BadRequestException(`DUPLICATE_FIELD_KEY: ${dto.key}`);
    const typeEntry = getFieldTypeRegistry().find(
      (entry) => entry.type === dto.type,
    );
    if (typeEntry?.supportsOptions) {
      const options =
        (dto.config?.options as Array<{ value: string }> | undefined) ?? [];
      const values = options.map((option) => option.value);
      if (new Set(values).size !== values.length)
        throw new BadRequestException('DUPLICATE_FIELD_OPTION_VALUE');
    }
    const position = dto.position ?? fields.length;
    return this.repo.addToSchema(id, 'fields', { ...dto, position }, rev);
  }

  async patchField(workflowId: string, fieldId: string, dto: UpdateFieldDto) {
    const current = await this.repo.findById(workflowId);
    const revision = dto.revision ?? (current.revision as number);
    return this.repo.patchSchemaElement(
      workflowId,
      'fields',
      fieldId,
      dto as unknown as Record<string, unknown>,
      revision,
    );
  }

  async removeField(workflowId: string, fieldId: string, revision?: number) {
    const current = await this.repo.findById(workflowId);
    const rev = revision ?? (current.revision as number);
    return this.repo.removeSchemaElement(workflowId, 'fields', fieldId, rev);
  }

  async reorder(id: string, dto: ReorderDto) {
    return this.repo.reorder(
      id,
      dto.sectionOrder,
      dto.fieldOrder,
      dto.revision,
    );
  }

  async validate(id: string) {
    const workflow = await this.repo.findById(id);
    const errors: Array<{ path: string; message: string }> = [];
    if (!workflow.name)
      errors.push({ path: 'name', message: 'Workflow name is required' });
    const schema = workflow.schema as Record<string, unknown>;
    const fields = (schema?.fields as Array<Record<string, unknown>>) ?? [];
    const sections = (schema?.sections as Array<Record<string, unknown>>) ?? [];
    if (sections.length === 0)
      errors.push({
        path: 'sections',
        message: 'At least one section is required',
      });
    if (fields.length === 0)
      errors.push({
        path: 'fields',
        message: 'At least one field is required',
      });
    // Check for duplicate field keys
    const keys = fields.map((f) => f.key).filter(Boolean);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length)
      errors.push({ path: 'fields', message: 'Duplicate field keys detected' });
    return { valid: errors.length === 0, errors, warnings: [] };
  }

  /**
   * Deep-copies the source draft's schema into a new, fully independent
   * draft: sections/fields/rules all get fresh IDs so the copy shares no
   * mutable children with its source. Rules reference fields by their
   * stable `key`, not `id`, so field keys are preserved as-is.
   */
  async duplicate(id: string, name?: string) {
    const source = await this.repo.findById(id);
    const schema = (source.schema as Record<string, unknown>) ?? {};
    const sectionIdMap = new Map<string, string>();
    const sections = (
      (schema.sections as Array<Record<string, unknown>>) ?? []
    ).map((section) => {
      const newId = randomUUID();
      sectionIdMap.set(String(section.id), newId);
      return { ...section, id: newId };
    });
    const fields = (
      (schema.fields as Array<Record<string, unknown>>) ?? []
    ).map((field) => {
      const sectionId =
        typeof field.sectionId === 'string' ? field.sectionId : undefined;
      return {
        ...field,
        id: randomUUID(),
        sectionId: sectionId
          ? (sectionIdMap.get(sectionId) ?? sectionId)
          : sectionId,
      };
    });
    const rules = ((schema.rules as Array<Record<string, unknown>>) ?? []).map(
      (rule) => ({ ...rule, id: randomUUID() }),
    );
    return this.repo.create({
      name: name?.trim() || `${String(source.name)} copy`,
      description: source.description,
      schema: { sections, fields, rules },
    });
  }

  async preview(id: string) {
    const workflow = await this.repo.findById(id);
    const schema = workflow.schema ?? { sections: [], fields: [], rules: [] };
    return {
      id: workflow.id,
      version: workflow.currentVersionId ?? 'draft',
      ...(schema as Record<string, unknown>),
    };
  }
}
