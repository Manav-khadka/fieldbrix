import {
  MasterRecordRepository,
  type MasterRecord,
} from './master-record.repository';
import type { DatabaseService } from '../../database/database/database.service';

type WidgetRecord = MasterRecord & { name: string; code: string };

class WidgetsRepository extends MasterRecordRepository<WidgetRecord> {
  constructor(database: DatabaseService) {
    super(
      database,
      'master_widgets',
      ['name', 'code'],
      ['name', 'code'],
      'widget',
    );
  }
}

function makeDatabase(rows: Record<string, unknown>[]) {
  return {
    tenantQuery: jest.fn().mockResolvedValue(rows),
    emitOutboxEvent: jest.fn().mockResolvedValue(undefined),
  } as unknown as DatabaseService;
}

describe('MasterRecordRepository outbox events', () => {
  it('emits a <entityType>.created.v1 event after a successful create', async () => {
    const database = makeDatabase([
      { id: 'widget-1', revision: 1, name: 'Bolt', code: 'BLT' },
    ]);
    const repo = new WidgetsRepository(database);
    const record = await repo.create({ name: 'Bolt', code: 'BLT' });

    expect(record.id).toBe('widget-1');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock
    expect(database.emitOutboxEvent).toHaveBeenCalledWith(
      'master.widget.created.v1',
      { id: 'widget-1', revision: 1 },
    );
  });

  it('emits a <entityType>.updated.v1 event after a successful update', async () => {
    const database = makeDatabase([
      { id: 'widget-1', revision: 2, name: 'Bolt v2', code: 'BLT' },
    ]);
    const repo = new WidgetsRepository(database);
    await repo.update('widget-1', { name: 'Bolt v2' }, 1);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock
    expect(database.emitOutboxEvent).toHaveBeenCalledWith(
      'master.widget.updated.v1',
      { id: 'widget-1', revision: 2 },
    );
  });

  it('emits a <entityType>.archived.v1 event after a successful archive', async () => {
    const database = makeDatabase([
      { id: 'widget-1', revision: 3, name: 'Bolt v2', code: 'BLT' },
    ]);
    const repo = new WidgetsRepository(database);
    await repo.archive('widget-1', 2);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock
    expect(database.emitOutboxEvent).toHaveBeenCalledWith(
      'master.widget.archived.v1',
      { id: 'widget-1', revision: 3 },
    );
  });

  it('does not emit an event when create fails with a duplicate-code conflict', async () => {
    const database = {
      tenantQuery: jest
        .fn()
        .mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' })),
      emitOutboxEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as DatabaseService;
    const repo = new WidgetsRepository(database);

    await expect(repo.create({ name: 'Bolt', code: 'BLT' })).rejects.toThrow();
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock
    expect(database.emitOutboxEvent).not.toHaveBeenCalled();
  });
});
