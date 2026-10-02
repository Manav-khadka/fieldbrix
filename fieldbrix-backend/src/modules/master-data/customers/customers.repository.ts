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
  legalName: string | null;
  industry: string | null;
  taxId: string | null;
  alternatePhone: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  serviceTier: string;
  accountManager: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  customFields: Record<string, unknown>;
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
  'legalName',
  'industry',
  'taxId',
  'alternatePhone',
  'city',
  'state',
  'postalCode',
  'country',
  'serviceTier',
  'accountManager',
  'contractStart',
  'contractEnd',
  'customFields',
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
      [
        'name',
        'code',
        'legalName',
        'industry',
        'city',
        'state',
        'contactName',
        'email',
        'phone',
        'customFields',
      ],
    );
  }

  async hasActiveSites(customerId: string): Promise<boolean> {
    return this.hasActiveDependents('master_sites', 'customer_id', customerId);
  }
}
