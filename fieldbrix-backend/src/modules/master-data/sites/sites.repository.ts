import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import {
  MasterRecordRepository,
  MasterRecord,
} from '../support/master-record.repository';

export type SiteRecord = MasterRecord & {
  customerId: string;
  name: string;
  code: string;
  address: Record<string, unknown>;
  gps: Record<string, unknown> | null;
  geofence: Record<string, unknown> | null;
  accessNotes: string | null;
  parkingNotes: string;
  hours: Record<string, unknown> | null;
  safetyNotes: string | null;
};

const SITE_CREATE_COLUMNS = [
  'customerId',
  'name',
  'code',
  'address',
  'gps',
  'geofence',
  'accessNotes',
  'parkingNotes',
  'hours',
  'safetyNotes',
];
const SITE_UPDATE_COLUMNS = SITE_CREATE_COLUMNS.filter(
  (key) => key !== 'customerId',
);

@Injectable()
export class SitesRepository extends MasterRecordRepository<SiteRecord> {
  constructor(database: DatabaseService) {
    super(
      database,
      'master_sites',
      SITE_CREATE_COLUMNS,
      SITE_UPDATE_COLUMNS,
      'site',
    );
  }

  async customerExists(customerId: string): Promise<boolean> {
    const result = await this.database.tenantQuery<{ exists: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM master_customers WHERE id = $1::uuid AND archived_at IS NULL) AS exists',
      [customerId],
    );
    return Boolean(result[0]?.exists);
  }

  async hasActiveServiceTargets(siteId: string): Promise<boolean> {
    return this.hasActiveDependents(
      'master_service_targets',
      'site_id',
      siteId,
    );
  }
}
