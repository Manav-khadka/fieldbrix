import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';
import {
  MasterRecordRepository,
  MasterRecord,
} from '../support/master-record.repository';

export type PartRecord = MasterRecord & {
  name: string;
  code: string;
  compatibility: string[];
  unit: string;
  active: boolean;
};

const PART_COLUMNS = ['name', 'code', 'compatibility', 'unit', 'active'];

@Injectable()
export class PartsRepository extends MasterRecordRepository<PartRecord> {
  constructor(database: DatabaseService) {
    super(database, 'master_parts', PART_COLUMNS, PART_COLUMNS);
  }
}
