import { computeTimeBasedFlags, mergeTaskFlags } from './task-flags';

describe('computeTimeBasedFlags', () => {
  const now = new Date('2026-08-16T12:00:00.000Z');

  it('returns no flags when there is no dueAt', () => {
    expect(computeTimeBasedFlags({ status: 'IN_PROGRESS', dueAt: null }, now))
      .toEqual([]);
  });

  it('returns no flags when dueAt is in the future', () => {
    const dueAt = new Date(now.getTime() + 60_000).toISOString();
    expect(computeTimeBasedFlags({ status: 'IN_PROGRESS', dueAt }, now)).toEqual(
      [],
    );
  });

  it('returns OVERDUE when dueAt has passed but not by more than 24h', () => {
    const dueAt = new Date(now.getTime() - 60_000).toISOString();
    expect(computeTimeBasedFlags({ status: 'IN_PROGRESS', dueAt }, now)).toEqual(
      ['OVERDUE'],
    );
  });

  it('returns OVERDUE and ESCALATED when dueAt is more than 24h past', () => {
    const dueAt = new Date(
      now.getTime() - 25 * 60 * 60_000,
    ).toISOString();
    expect(computeTimeBasedFlags({ status: 'IN_PROGRESS', dueAt }, now)).toEqual(
      ['OVERDUE', 'ESCALATED'],
    );
  });

  it('never flags a COMPLETED task as overdue, regardless of dueAt', () => {
    const dueAt = new Date(now.getTime() - 60_000).toISOString();
    expect(computeTimeBasedFlags({ status: 'COMPLETED', dueAt }, now)).toEqual(
      [],
    );
  });

  it('never flags a CANCELLED task as overdue, regardless of dueAt', () => {
    const dueAt = new Date(now.getTime() - 60_000).toISOString();
    expect(computeTimeBasedFlags({ status: 'CANCELLED', dueAt }, now)).toEqual(
      [],
    );
  });
});

describe('mergeTaskFlags', () => {
  it('combines stored and computed flags without duplicates', () => {
    expect(mergeTaskFlags(['CUSTOM'], ['OVERDUE', 'OVERDUE'])).toEqual([
      'CUSTOM',
      'OVERDUE',
    ]);
  });

  it('ignores non-array or malformed stored flags', () => {
    expect(mergeTaskFlags(null, ['OVERDUE'])).toEqual(['OVERDUE']);
    expect(mergeTaskFlags('not-an-array', ['OVERDUE'])).toEqual(['OVERDUE']);
  });

  it('filters out non-string entries from stored flags', () => {
    expect(mergeTaskFlags([1, 'REAL', null], [])).toEqual(['REAL']);
  });
});
