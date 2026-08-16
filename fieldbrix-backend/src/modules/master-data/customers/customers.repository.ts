import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import {
  MasterRecordRepository,
  MasterRecord,
} from '../support/master-record.repository';

export type CustomerRecord = MasterRecord & {
  name: string;
  code: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: Record<string, unknown>;
  instructions: string;
  archivedAt: string | null;
};

const CUSTOMER_COLUMNS = [
  'name',
  'code',
  'contactName',
  'email',
  'phone',
  'address',
  'instructions',
];

@Injectable()
export class CustomersRepository extends MasterRecordRepository<CustomerRecord> {
  constructor(database: DatabaseService) {
    super(
      database,
      'master_customers',
      CUSTOMER_COLUMNS,
      CUSTOMER_COLUMNS,
      'customer',
    );
  }

  async hasActiveSites(customerId: string): Promise<boolean> {
    return this.hasActiveDependents('master_sites', 'customer_id', customerId);
  }
}
