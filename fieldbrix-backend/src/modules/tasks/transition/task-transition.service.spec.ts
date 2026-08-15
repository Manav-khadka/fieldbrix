import {
  TRANSITION_MAP,
  isAllowedTransition,
  isTaskStatus,
  TASK_STATUSES,
  type TaskStatus,
} from './transition-map';

describe('TRANSITION_MAP', () => {
  it('every status is covered as a key', () => {
    for (const status of TASK_STATUSES) {
      expect(TRANSITION_MAP).toHaveProperty(status);
    }
  });

  it('CANCELLED has no outgoing transitions', () => {
    expect(TRANSITION_MAP['CANCELLED']).toEqual([]);
  });

  it('COMPLETED can only go to REOPENED', () => {
    expect(TRANSITION_MAP['COMPLETED']).toEqual(['REOPENED']);
  });
});

describe('isAllowedTransition', () => {
  const allowed: Array<[TaskStatus, TaskStatus]> = [
    ['DRAFT', 'SCHEDULED'],
    ['DRAFT', 'CANCELLED'],
    ['SCHEDULED', 'ASSIGNED'],
    ['SCHEDULED', 'CANCELLED'],
    ['ASSIGNED', 'IN_PROGRESS'],
    ['ASSIGNED', 'CANCELLED'],
    ['IN_PROGRESS', 'COMPLETED'],
    ['IN_PROGRESS', 'PAUSED'],
    ['IN_PROGRESS', 'CANCELLED'],
    ['PAUSED', 'IN_PROGRESS'],
    ['PAUSED', 'CANCELLED'],
    ['COMPLETED', 'REOPENED'],
    ['REOPENED', 'IN_PROGRESS'],
  ];

  const forbidden: Array<[TaskStatus, TaskStatus]> = [
    ['DRAFT', 'IN_PROGRESS'],
    ['DRAFT', 'COMPLETED'],
    ['DRAFT', 'PAUSED'],
    ['SCHEDULED', 'IN_PROGRESS'],
    ['SCHEDULED', 'COMPLETED'],
    ['ASSIGNED', 'COMPLETED'],
    ['ASSIGNED', 'DRAFT'],
    ['IN_PROGRESS', 'DRAFT'],
    ['IN_PROGRESS', 'SCHEDULED'],
    ['COMPLETED', 'DRAFT'],
    ['COMPLETED', 'IN_PROGRESS'],
    ['CANCELLED', 'DRAFT'],
    ['CANCELLED', 'IN_PROGRESS'],
    ['CANCELLED', 'SCHEDULED'],
    ['REOPENED', 'COMPLETED'],
    ['REOPENED', 'SCHEDULED'],
  ];

  describe('allowed transitions', () => {
    for (const [from, to] of allowed) {
      it(`${from} → ${to} is allowed`, () => {
        expect(isAllowedTransition(from, to)).toBe(true);
      });
    }
  });

  describe('forbidden transitions', () => {
    for (const [from, to] of forbidden) {
      it(`${from} → ${to} is forbidden`, () => {
        expect(isAllowedTransition(from, to)).toBe(false);
      });
    }
  });
});

describe('isTaskStatus', () => {
  it('returns true for all valid statuses', () => {
    for (const s of TASK_STATUSES) {
      expect(isTaskStatus(s)).toBe(true);
    }
  });

  it('returns false for unknown string', () => {
    expect(isTaskStatus('FLYING')).toBe(false);
    expect(isTaskStatus('')).toBe(false);
    expect(isTaskStatus('draft')).toBe(false); // case-sensitive
  });
});
