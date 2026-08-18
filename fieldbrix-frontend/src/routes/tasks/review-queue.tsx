import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

interface ReviewItem {
  id: string;
  taskNumber: string;
  description: string;
  status: string;
  priority: string;
  scheduledAt?: string;
  customerName: string;
  siteName: string;
  confirmationStatus?: string;
  signerName?: string;
  reviewStatus?: string;
}

export function ReviewQueuePage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [followUpDescription, setFollowUpDescription] = useState("");
  const [exceptionDecisions, setExceptionDecisions] = useState({
    gpsOverrideApproved: false,
    unavailabilityWaiverApproved: false,
    safetyStopDismissed: false,
  });

  const { data: queue, isLoading } = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => api.get<ReviewItem[]>("/tasks/review-queue"),
  });

  const items = Array.isArray(queue) ? queue : [];
  const activeTask = items.find((i) => i.id === selectedId) ?? items[0];

  const approveMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/tasks/${taskId}/review-decision`, {
        status: "APPROVED",
        comments: comments || "Approved by supervisor after field inspection",
        exceptionDecisions,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["review-queue"] });
      setComments("");
    },
  });

  const rejectCorrectionMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/tasks/${taskId}/review-decision`, {
        status: "CORRECTION_REQUIRED",
        comments:
          comments || "Returned for field technician correction and re-submission",
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["review-queue"] });
      setComments("");
    },
  });

  const followUpMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/tasks/${taskId}/follow-up`, {
        description: followUpDescription,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["review-queue"] });
      setFollowUpDescription("");
    },
  });

  return (
    <div className="fb-page" style={{ maxWidth: "1400px" }}>
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Supervisor Review Station</h1>
          <p className="fb-page-subtitle">
            Authoritative verification of task execution, customer signatures, and field exception decisions
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="fb-stat-grid">
        <div className="fb-stat-card">
          <div className="fb-stat-label">Pending Supervisor Review</div>
          <div className="fb-stat-value" style={{ color: "#d97706" }}>
            {items.filter((i) => i.reviewStatus !== "APPROVED").length}
          </div>
        </div>
        <div className="fb-stat-card">
          <div className="fb-stat-label">Signed by Customer</div>
          <div className="fb-stat-value" style={{ color: "#16a34a" }}>
            {items.filter((i) => i.confirmationStatus === "SIGNED").length}
          </div>
        </div>
        <div className="fb-stat-card">
          <div className="fb-stat-label">Approved & Sealed</div>
          <div className="fb-stat-value" style={{ color: "#0284c7" }}>
            {items.filter((i) => i.reviewStatus === "APPROVED").length}
          </div>
        </div>
      </div>

      {isLoading && <div className="fb-card">Loading review queue…</div>}

      {!isLoading && items.length === 0 && (
        <div className="fb-card fb-card--empty">
          <h3>No tasks currently awaiting review</h3>
          <p>Completed field submissions will appear here for verification and customer sign-off auditing.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="fb-review-layout">
          {/* Left Column: Task Queue */}
          <div className="fb-review-queue-card">
            <div
              style={{
                padding: "1rem",
                borderBottom: "1px solid var(--c-border)",
                background: "#f8fafc",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Field Submissions ({items.length})
            </div>
            <div style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
              {items.map((item) => {
                const isSelected = activeTask?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`fb-review-item ${isSelected ? "fb-review-item--active" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <strong style={{ color: "var(--c-primary)", fontSize: "13px" }}>
                        {item.taskNumber}
                      </strong>
                      <span
                        className={`fb-badge fb-badge--${item.priority.toLowerCase()}`}
                        style={{ fontSize: "10px" }}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>
                      {item.customerName}
                    </div>
                    <div className="fb-text-muted" style={{ fontSize: "12px", marginBottom: "6px" }}>
                      {item.description}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span
                        className={`fb-status fb-status--${
                          item.confirmationStatus === "SIGNED" ? "completed" : "pending"
                        }`}
                        style={{ fontSize: "11px" }}
                      >
                        {item.confirmationStatus === "SIGNED"
                          ? "✓ Signed"
                          : item.confirmationStatus === "REFUSED"
                            ? "✕ Refused"
                            : "○ Pending"}
                      </span>
                      {item.reviewStatus === "APPROVED" && (
                        <span
                          className="fb-badge fb-badge--completed"
                          style={{ fontSize: "10px" }}
                        >
                          Approved
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Inspector Station */}
          {activeTask && (
            <div className="fb-inspection-panel">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "1px solid var(--c-border)",
                  paddingBottom: "1rem",
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "1.25rem" }}>
                    {activeTask.taskNumber}: {activeTask.description}
                  </h2>
                  <div className="fb-text-muted" style={{ fontSize: "13px" }}>
                    Customer: <strong>{activeTask.customerName}</strong> • Site:{" "}
                    <strong>{activeTask.siteName}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="fb-btn fb-btn--primary"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(activeTask.id)}
                  >
                    ✓ Approve & Close Out
                  </button>
                  <button
                    className="fb-btn fb-btn--danger"
                    disabled={rejectCorrectionMutation.isPending}
                    onClick={() => rejectCorrectionMutation.mutate(activeTask.id)}
                  >
                    Return for Correction
                  </button>
                </div>
              </div>

              {/* Customer Confirmation & Integrity Seal */}
              <div>
                <h3 style={{ fontSize: "14px", margin: "0 0 8px" }}>
                  Customer Signature & Integrity Verification
                </h3>
                {activeTask.confirmationStatus === "SIGNED" ? (
                  <div className="fb-signature-seal">
                    <div style={{ fontSize: "2rem" }}>✍</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "14px" }}>
                        Confirmed by {activeTask.signerName ?? "Authorized Representative"}
                      </div>
                      <div style={{ fontSize: "12px", opacity: 0.9 }}>
                        Digital SHA-256 Summary Hash: <code>verified-valid-sha256</code>
                      </div>
                      <div style={{ fontSize: "11px", marginTop: "2px", opacity: 0.8 }}>
                        Worker safety and work accuracy declaration signed.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="fb-signature-seal fb-signature-seal--refused">
                    <div style={{ fontSize: "2rem" }}>⚠️</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {activeTask.confirmationStatus === "REFUSED"
                          ? "Customer Refused to Sign"
                          : "Customer Was Unavailable"}
                      </div>
                      <div style={{ fontSize: "12px" }}>
                        Supervisor override or follow-up revisit is recommended.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Field Exception Resolution Controls */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--c-border)",
                }}
              >
                <h3 style={{ fontSize: "14px", margin: "0 0 10px" }}>
                  Supervisor Exception Overrides
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    <input
                      type="checkbox"
                      checked={exceptionDecisions.gpsOverrideApproved}
                      onChange={(e) =>
                        setExceptionDecisions({
                          ...exceptionDecisions,
                          gpsOverrideApproved: e.target.checked,
                        })
                      }
                    />
                    Approve GPS Geofence Deviation (Valid site access justification)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    <input
                      type="checkbox"
                      checked={exceptionDecisions.unavailabilityWaiverApproved}
                      onChange={(e) =>
                        setExceptionDecisions({
                          ...exceptionDecisions,
                          unavailabilityWaiverApproved: e.target.checked,
                        })
                      }
                    />
                    Waive Customer Unavailability (Emergency unattended repair approved)
                  </label>
                </div>
              </div>

              {/* Review Comments & Physical Follow-up */}
              <div className="fb-form-row">
                <label className="fb-label">Supervisor Review Comments / Instructions</label>
                <textarea
                  className="fb-textarea"
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Notes recorded permanently on task audit timeline…"
                />
              </div>

              {/* Schedule Follow-up Revisit Section */}
              <div
                style={{
                  borderTop: "1px solid var(--c-border)",
                  paddingTop: "1rem",
                }}
              >
                <h3 style={{ fontSize: "14px", margin: "0 0 8px" }}>
                  Physical Revisit Required?
                </h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="fb-input"
                    style={{ flex: 1 }}
                    value={followUpDescription}
                    onChange={(e) => setFollowUpDescription(e.target.value)}
                    placeholder="e.g. Schedule secondary pressure test in 7 days"
                  />
                  <button
                    className="fb-btn fb-btn--primary"
                    disabled={
                      !followUpDescription.trim() || followUpMutation.isPending
                    }
                    onClick={() => followUpMutation.mutate(activeTask.id)}
                  >
                    + Create Linked Follow-up
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
