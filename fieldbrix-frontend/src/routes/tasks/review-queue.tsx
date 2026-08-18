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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [followUpDescription, setFollowUpDescription] = useState("");

  const { data: queue, isLoading } = useQuery({
    queryKey: ["review-queue"],
    queryFn: () => api.get<ReviewItem[]>("/tasks/review-queue"),
  });

  const items = Array.isArray(queue) ? queue : [];

  const approveMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/tasks/${taskId}/review-decision`, {
        status: "APPROVED",
        comments: comments || "Approved by supervisor",
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["review-queue"] });
      setSelectedTaskId(null);
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
      setSelectedTaskId(null);
      setFollowUpDescription("");
    },
  });

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Supervisor Review & Signatures</h1>
          <p className="fb-page-subtitle">
            Review completed field tasks, customer signatures, and exception approvals
          </p>
        </div>
      </div>

      <div className="fb-table-container">
        <table className="fb-table">
          <thead>
            <tr>
              <th>Task #</th>
              <th>Customer & Site</th>
              <th>Description</th>
              <th>Customer Signoff</th>
              <th>Review Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="fb-table-loading">
                  Loading review queue…
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="fb-table-empty">
                  No completed tasks awaiting supervisor review.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.taskNumber}</strong>
                </td>
                <td>
                  <div>{item.customerName}</div>
                  <div className="fb-text-muted" style={{ fontSize: "12px" }}>
                    {item.siteName}
                  </div>
                </td>
                <td>{item.description}</td>
                <td>
                  <span
                    className={`fb-status fb-status--${
                      item.confirmationStatus === "SIGNED"
                        ? "completed"
                        : "pending"
                    }`}
                  >
                    {item.confirmationStatus
                      ? `${item.confirmationStatus} (${item.signerName ?? "Customer"})`
                      : "Pending Confirmation"}
                  </span>
                </td>
                <td>
                  <span
                    className={`fb-badge fb-badge--${
                      item.reviewStatus === "APPROVED"
                        ? "completed"
                        : "in_progress"
                    }`}
                  >
                    {item.reviewStatus ?? "AWAITING_REVIEW"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="fb-btn fb-btn--primary"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={() => approveMutation.mutate(item.id)}
                      disabled={approveMutation.isPending}
                    >
                      Approve
                    </button>
                    <button
                      className="fb-btn fb-btn--ghost"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={() =>
                        setSelectedTaskId(
                          selectedTaskId === item.id ? null : item.id,
                        )
                      }
                    >
                      + Follow-up
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTaskId && (
        <div className="fb-form-card" style={{ marginTop: "24px" }}>
          <h3 className="fb-card-title">Schedule Follow-up Physical Revisit</h3>
          <div className="fb-form-row">
            <label className="fb-label">Follow-up Reason / Scope</label>
            <input
              type="text"
              className="fb-input"
              value={followUpDescription}
              onChange={(e) => setFollowUpDescription(e.target.value)}
              placeholder="e.g. Return to inspect replacement seal after 48 hours"
            />
          </div>
          <div className="fb-form-actions">
            <button
              type="button"
              className="fb-btn fb-btn--ghost"
              onClick={() => setSelectedTaskId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="fb-btn fb-btn--primary"
              onClick={() => followUpMutation.mutate(selectedTaskId)}
              disabled={
                !followUpDescription.trim() || followUpMutation.isPending
              }
            >
              Create Follow-up Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
