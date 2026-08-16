import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../../api/client";
import { AssignmentDrawer } from "./assignment-drawer";

interface Task {
  id: string;
  number: string;
  description: string;
  instructions: string;
  status: string;
  priority: string;
  revision: number;
  scheduledAt?: string;
  dueAt?: string;
  workflowVersionId: string;
}
interface HistoryEntry {
  id: string;
  event: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  occurredAt: string;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "PAUSED", "CANCELLED"],
  PAUSED: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS"],
};

export function TaskDetailPage() {
  const { id } = useParams({ from: "/layout/tasks/$id" });
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [showAssign, setShowAssign] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: () => api.get<Task>(`/tasks/${id}`),
  });

  const { data: history } = useQuery({
    queryKey: ["task-history", id],
    queryFn: () => api.get<HistoryEntry[]>(`/tasks/${id}/history`),
  });

  const transitionMutation = useMutation({
    mutationFn: (targetStatus: string) =>
      api.post(`/tasks/${id}/transitions`, {
        targetStatus,
        reason,
        revision: task?.revision,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", id] });
      qc.invalidateQueries({ queryKey: ["task-history", id] });
      setReason("");
    },
  });

  if (isLoading)
    return (
      <div className="fb-page">
        <p className="fb-table-loading">Loading…</p>
      </div>
    );
  if (!task)
    return (
      <div className="fb-page">
        <p className="fb-error">Task not found</p>
      </div>
    );

  const allowedNext = ALLOWED_TRANSITIONS[task.status] ?? [];

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">{task.number}</h1>
          <span
            className={`fb-status fb-status--${task.status.toLowerCase().replace("_", "-")}`}
          >
            {task.status}
          </span>
        </div>
        <div className="fb-page-actions">
          <button
            id="task-assign-toggle"
            className="fb-btn fb-btn--primary"
            onClick={() => setShowAssign((v) => !v)}
          >
            {showAssign ? "Cancel" : "Assign / Reassign"}
          </button>
        </div>
      </div>

      {showAssign && (
        <AssignmentDrawer taskId={id} onClose={() => setShowAssign(false)} />
      )}

      <div className="fb-detail-grid">
        <div className="fb-card">
          <h2 className="fb-card-title">Details</h2>
          <dl className="fb-dl">
            <dt>Description</dt>
            <dd>{task.description || "—"}</dd>
            <dt>Instructions</dt>
            <dd>{task.instructions || "—"}</dd>
            <dt>Priority</dt>
            <dd>{task.priority}</dd>
            <dt>Scheduled</dt>
            <dd>
              {task.scheduledAt
                ? new Date(task.scheduledAt).toLocaleString()
                : "—"}
            </dd>
            <dt>Due</dt>
            <dd>{task.dueAt ? new Date(task.dueAt).toLocaleString() : "—"}</dd>
            <dt>Workflow Version</dt>
            <dd>
              <span className="fb-code">{task.workflowVersionId}</span>
            </dd>
          </dl>
        </div>

        {allowedNext.length > 0 && (
          <div className="fb-card">
            <h2 className="fb-card-title">Transition</h2>
            <div className="fb-form-row">
              <label htmlFor="transition-reason" className="fb-label">
                Reason (optional)
              </label>
              <input
                id="transition-reason"
                type="text"
                className="fb-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for transition…"
              />
            </div>
            <div className="fb-transition-buttons">
              {allowedNext.map((nextStatus) => (
                <button
                  key={nextStatus}
                  id={`transition-to-${nextStatus.toLowerCase()}`}
                  className={`fb-btn ${nextStatus === "CANCELLED" ? "fb-btn--danger" : "fb-btn--primary"}`}
                  onClick={() => transitionMutation.mutate(nextStatus)}
                  disabled={transitionMutation.isPending}
                >
                  → {nextStatus}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fb-card" style={{ marginTop: "1.5rem" }}>
        <h2 className="fb-card-title">History</h2>
        <div className="fb-timeline">
          {history?.map((entry) => (
            <div key={entry.id} className="fb-timeline-entry">
              <span className="fb-timeline-event">{entry.event}</span>
              <span className="fb-timeline-time">
                {new Date(entry.occurredAt).toLocaleString()}
              </span>
              {entry.reason && (
                <p className="fb-timeline-reason">{entry.reason}</p>
              )}
            </div>
          ))}
          {!history?.length && <p className="fb-table-empty">No history yet</p>}
        </div>
      </div>
    </div>
  );
}
