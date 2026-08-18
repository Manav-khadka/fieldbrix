import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { RecurrenceForm } from "./recurrence-form";

interface RecurrencePlan {
  id: string;
  name: string;
  frequency: string;
  intervalCount: number;
  lookaheadDays: number;
  priority: string;
  active: boolean;
  startDate: string;
  endDate?: string;
  instructions?: string;
  createdAt: string;
}

interface TaskItem {
  id: string;
  taskNumber: string;
  description: string;
  status: string;
  priority: string;
  scheduledAt?: string;
}

export function SchedulingCalendarPage() {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<"MONTH" | "SERIES">("MONTH");
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [creating, setCreating] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<{
    planId: string;
    planName: string;
    date: string;
  } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");

  const { data: recurrences, isLoading: loadingPlans } = useQuery({
    queryKey: ["recurrences"],
    queryFn: () => api.get<RecurrencePlan[]>("/recurrences"),
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", "for-calendar"],
    queryFn: () =>
      api.get<{ items: TaskItem[] }>("/tasks?limit=100"),
  });

  const plans = Array.isArray(recurrences) ? recurrences : [];
  const tasks = tasksData?.items ?? [];

  const exceptionMutation = useMutation({
    mutationFn: (payload: {
      planId: string;
      occurrenceDate: string;
      action: "SKIP" | "RESCHEDULE";
      newDate?: string;
      reason: string;
    }) =>
      api.post(`/recurrences/${payload.planId}/exceptions`, {
        occurrenceDate: payload.occurrenceDate,
        action: payload.action,
        newDate: payload.newDate,
        reason: payload.reason,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recurrences"] });
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      setSelectedOccurrence(null);
      setRescheduleDate("");
      setExceptionReason("");
    },
  });

  // Calendar math
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const totalDays = lastDayOfMonth.getDate();

  const prevMonth = () =>
    setCurrentMonthDate(new Date(year, month - 1, 1));
  const nextMonth = () =>
    setCurrentMonthDate(new Date(year, month + 1, 1));

  const monthName = firstDayOfMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const calendarCells = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push({ dayNumber: null, dateStr: "" });
  }
  for (let day = 1; day <= totalDays; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarCells.push({ dayNumber: day, dateStr: dStr });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Scheduling & Maintenance Dispatch</h1>
          <p className="fb-page-subtitle">
            Manage enterprise recurring maintenance series, occurrence calendar, and SLA dispatch
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div
            style={{
              display: "inline-flex",
              background: "#e2e8f0",
              borderRadius: "8px",
              padding: "2px",
            }}
          >
            <button
              className={`fb-btn ${viewMode === "MONTH" ? "fb-btn--primary" : "fb-btn--ghost"}`}
              style={{ padding: "4px 12px", fontSize: "13px" }}
              onClick={() => setViewMode("MONTH")}
            >
              Month View
            </button>
            <button
              className={`fb-btn ${viewMode === "SERIES" ? "fb-btn--primary" : "fb-btn--ghost"}`}
              style={{ padding: "4px 12px", fontSize: "13px" }}
              onClick={() => setViewMode("SERIES")}
            >
              Recurring Series ({plans.length})
            </button>
          </div>
          <button
            id="recurrence-add"
            className="fb-btn fb-btn--primary"
            onClick={() => setCreating((open) => !open)}
          >
            {creating ? "Cancel" : "+ New Recurring Series"}
          </button>
        </div>
      </div>

      {/* Operational KPI Cards */}
      <div className="fb-stat-grid">
        <div className="fb-stat-card">
          <div className="fb-stat-label">Active Recurring Series</div>
          <div className="fb-stat-value">{plans.filter((p) => p.active).length}</div>
        </div>
        <div className="fb-stat-card">
          <div className="fb-stat-label">Dispatched Tasks</div>
          <div className="fb-stat-value" style={{ color: "#0284c7" }}>
            {tasks.filter((t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS").length}
          </div>
        </div>
        <div className="fb-stat-card">
          <div className="fb-stat-label">Scheduled This Window</div>
          <div className="fb-stat-value" style={{ color: "#10b981" }}>
            {tasks.length}
          </div>
        </div>
      </div>

      {creating && <RecurrenceForm onDone={() => setCreating(false)} />}

      {viewMode === "MONTH" ? (
        <div className="fb-calendar-container">
          <div className="fb-calendar-header">
            <div className="fb-calendar-nav-title">{monthName}</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="fb-btn fb-btn--ghost"
                style={{ padding: "4px 10px" }}
                onClick={prevMonth}
              >
                ◀ Prev
              </button>
              <button
                className="fb-btn fb-btn--ghost"
                style={{ padding: "4px 10px" }}
                onClick={() => setCurrentMonthDate(new Date())}
              >
                Today
              </button>
              <button
                className="fb-btn fb-btn--ghost"
                style={{ padding: "4px 10px" }}
                onClick={nextMonth}
              >
                Next ▶
              </button>
            </div>
          </div>

          <div className="fb-calendar-grid-header">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          <div className="fb-calendar-grid">
            {calendarCells.map((cell, idx) => {
              if (!cell.dayNumber) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="fb-calendar-day fb-calendar-day--outside"
                  />
                );
              }

              const isToday = cell.dateStr === todayStr;
              const matchingTasks = tasks.filter(
                (t) => t.scheduledAt && t.scheduledAt.startsWith(cell.dateStr),
              );

              return (
                <div
                  key={cell.dateStr}
                  className={`fb-calendar-day ${isToday ? "fb-calendar-day--today" : ""}`}
                >
                  <div className="fb-calendar-day-header">
                    <span
                      className="fb-calendar-day-number"
                      style={
                        isToday
                          ? {
                              background: "#16a34a",
                              color: "#fff",
                              padding: "2px 6px",
                              borderRadius: "9999px",
                            }
                          : {}
                      }
                    >
                      {cell.dayNumber}
                    </span>
                  </div>

                  {matchingTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`fb-calendar-chip ${
                        t.priority === "CRITICAL"
                          ? "fb-calendar-chip--critical"
                          : t.priority === "HIGH"
                            ? "fb-calendar-chip--high"
                            : ""
                      }`}
                      title={`${t.taskNumber}: ${t.description}`}
                    >
                      {t.taskNumber} • {t.description}
                    </div>
                  ))}

                  {/* Occurrence generator preview */}
                  {plans
                    .filter((p) => p.active)
                    .map((p) => (
                      <div
                        key={`plan-${p.id}-${cell.dateStr}`}
                        className="fb-calendar-chip"
                        style={{
                          background: "#f0fdf4",
                          color: "#166534",
                          borderLeftColor: "#22c55e",
                        }}
                        onClick={() =>
                          setSelectedOccurrence({
                            planId: p.id,
                            planName: p.name,
                            date: cell.dateStr,
                          })
                        }
                        title={`Click to manage recurring occurrence: ${p.name}`}
                      >
                        ↻ {p.name}
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="fb-table-container">
          <table className="fb-table">
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Frequency</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Lookahead Days</th>
              </tr>
            </thead>
            <tbody>
              {loadingPlans && (
                <tr>
                  <td colSpan={7} className="fb-table-loading">
                    Loading recurring series…
                  </td>
                </tr>
              )}
              {!loadingPlans && plans.length === 0 && (
                <tr>
                  <td colSpan={7} className="fb-table-empty">
                    No recurring series found.
                  </td>
                </tr>
              )}
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>
                    <span className="fb-badge">
                      {p.frequency} (Every {p.intervalCount || 1})
                    </span>
                  </td>
                  <td>
                    <span className={`fb-badge fb-badge--${p.priority.toLowerCase()}`}>
                      {p.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`fb-status fb-status--${p.active ? "active" : "cancelled"}`}
                    >
                      {p.active ? "Active Series" : "Paused"}
                    </span>
                  </td>
                  <td>{p.startDate}</td>
                  <td>{p.endDate ?? "Indefinite"}</td>
                  <td>{p.lookaheadDays} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Occurrence Exception Modal */}
      {selectedOccurrence && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            className="fb-form-card"
            style={{ width: "450px", margin: "0", background: "#fff" }}
          >
            <h3 className="fb-card-title">Manage Recurring Occurrence</h3>
            <p className="fb-card-subtitle" style={{ margin: "0 0 16px" }}>
              <strong>{selectedOccurrence.planName}</strong> on{" "}
              {selectedOccurrence.date}
            </p>

            <div className="fb-form-row">
              <label className="fb-label">Reschedule Date</label>
              <input
                type="date"
                className="fb-input"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>

            <div className="fb-form-row">
              <label className="fb-label">Reason for Exception *</label>
              <input
                type="text"
                className="fb-input"
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="e.g. Customer site closed for holiday"
              />
            </div>

            <div
              className="fb-form-actions"
              style={{ justifyContent: "space-between" }}
            >
              <button
                type="button"
                className="fb-btn fb-btn--danger"
                disabled={
                  !exceptionReason.trim() || exceptionMutation.isPending
                }
                onClick={() =>
                  exceptionMutation.mutate({
                    planId: selectedOccurrence.planId,
                    occurrenceDate: selectedOccurrence.date,
                    action: "SKIP",
                    reason: exceptionReason,
                  })
                }
              >
                Skip Occurrence
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="fb-btn fb-btn--ghost"
                  onClick={() => setSelectedOccurrence(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="fb-btn fb-btn--primary"
                  disabled={
                    !rescheduleDate ||
                    !exceptionReason.trim() ||
                    exceptionMutation.isPending
                  }
                  onClick={() =>
                    exceptionMutation.mutate({
                      planId: selectedOccurrence.planId,
                      occurrenceDate: selectedOccurrence.date,
                      action: "RESCHEDULE",
                      newDate: rescheduleDate,
                      reason: exceptionReason,
                    })
                  }
                >
                  Reschedule Date
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
