import { useQuery } from "@tanstack/react-query";
import { Pagination } from "../components/ui/Pagination";
import { usePaginationState } from "../components/ui/pagination-state";
import { Link } from "@tanstack/react-router";
import { api } from "../api/client";
import {
  PlusIcon,
  CalendarIcon,
  ReviewQueueIcon,
  WorkflowIcon,
} from "../components/icons";

interface TaskItem {
  id: string;
  number?: string;
  taskNumber?: string;
  description: string;
  status: string;
  priority: string;
  scheduledAt?: string;
  createdAt: string;
}

interface ReviewItem {
  id: string;
}

interface RecurrencePlan {
  id: string;
  active: boolean;
}

export function OverviewPage() {
  const pagination = usePaginationState(10);
  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: [
      "tasks",
      "dashboard",
      { page: pagination.page, limit: pagination.pageSize },
    ],
    queryFn: () =>
      api.get<{
        items: TaskItem[];
        total: number;
        page: number;
        limit: number;
      }>(`/tasks?page=${pagination.page}&limit=${pagination.pageSize}`),
    placeholderData: (previous) => previous,
    retry: false,
  });

  const { data: reviewQueue } = useQuery({
    queryKey: ["review-queue", "dashboard"],
    queryFn: () => api.get<ReviewItem[]>("/tasks/review-queue"),
    retry: false,
  });

  const { data: recurrences } = useQuery({
    queryKey: ["recurrences", "dashboard"],
    queryFn: () => api.get<RecurrencePlan[]>("/recurrences"),
    retry: false,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers", "count"],
    queryFn: () => api.get<{ total: number }>("/customers?limit=1"),
    retry: false,
  });

  const { data: workflows } = useQuery({
    queryKey: ["workflows", "count"],
    queryFn: () => api.get<{ total: number }>("/workflows?limit=1"),
    retry: false,
  });

  const tasks = tasksData?.items ?? [];
  const totalTasks = tasksData?.total ?? 0;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "ASSIGNED",
  ).length;
  const reviewPendingCount = Array.isArray(reviewQueue)
    ? reviewQueue.length
    : 0;
  const activeRecurrencesCount = Array.isArray(recurrences)
    ? recurrences.filter((r) => r.active).length
    : 0;

  return (
    <div className="fb-page" style={{ maxWidth: "1400px" }}>
      {/* Header */}
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Operations Command Center</h1>
          <p className="fb-page-subtitle">
            Enterprise field service oversight, real-time dispatch pulse, and
            review console
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/tasks" className="fb-btn fb-btn-primary">
            <PlusIcon size={16} />
            <span>New Task</span>
          </Link>
          <Link to="/scheduling/calendar" className="fb-btn fb-btn-secondary">
            <CalendarIcon size={16} />
            <span>Scheduling Calendar</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Stat Grid */}
      <div className="fb-stat-grid">
        <div className="fb-stat-card">
          <div className="fb-stat-label">Active Field Dispatches</div>
          <div className="fb-stat-value" style={{ color: "#0284c7" }}>
            {inProgressTasks}
          </div>
          <div style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
            Total tasks in system: {totalTasks}
          </div>
        </div>

        <div className="fb-stat-card">
          <div className="fb-stat-label">Awaiting Supervisor Review</div>
          <div className="fb-stat-value" style={{ color: "#d97706" }}>
            {reviewPendingCount}
          </div>
          <div style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
            <Link
              to="/tasks/review-queue"
              style={{ color: "#d97706", fontWeight: 600 }}
            >
              Open Review Station →
            </Link>
          </div>
        </div>

        <div className="fb-stat-card">
          <div className="fb-stat-label">Active Recurring Plans</div>
          <div className="fb-stat-value" style={{ color: "#16a34a" }}>
            {activeRecurrencesCount}
          </div>
          <div style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
            <Link
              to="/scheduling/calendar"
              style={{ color: "#16a34a", fontWeight: 600 }}
            >
              View Schedule Matrix →
            </Link>
          </div>
        </div>

        <div className="fb-stat-card">
          <div className="fb-stat-label">Master Catalog</div>
          <div className="fb-stat-value" style={{ color: "#475569" }}>
            {customers?.total ?? 0}
          </div>
          <div style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
            {workflows?.total ?? 0} published workflows
          </div>
        </div>
      </div>

      {/* Quick Access Launchpad */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <Link
          to="/tasks/review-queue"
          className="fb-card fb-card-interactive"
          style={{
            padding: "1.25rem",
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              background: "#fef3c7",
              borderRadius: "var(--fb-radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#92400e",
              flexShrink: 0,
            }}
          >
            <ReviewQueueIcon size={22} />
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "15px",
                color: "var(--fb-slate-900)",
              }}
            >
              Supervisor Review Station
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--fb-slate-500)",
                marginTop: "2px",
              }}
            >
              Verify customer signatures & field evidence
            </div>
          </div>
        </Link>

        <Link
          to="/scheduling/calendar"
          className="fb-card fb-card-interactive"
          style={{
            padding: "1.25rem",
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              background: "#f0fdf4",
              borderRadius: "var(--fb-radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#166534",
              flexShrink: 0,
            }}
          >
            <CalendarIcon size={22} />
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "15px",
                color: "var(--fb-slate-900)",
              }}
            >
              Scheduling & Calendar
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--fb-slate-500)",
                marginTop: "2px",
              }}
            >
              Recurring maintenance & technician dispatch
            </div>
          </div>
        </Link>

        <Link
          to="/workflows"
          className="fb-card fb-card-interactive"
          style={{
            padding: "1.25rem",
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              background: "#e0f2fe",
              borderRadius: "var(--fb-radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0369a1",
              flexShrink: 0,
            }}
          >
            <WorkflowIcon size={22} />
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "15px",
                color: "var(--fb-slate-900)",
              }}
            >
              Workflow Studio
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--fb-slate-500)",
                marginTop: "2px",
              }}
            >
              Multi-section checklists & conditional rules
            </div>
          </div>
        </Link>
      </div>

      {/* Live Operations Feed */}
      <div className="fb-card" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h2 className="fb-card-title" style={{ margin: 0 }}>
              Recent Field Tasks
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "var(--c-text-muted)",
              }}
            >
              Live task execution timeline across teams and locations
            </p>
          </div>
          <Link to="/tasks" className="fb-btn fb-btn-ghost fb-btn-sm">
            View All Tasks →
          </Link>
        </div>

        <div className="fb-table-container" style={{ margin: 0 }}>
          <table className="fb-table">
            <thead>
              <tr>
                <th>Task Number</th>
                <th>Description</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Scheduled At</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loadingTasks && (
                <tr>
                  <td colSpan={6} className="fb-table-loading">
                    Loading recent dispatches…
                  </td>
                </tr>
              )}

              {!loadingTasks && tasks.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "var(--c-text-muted)",
                    }}
                  >
                    No field tasks recorded yet. Create a task to start tracking
                    work.
                  </td>
                </tr>
              )}

              {!loadingTasks &&
                tasks.map((task) => {
                  const displayNum =
                    task.taskNumber || task.number || task.id.slice(0, 8);
                  return (
                    <tr key={task.id}>
                      <td>
                        <Link
                          to={`/tasks/${task.id}` as any}
                          style={{
                            fontWeight: 600,
                            color: "var(--fb-brand-indigo)",
                            textDecoration: "none",
                            fontFamily: "var(--fb-font-mono)",
                            fontSize: "13px",
                          }}
                        >
                          {displayNum}
                        </Link>
                      </td>
                      <td>{task.description}</td>
                      <td>
                        <span
                          className={`fb-status fb-status--${task.priority.toLowerCase()}`}
                          style={{ fontSize: "11px" }}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`fb-status fb-status--${task.status.toLowerCase()}`}
                          style={{ fontSize: "11px" }}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {task.scheduledAt
                          ? new Date(task.scheduledAt).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td
                        style={{
                          fontSize: "12px",
                          color: "var(--c-text-muted)",
                        }}
                      >
                        {new Date(task.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={totalTasks}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={[5, 10, 20]}
            disabled={loadingTasks}
            label="Recent field tasks pagination"
          />
        </div>
      </div>
    </div>
  );
}
