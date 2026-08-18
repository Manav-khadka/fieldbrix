import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../api/client";

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
  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks", "dashboard"],
    queryFn: () => api.get<{ items: TaskItem[]; total: number }>("/tasks?limit=10"),
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
  const reviewPendingCount = Array.isArray(reviewQueue) ? reviewQueue.length : 0;
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
            Enterprise field service oversight, real-time dispatch pulse, and review console
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/tasks" className="fb-btn fb-btn--primary">
            + New Task
          </Link>
          <Link to="/scheduling/calendar" className="fb-btn fb-btn--ghost">
            ↻ Scheduling Calendar
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
            <Link to="/tasks/review-queue" style={{ color: "#d97706", fontWeight: 600 }}>
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
            <Link to="/scheduling/calendar" style={{ color: "#16a34a", fontWeight: 600 }}>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <Link
          to="/tasks/review-queue"
          style={{
            background: "#fff",
            border: "1px solid var(--c-border)",
            borderRadius: "10px",
            padding: "1.25rem",
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: "2rem", background: "#fef3c7", padding: "10px", borderRadius: "10px" }}>
            ✍️
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>Supervisor Review Station</div>
            <div style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
              Verify customer signatures & field evidence
            </div>
          </div>
        </Link>

        <Link
          to="/scheduling/calendar"
          style={{
            background: "#fff",
            border: "1px solid var(--c-border)",
            borderRadius: "10px",
            padding: "1.25rem",
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: "2rem", background: "#f0fdf4", padding: "10px", borderRadius: "10px" }}>
            📅
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>Scheduling & Calendar</div>
            <div style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
              Recurring maintenance & technician dispatch
            </div>
          </div>
        </Link>

        <Link
          to="/workflows"
          style={{
            background: "#fff",
            border: "1px solid var(--c-border)",
            borderRadius: "10px",
            padding: "1.25rem",
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: "2rem", background: "#e0f2fe", padding: "10px", borderRadius: "10px" }}>
            🏗️
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>Workflow Studio</div>
            <div style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
              Multi-section checklists & conditional rules
            </div>
          </div>
        </Link>
      </div>

      {/* Live Operations Feed */}
      <div className="fb-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 className="fb-card-title" style={{ margin: 0 }}>Recent Field Tasks</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--c-text-muted)" }}>
              Live task execution timeline across teams and locations
            </p>
          </div>
          <Link to="/tasks" className="fb-btn fb-btn--ghost" style={{ fontSize: "12px", padding: "4px 10px" }}>
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
                    Loading task feed…
                  </td>
                </tr>
              )}
              {!loadingTasks && tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="fb-table-empty">
                    No tasks created yet. Click "+ New Task" to dispatch your first field work order.
                  </td>
                </tr>
              )}
              {tasks.map((task) => {
                const num = task.number ?? task.taskNumber ?? task.id.slice(0, 8);
                return (
                  <tr key={task.id}>
                    <td>
                      <Link
                        to="/tasks/$id"
                        params={{ id: task.id }}
                        style={{ fontWeight: 700, color: "var(--c-primary)" }}
                      >
                        {num}
                      </Link>
                    </td>
                    <td>{task.description || "Field work order"}</td>
                    <td>
                      <span className={`fb-badge fb-badge--${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`fb-status fb-status--${task.status.toLowerCase().replace(/_/g, "-")}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td>
                      {task.scheduledAt
                        ? new Date(task.scheduledAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
                      {new Date(task.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
