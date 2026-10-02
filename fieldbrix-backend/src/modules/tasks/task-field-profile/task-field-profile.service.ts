import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  ListTaskFieldProfilesQueryDto,
  TaskFieldDefinitionDto,
  UpsertTaskFieldProfileDto,
} from './task-field-profile.dto';
import { TaskFieldProfileRepository } from './task-field-profile.repository';

const CORE_TASK_COLUMNS = new Set([
  'number',
  'externalReferenceId',
  'description',
  'instructions',
  'status',
  'priority',
  'flags',
  'contactPhone',
  'latitude',
  'longitude',
  'scheduledAt',
  'dueAt',
  'estimatedMinutes',
]);

type ImportProfile = {
  entityLabel: string;
  columnMapping: Record<string, string>;
  fields: TaskFieldDefinitionDto[];
  visibleColumns: string[];
};

@Injectable()
export class TaskFieldProfileService {
  constructor(private readonly repository: TaskFieldProfileRepository) {}

  list(query: ListTaskFieldProfilesQueryDto) {
    return this.repository.list(query.customerId, query.workflowId);
  }

  upsert(dto: UpsertTaskFieldProfileDto) {
    const profile = this.sanitize(dto);
    return this.repository.upsert({
      customerId: dto.customerId,
      workflowId: dto.workflowId,
      ...profile,
    });
  }

  async upsertFromImport(
    customerId: string,
    workflowVersionId: string,
    profileInput: ImportProfile,
  ) {
    const profile = this.sanitize(profileInput);
    const saved = await this.repository.upsertForVersion({
      customerId,
      workflowVersionId,
      ...profile,
    });
    if (!saved) throw new BadRequestException('PUBLISHED_WORKFLOW_REQUIRED');
    return saved;
  }

  private sanitize(profile: ImportProfile): ImportProfile {
    const entityLabel = profile.entityLabel.trim();
    if (!entityLabel) throw new BadRequestException('ENTITY_LABEL_REQUIRED');
    if (profile.fields.length > 200)
      throw new BadRequestException('TOO_MANY_TASK_FIELDS');

    const keys = new Set<string>();
    const sources = new Set<string>();
    const fields = profile.fields.map((field) => {
      const key = field.key.trim();
      const sourceColumn = field.sourceColumn.trim();
      if (!key || !sourceColumn)
        throw new BadRequestException('INVALID_TASK_FIELD');
      if (keys.has(key) || sources.has(sourceColumn))
        throw new BadRequestException('DUPLICATE_TASK_FIELD');
      keys.add(key);
      sources.add(sourceColumn);
      return {
        key,
        sourceColumn,
        label: field.label.trim() || sourceColumn,
        dataType: field.dataType,
        searchable: Boolean(field.searchable),
        filterable: Boolean(field.filterable),
      };
    });

    const allowedColumns = new Set([...CORE_TASK_COLUMNS, ...keys]);
    const visibleColumns = [
      ...new Set(
        profile.visibleColumns.filter((key) => allowedColumns.has(key)),
      ),
    ];
    if (!visibleColumns.includes('number')) visibleColumns.unshift('number');
    const columnMapping = Object.fromEntries(
      Object.entries(profile.columnMapping ?? {})
        .filter(
          ([target, source]) =>
            CORE_TASK_COLUMNS.has(target) &&
            typeof source === 'string' &&
            Boolean(source.trim()),
        )
        .map(([target, source]) => [target, source.trim()]),
    );
    return { entityLabel, columnMapping, fields, visibleColumns };
  }
}
