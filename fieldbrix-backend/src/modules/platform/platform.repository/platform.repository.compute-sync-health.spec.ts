import { PlatformRepository } from './platform.repository';
import type { DatabaseService } from '../../database/database/database.service';

function makeDatabase(
  lastActivityAt: string | null,
  recentDeadLetters: number,
  recentImportFailures = 0,
) {
  return {
    query: jest
      .fn()
      .mockResolvedValueOnce([{ lastActivityAt }])
      .mockResolvedValueOnce([{ count: String(recentDeadLetters) }])
      .mockResolvedValueOnce([{ count: String(recentImportFailures) }]),
  } as unknown as DatabaseService;
}

describe('PlatformRepository.computeSyncHealth', () => {
  it('returns inactive when there is no recorded activity at all', async () => {
    const repo = new PlatformRepository(makeDatabase(null, 0));
    const result = await repo.computeSyncHealth('tenant-1');
    expect(result.syncHealth).toBe('inactive');
    expect(result.lastActivityAt).toBeNull();
  });

  it('returns inactive when the last activity is older than 14 days', async () => {
    const old = new Date(Date.now() - 20 * 24 * 60 * 60_000).toISOString();
    const repo = new PlatformRepository(makeDatabase(old, 0));
    const result = await repo.computeSyncHealth('tenant-1');
    expect(result.syncHealth).toBe('inactive');
  });

  it('returns degraded when recently active but has recent dead-lettered outbox events', async () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    const repo = new PlatformRepository(makeDatabase(recent, 2));
    const result = await repo.computeSyncHealth('tenant-1');
    expect(result.syncHealth).toBe('degraded');
  });

  it('returns degraded when recently active but has recent import failures', async () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    const repo = new PlatformRepository(makeDatabase(recent, 0, 1));
    const result = await repo.computeSyncHealth('tenant-1');
    expect(result.syncHealth).toBe('degraded');
  });

  it('returns healthy when recently active with no dead letters or import failures', async () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    const repo = new PlatformRepository(makeDatabase(recent, 0));
    const result = await repo.computeSyncHealth('tenant-1');
    expect(result.syncHealth).toBe('healthy');
    expect(result.lastActivityAt).toBe(recent);
  });
});
