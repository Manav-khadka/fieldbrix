/**
 * Single authoritative task transition map.
 * Used by both TaskTransitionService and its unit tests.
 * Add new statuses/edges here — nowhere else.
 */
export const TASK_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'ASSIGNED',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
  'REOPENED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * Allowed target statuses for each source status.
 * Key: current status. Value: set of valid next statuses.
 */
export const TRANSITION_MAP: Readonly<
  Record<TaskStatus, readonly TaskStatus[]>
> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'PAUSED', 'CANCELLED'],
  PAUSED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['REOPENED'],
  CANCELLED: [],
  REOPENED: ['IN_PROGRESS'],
} as const;

export function isAllowedTransition(from: TaskStatus, to: TaskStatus): boolean {
  return (TRANSITION_MAP[from] as readonly string[]).includes(to);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}
