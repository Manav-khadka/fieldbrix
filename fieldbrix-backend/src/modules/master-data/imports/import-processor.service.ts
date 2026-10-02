import { Injectable } from '@nestjs/common';
import { CustomersRepository } from '../customers/customers.repository';
import { SitesRepository } from '../sites/sites.repository';
import { ServiceTargetsRepository } from '../service-targets/service-targets.repository';
import { PartsRepository } from '../parts/parts.repository';
import { QrIdentityService } from '../service-targets/qr-identity.service';
import { PlatformService } from '../../platform/platform/platform.service';
import type { ImportableEntityType } from '../dto/import.dto';
import { TaskService } from '../../tasks/task/task.service';
import type { CreateTaskDto } from '../../tasks/task/task.dto';
import { TaskAssignmentService } from '../../tasks/assignment/task-assignment.service';

export type RowValidation = {
  valid: boolean;
  errorCode?: string;
  message?: string;
};
export type RowCommitResult =
  | { outcome: 'CREATED' | 'UPDATED'; entityId: string }
  | { outcome: 'SKIPPED' }
  | { outcome: 'ERROR'; errorCode: string; message: string };

const REQUIRED_FIELDS: Record<ImportableEntityType, string[]> = {
  customers: ['name', 'code'],
  sites: ['name', 'code'],
  service_targets: ['name', 'code'],
  parts: ['name', 'code', 'unit'],
  users: ['email'],
  tasks: [
    'externalReferenceId',
    'contactPhone',
    'workflowVersionId',
    'customerId',
  ],
};

const cellString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and commits import rows per entity type. Kept separate from
 * ImportsService (orchestration) and ImportsRepository (job/row bookkeeping)
 * so the row-level business rules — required fields, parent resolution,
 * duplicate handling — stay independently testable.
 */
@Injectable()
export class ImportProcessorService {
  constructor(
    private readonly customers: CustomersRepository,
    private readonly sites: SitesRepository,
    private readonly serviceTargets: ServiceTargetsRepository,
    private readonly parts: PartsRepository,
    private readonly qrIdentity: QrIdentityService,
    private readonly platform: PlatformService,
    private readonly tasks: TaskService,
    private readonly assignments: TaskAssignmentService,
  ) {}

  validateRow(
    entityType: ImportableEntityType,
    row: Record<string, unknown>,
  ): RowValidation {
    for (const field of REQUIRED_FIELDS[entityType]) {
      const value = row[field];
      if (typeof value !== 'string' || !value.trim())
        return {
          valid: false,
          errorCode: 'REQUIRED_FIELD',
          message: `${field} is required`,
        };
    }
    if (entityType === 'sites' && !row.customerCode && !row.customerId)
      return {
        valid: false,
        errorCode: 'PARENT_REQUIRED',
        message: 'customerCode is required',
      };
    if (entityType === 'service_targets' && !row.siteCode && !row.siteId)
      return {
        valid: false,
        errorCode: 'PARENT_REQUIRED',
        message: 'siteCode is required',
      };
    if (entityType === 'users' && !EMAIL_PATTERN.test(cellString(row.email)))
      return {
        valid: false,
        errorCode: 'INVALID_EMAIL',
        message: 'email must be a valid email address',
      };
    if (entityType === 'tasks') {
      if (!row.assignmentWorkerId && !row.assignmentTeamId)
        return {
          valid: false,
          errorCode: 'ASSIGNEE_REQUIRED',
          message: 'A worker or department must be assigned to this batch',
        };
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
        return {
          valid: false,
          errorCode: 'INVALID_LATITUDE',
          message: 'latitude must be a number between -90 and 90',
        };
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
        return {
          valid: false,
          errorCode: 'INVALID_LONGITUDE',
          message: 'longitude must be a number between -180 and 180',
        };
    }
    return { valid: true };
  }

  async commitRow(
    entityType: ImportableEntityType,
    row: Record<string, unknown>,
    duplicateMode: 'reject' | 'skip' | 'update',
    actorToken?: string,
  ): Promise<RowCommitResult> {
    if (entityType === 'customers')
      return this.commitCustomer(row, duplicateMode);
    if (entityType === 'sites') return this.commitSite(row, duplicateMode);
    if (entityType === 'service_targets')
      return this.commitServiceTarget(row, duplicateMode);
    if (entityType === 'users') return this.commitUser(row, actorToken);
    if (entityType === 'tasks') return this.commitTask(row, duplicateMode);
    return this.commitPart(row, duplicateMode);
  }

  private async commitTask(
    row: Record<string, unknown>,
    duplicateMode: 'reject' | 'skip' | 'update',
  ): Promise<RowCommitResult> {
    const result = await this.tasks.importTask(
      row as unknown as CreateTaskDto & {
        externalReferenceId: string;
        customerId: string;
      },
      duplicateMode,
    );
    if (result.outcome === 'CREATED' || result.outcome === 'UPDATED') {
      await this.assignments.assign(result.entityId, {
        workerId:
          typeof row.assignmentWorkerId === 'string'
            ? row.assignmentWorkerId
            : undefined,
        teamId:
          typeof row.assignmentTeamId === 'string'
            ? row.assignmentTeamId
            : undefined,
        supervisorIds: Array.isArray(row.supervisorIds)
          ? row.supervisorIds.map(String)
          : [],
        verificationMode: row.verificationMode as
          'AUTO' | 'MANUAL_SUPERVISOR' | 'QUALITY_DEPARTMENT' | undefined,
        requiredApprovals:
          typeof row.requiredApprovals === 'number' ? row.requiredApprovals : 1,
        qualityTeamId:
          typeof row.qualityTeamId === 'string' ? row.qualityTeamId : undefined,
        reason: 'Assigned during task import',
      });
    }
    return result;
  }

  // Users import a differently-shaped commit: there's no "duplicate row"
  // concept to reject/skip/update against (PlatformService.inviteUser
  // issues a fresh invitation every call, matching the existing invite
  // flow's behavior — re-inviting the same email is allowed elsewhere too),
  // and it requires the importing admin's own token so the invitation is
  // attributed to a real actor and goes through the same
  // 'iam.users.invite' permission check as the manual invite form.
  private async commitUser(
    row: Record<string, unknown>,
    actorToken?: string,
  ): Promise<RowCommitResult> {
    if (!actorToken)
      return {
        outcome: 'ERROR',
        errorCode: 'UNAUTHORIZED',
        message: 'Importing users requires an authenticated actor',
      };
    try {
      const invitation = await this.platform.inviteUser(
        actorToken,
        cellString(row.email).trim(),
      );
      return { outcome: 'CREATED', entityId: invitation.invitationToken };
    } catch (error) {
      return {
        outcome: 'ERROR',
        errorCode: 'INVITE_FAILED',
        message:
          error instanceof Error ? error.message : 'Unable to invite user',
      };
    }
  }

  private async commitCustomer(
    row: Record<string, unknown>,
    duplicateMode: 'reject' | 'skip' | 'update',
  ): Promise<RowCommitResult> {
    const code = cellString(row.code).trim();
    const existing = await this.customers.findByCode(code);
    if (existing)
      return this.handleDuplicate(duplicateMode, () =>
        this.customers.update(existing.id, row),
      );
    const created = await this.customers.create({
      ...row,
      code,
      name: cellString(row.name).trim(),
    });
    return { outcome: 'CREATED', entityId: created.id };
  }

  private async commitSite(
    row: Record<string, unknown>,
    duplicateMode: 'reject' | 'skip' | 'update',
  ): Promise<RowCommitResult> {
    let customerId = row.customerId as string | undefined;
    if (!customerId && row.customerCode) {
      const customer = await this.customers.findByCode(
        cellString(row.customerCode),
      );
      if (!customer)
        return {
          outcome: 'ERROR',
          errorCode: 'CUSTOMER_NOT_FOUND',
          message: `Unknown customer code ${cellString(row.customerCode)}`,
        };
      customerId = customer.id;
    }
    const code = cellString(row.code).trim();
    const existing = await this.sites.findByCode(code);
    if (existing)
      return this.handleDuplicate(duplicateMode, () =>
        this.sites.update(existing.id, row),
      );
    const created = await this.sites.create({
      ...row,
      customerId,
      code,
      name: cellString(row.name).trim(),
    });
    return { outcome: 'CREATED', entityId: created.id };
  }

  private async commitServiceTarget(
    row: Record<string, unknown>,
    duplicateMode: 'reject' | 'skip' | 'update',
  ): Promise<RowCommitResult> {
    let siteId = row.siteId as string | undefined;
    if (!siteId && row.siteCode) {
      const site = await this.sites.findByCode(cellString(row.siteCode));
      if (!site)
        return {
          outcome: 'ERROR',
          errorCode: 'SITE_NOT_FOUND',
          message: `Unknown site code ${cellString(row.siteCode)}`,
        };
      siteId = site.id;
    }
    const code = cellString(row.code).trim();
    const existing = await this.serviceTargets.findByCode(code);
    if (existing)
      return this.handleDuplicate(duplicateMode, () =>
        this.serviceTargets.update(existing.id, row),
      );
    const created = await this.serviceTargets.create({
      ...row,
      siteId,
      code,
      name: cellString(row.name).trim(),
      qrIdentity: this.qrIdentity.generate(),
    });
    return { outcome: 'CREATED', entityId: created.id };
  }

  private async commitPart(
    row: Record<string, unknown>,
    duplicateMode: 'reject' | 'skip' | 'update',
  ): Promise<RowCommitResult> {
    const code = cellString(row.code).trim();
    const existing = await this.parts.findByCode(code);
    if (existing)
      return this.handleDuplicate(duplicateMode, () =>
        this.parts.update(existing.id, row),
      );
    const created = await this.parts.create({
      ...row,
      code,
      name: cellString(row.name).trim(),
    });
    return { outcome: 'CREATED', entityId: created.id };
  }

  private async handleDuplicate(
    duplicateMode: 'reject' | 'skip' | 'update',
    update: () => Promise<{ id: string }>,
  ): Promise<RowCommitResult> {
    if (duplicateMode === 'reject')
      return {
        outcome: 'ERROR',
        errorCode: 'DUPLICATE_CODE',
        message: 'Code already exists for this tenant',
      };
    if (duplicateMode === 'skip') return { outcome: 'SKIPPED' };
    const updated = await update();
    return { outcome: 'UPDATED', entityId: updated.id };
  }
}
