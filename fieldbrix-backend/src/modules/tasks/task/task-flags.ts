/**
 * Typed task flags — orthogonal metadata alongside `status`, never a
 * substitute for it (a task can be IN_PROGRESS *and* OVERDUE at once).
 *
 * OVERDUE/ESCALATED are pure functions of `dueAt`/`status`/`now`, so they're
 * computed fresh on every read rather than persisted — a persisted overdue
 * flag goes stale the instant time passes it, regardless of any refresh job.
 * SYNC_PENDING is computed from real outbox dead-letters (see
 * `TaskRepository.findDeadLetteredTaskIds`), the same signal
 * `PlatformRepository.computeSyncHealth` uses for tenant-level sync health.
 *
 * CUSTOMER_UNAVAILABLE and SAFETY_STOP are not computed here: both are
 * worker-reported, execution-time states (customer not present at the
 * visit, rule-engine `safety_stop` action firing during evidence
 * collection) that depend on the mobile execution flow, which doesn't
 * exist yet (Sprint 12/13). Wiring them here would mean inventing a
 * trigger with no real source — left for those sprints.
 */
export type ComputedTaskFlag = 'OVERDUE' | 'ESCALATED' | 'SYNC_PENDING';

const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED']);
const ESCALATION_GRACE_MS = 24 * 60 * 60_000;

export function computeTimeBasedFlags(
  task: { status: string; dueAt: string | null | undefined },
  now: Date = new Date(),
): ComputedTaskFlag[] {
  if (!task.dueAt || TERMINAL_STATUSES.has(task.status)) return [];
  const dueAtMs = new Date(task.dueAt).getTime();
  if (Number.isNaN(dueAtMs) || now.getTime() <= dueAtMs) return [];
  const flags: ComputedTaskFlag[] = ['OVERDUE'];
  if (now.getTime() - dueAtMs > ESCALATION_GRACE_MS) flags.push('ESCALATED');
  return flags;
}

/**
 * Merges computed flags with whatever is already persisted in
 * `tasks.flags` (an explicit-write channel other flag sources can use in
 * the future) without duplicating entries.
 */
export function mergeTaskFlags(
  storedFlags: unknown,
  computedFlags: ComputedTaskFlag[],
): string[] {
  const stored = Array.isArray(storedFlags)
    ? storedFlags.filter((f): f is string => typeof f === 'string')
    : [];
  return [...new Set([...stored, ...computedFlags])];
}
