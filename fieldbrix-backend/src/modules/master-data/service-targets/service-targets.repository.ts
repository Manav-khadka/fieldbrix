import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import {
  MasterRecordRepository,
  MasterRecord,
} from '../support/master-record.repository';
import { rowToCamelCase } from '../support/case';

export type ServiceTargetRecord = MasterRecord & {
  siteId: string;
  name: string;
  code: string;
  qrIdentity: string;
  equipmentType: string | null;
  location: string | null;
  warranty: Record<string, unknown> | null;
  coverage: Record<string, unknown> | null;
  condition: string | null;
  nextDue: string | null;
  evidence: Record<string, unknown> | null;
};

const TARGET_CREATE_COLUMNS = [
  'siteId',
  'name',
  'code',
  'qrIdentity',
  'equipmentType',
  'location',
  'warranty',
  'coverage',
  'condition',
  'nextDue',
  'evidence',
];
const TARGET_UPDATE_COLUMNS = TARGET_CREATE_COLUMNS.filter(
  (key) => key !== 'siteId' && key !== 'qrIdentity',
);

@Injectable()
export class ServiceTargetsRepository extends MasterRecordRepository<ServiceTargetRecord> {
  constructor(database: DatabaseService) {
    super(
      database,
      'master_service_targets',
      TARGET_CREATE_COLUMNS,
      TARGET_UPDATE_COLUMNS,
    );
  }

  async siteExists(siteId: string): Promise<boolean> {
    const result = await this.database.tenantQuery<{ exists: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM master_sites WHERE id = $1::uuid AND archived_at IS NULL) AS exists',
      [siteId],
    );
    return Boolean(result[0]?.exists);
  }

  async resolveByQrIdentity(code: string): Promise<{
    type: 'service_target';
    target: ServiceTargetRecord;
    site: { id: string; name: string; customerId: string };
  }> {
    const result = await this.database.tenantQuery<Record<string, unknown>>(
      `SELECT t.*, t.id::text AS id, s.name AS "siteName", s.customer_id::text AS "siteCustomerId"
       FROM master_service_targets t
       JOIN master_sites s ON s.id = t.site_id AND s.tenant_id = t.tenant_id
       WHERE t.qr_identity = $1 AND t.archived_at IS NULL`,
      [code],
    );
    if (!result[0]) throw new NotFoundException('QR_NOT_FOUND');
    const row = rowToCamelCase<
      ServiceTargetRecord & { siteName: string; siteCustomerId: string }
    >(result[0]);
    const { siteName, siteCustomerId, ...target } = row;
    return {
      type: 'service_target',
      target,
      site: { id: target.siteId, name: siteName, customerId: siteCustomerId },
    };
  }
}
