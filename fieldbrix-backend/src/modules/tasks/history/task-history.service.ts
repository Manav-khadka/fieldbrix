import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database/database.service';

type Row = Record<string, unknown>;

@Injectable()
export class TaskHistoryService {
  constructor(private readonly db: DatabaseService) {}

  getHistory(taskId: string): Promise<Row[]> {
    return this.db.tenantQuery<Row>(
      `SELECT id::text AS id,
              event_type AS event,
              before_state AS "before",
              after_state AS "after",
              reason,
              occurred_at AS "occurredAt"
       FROM task_history WHERE task_id = $1::uuid ORDER BY occurred_at DESC`,
      [taskId],
    );
  }

  /** Capacity summary — window: this week, grouped by team */
  async capacity(): Promise<Row> {
    // Real query: count tasks per team in the current ISO week
    const rows = await this.db.tenantQuery<Row>(
      `SELECT
         t.id::text AS "teamId",
         t.name,
         count(ta.id) FILTER (WHERE tk.status NOT IN ('CANCELLED', 'COMPLETED')) AS scheduled,
         count(ta.id) AS total
       FROM teams t
       LEFT JOIN task_assignments ta ON ta.team_id = t.id AND ta.ended_at IS NULL
       LEFT JOIN tasks tk ON tk.id = ta.task_id
         AND tk.scheduled_at >= date_trunc('week', now())
         AND tk.scheduled_at < date_trunc('week', now()) + interval '7 days'
       WHERE t.active = true
       GROUP BY t.id, t.name
       ORDER BY t.name`,
    ).catch(() => []);

    return {
      window: 'This week',
      teams: (rows as Array<{ teamId: string; name: string; scheduled: string | number; total: string | number }>).map((r) => ({
        teamId: r.teamId,
        name: r.name,
        scheduled: Number(r.scheduled ?? 0),
        total: Number(r.total ?? 0),
      })),
    };
  }
}
