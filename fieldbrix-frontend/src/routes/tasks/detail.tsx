import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
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
  customerId?: string;
  siteId?: string;
  flags?: string[];
}

interface TaskAssignment {
  id: string;
  workerId?: string;
  teamId?: string;
  lead: boolean;
  reason?: string;
  startedAt: string;
}

interface CustomerConfirmation {
  id: string;
  status: string;
  signerName?: string;
  signerDesignation?: string;
  summaryHash: string;
  confirmedAt: string;
}

interface TaskRun {
  id: string;
  status: string;
  workerId?: string;
  startedAt: string;
  completedAt?: string;
  answers?: Array<{ sectionId: string; fieldKey: string; value: any }>;
  parts?: Array<{ partId: string; quantity: number; serialNumber?: string }>;
  evidence?: Array<{ uploadId: string; caption?: string }>;
}

interface HistoryEntry {
  id: string;
  event: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  occurredAt: string;
}

const FLAG_LABELS: Record<string, string> = {
  OVERDUE: "Overdue",
  ESCALATED: "Escalated",
  SYNC_PENDING: "Sync pending",
  CUSTOMER_UNAVAILABLE: "Customer unavailable",
  SAFETY_STOP: "Safety stop",
};

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
  const [activeTab, setActiveTab] = useState<"DETAILS" | "RUNS" | "HISTORY">("DETAILS");

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: () => api.get<Task>(`/tasks/${id}`),
  });

  const { data: assignments } = useQuery({
    queryKey: ["task-assignments", id],
    queryFn: () => api.get<TaskAssignment[]>(`/tasks/${id}/assignments`),
  });

  const { data: history } = useQuery({
    queryKey: ["task-history", id],
    queryFn: () => api.get<HistoryEntry[]>(`/tasks/${id}/history`),
  });

  const { data: runs } = useQuery({
    queryKey: ["task-runs", id],
    queryFn: () => api.get<TaskRun[]>(`/tasks/${id}/runs`),
  });

  const { data: confirmation } = useQuery({
    queryKey: ["task-confirmation", id],
    queryFn: () => api.get<CustomerConfirmation>(`/tasks/${id}/confirmation`),
    retry: false,
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

  if (isLoading) {
    return (
      <div className="fb-page">
        <p className="fb-table-loading">Loading task details…</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fb-page">
        <p className="fb-error">Task not found</p>
      </div>
    );
  }

  const allowedNext = ALLOWED_TRANSITIONS[task.status] ?? [];
  const assignmentList = Array.isArray(assignments) ? assignments : [];
  const leadAssignment = assignmentList.find((a) => a.lead) ?? assignmentList[0];
  const runList = Array.isArray(runs) ? runs : [];

  return (
    <div className="fb-page" style={{ maxWidth: "1400px" }}>
      {/* Header */}
      <div className="fb-page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 className="fb-page-title">{task.number}</h1>
            <span
              className={`fb-status fb-status--${task.status.toLowerCase().replace(/_/g, "-")}`}
            >
              {task.status}
            </span>
            <span className={`fb-badge fb-badge--${task.priority.toLowerCase()}`}>
              {task.priority} Priority
            </span>
          </div>

          <p className="fb-page-subtitle" style={{ margin: 0 }}>
            {task.description || "Field Service Task"}
          </p>

          {task.flags && task.flags.length > 0 && (
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              {task.flags.map((flag) => (
                <span
                  key={flag}
                  className={`fb-flag fb-flag--${flag.toLowerCase().replace(/_/g, "-")}`}
                >
                  {FLAG_LABELS[flag] ?? flag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="fb-page-actions">
          <button
            id="task-assign-toggle"
            className="fb-btn fb-btn--primary"
            onClick={() => setShowAssign((v) => !v)}
          >
            {showAssign ? "Cancel" : "Assign / Reassign Dispatch"}
          </button>
        </div>
      </div>

      {showAssign && (
        <AssignmentDrawer taskId={id} onClose={() => setShowAssign(false)} />
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--c-border)", marginBottom: "1.5rem" }}>
        <button
          className={`fb-btn ${activeTab === "DETAILS" ? "fb-btn--primary" : "fb-btn--ghost"}`}
          style={{ borderRadius: "6px 6px 0 0", borderBottom: "none" }}
          onClick={() => setActiveTab("DETAILS")}
        >
          Task Overview & Dispatch
        </button>
        <button
          className={`fb-btn ${activeTab === "RUNS" ? "fb-btn--primary" : "fb-btn--ghost"}`}
          style={{ borderRadius: "6px 6px 0 0", borderBottom: "none" }}
          onClick={() => setActiveTab("RUNS")}
        >
          Execution Runs & Evidence ({runList.length})
        </button>
        <button
          className={`fb-btn ${activeTab === "HISTORY" ? "fb-btn--primary" : "fb-btn--ghost"}`}
          style={{ borderRadius: "6px 6px 0 0", borderBottom: "none" }}
          onClick={() => setActiveTab("HISTORY")}
        >
          Audit History Timeline
        </button>
      </div>

      {activeTab === "DETAILS" && (
        <div className="fb-detail-grid">
          {/* Main Info Card */}
          <div className="fb-card">
            <h2 className="fb-card-title">Task Specification</h2>
            <dl className="fb-dl">
              <dt>Instructions</dt>
              <dd>{task.instructions || "Standard procedure applies."}</dd>

              <dt>Scheduled Date</dt>
              <dd>
                {task.scheduledAt
                  ? new Date(task.scheduledAt).toLocaleString()
                  : "Not scheduled"}
              </dd>

              <dt>Due Date (SLA)</dt>
              <dd>
                {task.dueAt
                  ? new Date(task.dueAt).toLocaleString()
                  : "Standard SLA"}
              </dd>

              <dt>Workflow Schema</dt>
              <dd>
                <Link
                  to="/workflows"
                  style={{ color: "var(--c-accent-blue)", fontWeight: 600 }}
                >
                  Version {task.workflowVersionId?.slice(0, 8)}…
                </Link>
              </dd>

              <dt>Assigned Lead Tech</dt>
              <dd>
                {leadAssignment ? (
                  <span style={{ fontWeight: 600, color: "var(--c-primary)" }}>
                    Technician {leadAssignment.workerId?.slice(0, 8)} (Lead)
                  </span>
                ) : (
                  <span style={{ color: "var(--c-text-muted)" }}>Unassigned</span>
                )}
              </dd>
            </dl>
          </div>

          {/* Customer Signature & Confirmation Status Card */}
          <div className="fb-card">
            <h2 className="fb-card-title">Customer Sign-Off & Verification Seal</h2>
            {confirmation ? (
              <div className="fb-signature-seal">
                <div style={{ fontSize: "2rem" }}>✍️</div>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    Signed by {confirmation.signerName || "Authorized Representative"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#166534" }}>
                    Status: <strong>{confirmation.status}</strong> • Confirmed on {new Date(confirmation.confirmedAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>
                    Summary Hash: <code>{confirmation.summaryHash?.slice(0, 16)}…</code>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px dashed var(--c-border)", textAlign: "center", color: "var(--c-text-muted)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>⏳</div>
                <div style={{ fontWeight: 600 }}>Customer sign-off pending</div>
                <div style={{ fontSize: "12px" }}>Will be captured upon field job completion.</div>
              </div>
            )}

            {/* State Transition Actions */}
            {allowedNext.length > 0 && (
              <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--c-border)", paddingTop: "1rem" }}>
                <h3 style={{ fontSize: "14px", margin: "0 0 8px" }}>Dispatch & Lifecycle Actions</h3>
                <div className="fb-form-row">
                  <input
                    type="text"
                    className="fb-input"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason / Notes for status change…"
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
                      → Advance to {nextStatus}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "RUNS" && (
        <div className="fb-card">
          <h2 className="fb-card-title">Field Execution Sessions</h2>
          {runList.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--c-text-muted)" }}>
              No execution runs logged yet. Once the technician opens the job on mobile and checks in, live checklist answers will stream here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {runList.map((run, idx) => (
                <div key={run.id} style={{ border: "1px solid var(--c-border)", borderRadius: "8px", padding: "1rem", background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <strong>Run #{idx + 1} ({run.status})</strong>
                    <span style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
                      Started: {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--c-text)" }}>
                    Technician Check-In: <code>{run.workerId?.slice(0, 8) ?? "Field Worker"}</code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "HISTORY" && (
        <div className="fb-card">
          <h2 className="fb-card-title">Immutable Audit Trail</h2>
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
            {!history?.length && <p className="fb-table-empty">No history recorded yet</p>}
          </div>
        </div>
      )}
    </div>
  );
}
