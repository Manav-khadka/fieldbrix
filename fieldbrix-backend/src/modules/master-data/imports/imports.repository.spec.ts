import type { DatabaseService } from '../../database/database/database.service';
import { ImportsRepository } from './imports.repository';

describe('ImportsRepository pagination', () => {
  it('returns a tenant-scoped page with an exact total', async () => {
    const tenantQuery = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'import-1',
          entity_type: 'tasks',
          status: 'COMPLETED',
          preview_revision: 1,
          total_rows: 50,
          valid_rows: 50,
          error_rows: 0,
          duplicate_mode: 'reject',
          created_at: '2026-08-22T00:00:00.000Z',
          updated_at: '2026-08-22T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([{ count: '23' }]);
    const database = { tenantQuery } as unknown as DatabaseService;
    const repository = new ImportsRepository(database);

    const result = await repository.list(2, 10);

    expect(result).toEqual(
      expect.objectContaining({ total: 23, page: 2, limit: 10 }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({ entityType: 'tasks', totalRows: 50 }),
    );
    const calls = tenantQuery.mock.calls as unknown as Array<
      [string, unknown[]?]
    >;
    expect(calls[0]?.[0]).toContain(
      "tenant_id = current_setting('app.tenant_id', true)::uuid",
    );
    expect(calls[0]?.[1]).toEqual([10, 10]);
  });

  it('bounds invalid page sizes before querying', async () => {
    const tenantQuery = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: '0' }]);
    const repository = new ImportsRepository({
      tenantQuery,
    } as unknown as DatabaseService);

    const result = await repository.list(-4, 999);

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 100 });
    const calls = tenantQuery.mock.calls as unknown as Array<
      [string, unknown[]?]
    >;
    expect(calls[0]?.[1]).toEqual([100, 0]);
  });
});
