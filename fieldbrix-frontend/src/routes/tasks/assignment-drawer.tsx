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
interface WorkforcePerson extends UserOption {
  jobTitle: string;
  canReceiveTasks: boolean;
  canAssignTasks: boolean;
  canVerifyTasks: boolean;
}
interface WorkforceDepartment extends TeamOption {
  departmentLabel: string;
  qualityReviewerIds: string[];
}
interface CurrentAssignment {
  workerId: string | null;
  teamId: string | null;
  lead: boolean;
  supervisorIds?: string[];
  verificationMode?: "AUTO" | "MANUAL_SUPERVISOR" | "QUALITY_DEPARTMENT";
  requiredApprovals?: number;
  qualityTeamId?: string | null;
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
  const [supervisorIds, setSupervisorIds] = useState<string[]>([]);
  const [verificationMode, setVerificationMode] = useState<
    "AUTO" | "MANUAL_SUPERVISOR" | "QUALITY_DEPARTMENT"
  >("MANUAL_SUPERVISOR");
  const [requiredApprovals, setRequiredApprovals] = useState(1);
  const [qualityTeamId, setQualityTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const prefilled = useRef(false);

  const { data: users } = useQuery({
    queryKey: ["users", "for-assignment-drawer"],
    queryFn: () =>
      api.get<UserOption[] | { data: UserOption[] }>("/users?limit=100"),
  });
  const { data: teams } = useQuery({
    queryKey: ["teams", "for-assignment-drawer"],
    queryFn: () =>
      api.get<TeamOption[] | { data: TeamOption[] }>("/teams?limit=100"),
  });
  const userList = Array.isArray(users)
    ? users
    : Array.isArray(users?.data)
      ? users.data
      : [];
  const teamList = Array.isArray(teams)
    ? teams
    : Array.isArray(teams?.data)
      ? teams.data
      : [];
  const activeTeams = teamList.filter((t) => t.active);
  const { data: workforce } = useQuery({
    queryKey: ["workforce-directory", "for-assignment-drawer"],
    queryFn: () =>
      api.get<{
        people: WorkforcePerson[];
        departments: WorkforceDepartment[];
      }>("/workforce-directory"),
  });
  const workerOptions =
    workforce?.people?.filter((person) => person.canReceiveTasks) ?? userList;
  const supervisorOptions =
    workforce?.people?.filter(
      (person) => person.canAssignTasks || person.canVerifyTasks,
    ) ?? [];
  const qualityDepartments =
    workforce?.departments?.filter(
      (department) => department.qualityReviewerIds.length > 0,
    ) ?? [];

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
    setSupervisorIds(current.supervisorIds ?? []);
    setVerificationMode(current.verificationMode ?? "MANUAL_SUPERVISOR");
    setRequiredApprovals(current.requiredApprovals ?? 1);
    setQualityTeamId(current.qualityTeamId ?? "");
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
          supervisorIds,
          verificationMode,
          requiredApprovals,
          qualityTeamId: qualityTeamId || undefined,
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

  const verificationReady =
    verificationMode === "AUTO" ||
    (verificationMode === "MANUAL_SUPERVISOR"
      ? supervisorIds.length > 0
      : Boolean(qualityTeamId));
  const canSubmit = Boolean(workerId || teamId) && verificationReady;

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
          {workerOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {"jobTitle" in u ? ` — ${u.jobTitle}` : ` (${u.email})`}
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
        <label htmlFor="assign-verification" className="fb-label">
          Verification after completion
        </label>
        <select
          id="assign-verification"
          className="fb-select"
          value={verificationMode}
          onChange={(event) => {
            const mode = event.target.value as typeof verificationMode;
            setVerificationMode(mode);
            if (mode === "AUTO") setSupervisorIds([]);
          }}
        >
          <option value="AUTO">Auto-verify</option>
          <option value="MANUAL_SUPERVISOR">Assigned supervisor(s)</option>
          <option value="QUALITY_DEPARTMENT">Quality department</option>
        </select>
      </div>

      {verificationMode === "MANUAL_SUPERVISOR" ? (
        <fieldset className="fb-assignment-reviewers">
          <legend>Supervisors who can verify</legend>
          {supervisorOptions.map((person) => (
            <label key={person.id} className="fb-checkbox-row">
              <input
                type="checkbox"
                checked={supervisorIds.includes(person.id)}
                onChange={() =>
                  setSupervisorIds((currentIds) =>
                    currentIds.includes(person.id)
                      ? currentIds.filter((id) => id !== person.id)
                      : [...currentIds, person.id],
                  )
                }
              />
              {person.name} — {person.jobTitle}
            </label>
          ))}
          {!supervisorOptions.length ? (
            <span className="fb-hint">
              Configure supervisors in People & teams first.
            </span>
          ) : null}
        </fieldset>
      ) : null}

      {verificationMode === "QUALITY_DEPARTMENT" ? (
        <div className="fb-form-row">
          <label htmlFor="assign-quality-team" className="fb-label">
            Quality department
          </label>
          <select
            id="assign-quality-team"
            className="fb-select"
            value={qualityTeamId}
            onChange={(event) => setQualityTeamId(event.target.value)}
          >
            <option value="">Select quality department…</option>
            {qualityDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.departmentLabel || department.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {verificationMode !== "AUTO" ? (
        <div className="fb-form-row">
          <label htmlFor="assign-approval-count" className="fb-label">
            Approvals required
          </label>
          <input
            id="assign-approval-count"
            className="fb-input"
            type="number"
            min="1"
            max="20"
            value={requiredApprovals}
            onChange={(event) =>
              setRequiredApprovals(Number(event.target.value))
            }
          />
        </div>
      ) : null}

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
