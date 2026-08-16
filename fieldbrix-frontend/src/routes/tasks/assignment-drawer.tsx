import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

interface UserOption {
  id: string;
  name: string;
  email: string;
}
interface TeamOption {
  id: string;
  name: string;
  active: boolean;
}
interface CurrentAssignment {
  workerId: string | null;
  teamId: string | null;
  lead: boolean;
}

export function AssignmentDrawer({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [workerId, setWorkerId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [lead, setLead] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const prefilled = useRef(false);

  const { data: users } = useQuery({
    queryKey: ["users", "for-assignment-drawer"],
    queryFn: () => api.get<{ data: UserOption[] }>("/users?limit=100"),
  });
  const { data: teams } = useQuery({
    queryKey: ["teams", "for-assignment-drawer"],
    queryFn: () => api.get<{ data: TeamOption[] }>("/teams?limit=100"),
  });
  const activeTeams = (teams?.data ?? []).filter((t) => t.active);

  const { data: current } = useQuery({
    queryKey: ["task-assignment", taskId],
    queryFn: () =>
      api.get<CurrentAssignment | null>(`/tasks/${taskId}/assignments`),
  });

  // Pre-fill from the task's current assignment exactly once, the first
  // time it loads — after that, further updates to `current` (e.g. from a
  // background refetch) must never silently overwrite what the user is
  // actively editing in the form.
  useEffect(() => {
    if (prefilled.current || current === undefined) return;
    prefilled.current = true;
    if (!current) return;
    setWorkerId(current.workerId ?? "");
    setTeamId(current.teamId ?? "");
    setLead(current.lead);
  }, [current]);

  const assignMutation = useMutation({
    mutationFn: () =>
      api.post(
        `/tasks/${taskId}/assignments`,
        {
          workerId: workerId || undefined,
          teamId: teamId || undefined,
          lead,
          reason: reason || undefined,
        },
        crypto.randomUUID(),
      ),
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ["task", taskId] });
      await qc.invalidateQueries({ queryKey: ["task-history", taskId] });
      await qc.invalidateQueries({ queryKey: ["task-assignment", taskId] });
      onClose();
    },
    onError: (err) => {
      setError(
        (err as { message?: string }).message ?? "Failed to assign task",
      );
    },
  });

  const canSubmit = Boolean(workerId || teamId);

  return (
    <div className="fb-card" role="dialog" aria-label="Assign task">
      <h2 className="fb-card-title">
        {current ? "Reassign task" : "Assign task"}
      </h2>

      <div className="fb-form-row">
        <label htmlFor="assign-worker" className="fb-label">
          Worker
        </label>
        <select
          id="assign-worker"
          className="fb-select"
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
        >
          <option value="">No individual worker</option>
          {users?.data.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </div>

      <div className="fb-form-row">
        <label htmlFor="assign-team" className="fb-label">
          Team
        </label>
        <select
          id="assign-team"
          className="fb-select"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">No team</option>
          {activeTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {!canSubmit && (
        <span className="fb-hint">Select a worker and/or a team.</span>
      )}

      <div className="fb-form-row">
        <label htmlFor="assign-lead" className="fb-checkbox-row">
          <input
            id="assign-lead"
            type="checkbox"
            checked={lead}
            onChange={(e) => setLead(e.target.checked)}
          />
          Responsible lead (final submission authority)
        </label>
      </div>

      <div className="fb-form-row">
        <label htmlFor="assign-reason" className="fb-label">
          Reason (optional)
        </label>
        <input
          id="assign-reason"
          type="text"
          className="fb-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for this assignment…"
        />
      </div>

      {error && <div className="fb-error">{error}</div>}

      <div className="fb-page-actions">
        <button
          id="assignment-submit"
          type="button"
          className="fb-btn fb-btn--primary"
          disabled={!canSubmit || assignMutation.isPending}
          onClick={() => assignMutation.mutate()}
        >
          {assignMutation.isPending ? "Assigning…" : "Assign"}
        </button>
        <button
          id="assignment-cancel"
          type="button"
          className="fb-btn fb-btn--ghost"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
