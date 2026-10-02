import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Empty, Intro, Status } from "../components/AdminUiAtoms";
import type {
  AdminRole,
  AdminUser,
  PlatformStaff,
  RequestFn,
  WorkforceDepartment,
  WorkforceDirectory,
  WorkforcePerson,
} from "../types";

type PeopleTab = "company" | "departments" | "platform";
const PLATFORM_CAPABILITIES = [
  ["companies", "Companies & clients"],
  ["applications", "Applications"],
  ["sessions", "Session logs"],
  ["support", "Support operations"],
] as const;
const WORKFORCE_TYPES = [
  ["FIELD_WORKER", "Field worker / officer"],
  ["SUPERVISOR", "Supervisor"],
  ["QUALITY_REVIEWER", "Quality reviewer"],
  ["OFFICE", "Company officer"],
  ["COMPANY_ADMIN", "Company administrator"],
] as const;
const toggleValue = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

export function PeopleView({
  users,
  roles,
  workforce,
  platformStaff,
  request,
  refresh,
  notify,
}: {
  users: AdminUser[];
  roles: AdminRole[];
  workforce: WorkforceDirectory;
  platformStaff: PlatformStaff[];
  request: RequestFn;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState<PeopleTab>("company");
  const [email, setEmail] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [platformForm, setPlatformForm] = useState({
    displayName: "",
    email: "",
    accessLevel: "SUB_ADMIN" as "SUPER_ADMIN" | "SUB_ADMIN",
    capabilities: ["companies", "applications"] as string[],
  });
  const [saving, setSaving] = useState(false);
  const people: WorkforcePerson[] = workforce.people.length
    ? workforce.people
    : users.map((user) => ({
        ...user,
        jobTitle: "Field worker",
        workforceType: "FIELD_WORKER",
        canReceiveTasks: true,
        canAssignTasks: false,
        canVerifyTasks: false,
        workflowAccess: [],
        teamIds: [],
      }));
  const selectedPerson = people.find(
    (person) => person.id === selectedPersonId,
  );
  const selectedDepartment = workforce.departments.find(
    (department) => department.id === selectedDepartmentId,
  );
  const roleById = useMemo(
    () => new Map(roles.map((role) => [role.id, role.name])),
    [roles],
  );
  const run = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    try {
      await action();
      notify(success);
      await refresh();
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to save changes",
      );
    } finally {
      setSaving(false);
    }
  };
  const invite = (event: FormEvent) => {
    event.preventDefault();
    void run(
      () =>
        request("/users/invite", {
          method: "POST",
          body: JSON.stringify({ email, idempotencyKey: crypto.randomUUID() }),
        }),
      "Company employee invited",
    ).then(() => setEmail(""));
  };
  const createDepartment = (event: FormEvent) => {
    event.preventDefault();
    void run(
      () =>
        request("/teams", {
          method: "POST",
          body: JSON.stringify({ name: departmentName }),
        }),
      "Department created",
    ).then(() => setDepartmentName(""));
  };

  return (
    <div className="page-stack workforce-page">
      <Intro
        eyebrow="PEOPLE, DEPARTMENTS & GOVERNANCE"
        title="Put every person in the right operating context"
        text="Keep the FieldBrix platform team separate from each company workforce. Give field staff only the workflows they perform, and make task ownership and verification explicit."
      />
      <div className="workforce-scope-map" aria-label="Access model">
        <div>
          <span>FieldBrix platform</span>
          <b>Super admins & sub-admins</b>
          <small>Manage companies, applications and sessions</small>
        </div>
        <i>separate from</i>
        <div>
          <span>Company workforce</span>
          <b>Departments, supervisors & field staff</b>
          <small>Perform, assign and verify operational work</small>
        </div>
      </div>
      <div
        className="workforce-tabs"
        role="tablist"
        aria-label="People and teams"
      >
        {(
          [
            ["company", "Company people", `${people.length} employees`],
            [
              "departments",
              "Departments & teams",
              `${workforce.departments.length} groups`,
            ],
            [
              "platform",
              "FieldBrix team",
              `${platformStaff.length} platform staff`,
            ],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "is-active" : ""}
            onClick={() => setTab(id)}
          >
            <b>{label}</b>
            <small>{count}</small>
          </button>
        ))}
      </div>

      {tab === "company" ? (
        <section className="workforce-layout" role="tabpanel">
          <div className="workforce-directory">
            <form className="workforce-create-row" onSubmit={invite}>
              <label>
                <span>Invite a company employee</span>
                <input
                  required
                  type="email"
                  placeholder="employee@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button className="primary-button" disabled={saving}>
                ＋ Invite employee
              </button>
            </form>
            <div className="workforce-list">
              {people.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  className={
                    selectedPersonId === person.id ? "is-selected" : ""
                  }
                  onClick={() => setSelectedPersonId(person.id)}
                >
                  <span className="avatar">{person.name[0]}</span>
                  <span>
                    <b>{person.name}</b>
                    <small>
                      {person.jobTitle} · {person.email}
                    </small>
                  </span>
                  <Status value={person.active ? "ACTIVE" : "INACTIVE"} />
                </button>
              ))}
              {!people.length ? (
                <Empty text="Invite the first company employee." />
              ) : null}
            </div>
          </div>
          {selectedPerson ? (
            <PersonEditor
              key={selectedPerson.id}
              person={selectedPerson}
              roles={roles}
              roleById={roleById}
              directory={workforce}
              saving={saving}
              request={request}
              run={run}
            />
          ) : (
            <EditorEmpty
              title="Select an employee"
              text="Edit their company title, department, role, task authority, and workflow access."
            />
          )}
        </section>
      ) : null}

      {tab === "departments" ? (
        <section className="workforce-layout" role="tabpanel">
          <div className="workforce-directory">
            <form className="workforce-create-row" onSubmit={createDepartment}>
              <label>
                <span>Create a department or team</span>
                <input
                  required
                  placeholder="e.g. Electrical field operations"
                  value={departmentName}
                  onChange={(event) => setDepartmentName(event.target.value)}
                />
              </label>
              <button className="primary-button" disabled={saving}>
                ＋ Create
              </button>
            </form>
            <div className="workforce-list">
              {workforce.departments.map((department) => (
                <button
                  type="button"
                  key={department.id}
                  className={
                    selectedDepartmentId === department.id ? "is-selected" : ""
                  }
                  onClick={() => setSelectedDepartmentId(department.id)}
                >
                  <span className="workforce-team-icon">
                    {department.memberCount}
                  </span>
                  <span>
                    <b>{department.departmentLabel || department.name}</b>
                    <small>
                      {department.supervisorIds.length} supervisor(s) ·{" "}
                      {department.workflowIds.length} workflow(s)
                    </small>
                  </span>
                  <Status value={department.active ? "ACTIVE" : "INACTIVE"} />
                </button>
              ))}
            </div>
          </div>
          {selectedDepartment ? (
            <DepartmentEditor
              key={selectedDepartment.id}
              department={selectedDepartment}
              directory={workforce}
              saving={saving}
              run={run}
              request={request}
            />
          ) : (
            <EditorEmpty
              title="Select a department"
              text="Choose its supervisors, quality reviewers, workflows, and verification policy."
            />
          )}
        </section>
      ) : null}

      {tab === "platform" ? (
        <section className="platform-staff-panel" role="tabpanel">
          <div className="platform-boundary-note">
            <b>Platform-only identities</b>
            <span>
              These administrators operate FieldBrix itself. They never appear
              as task assignees or company field workers.
            </span>
          </div>
          <form
            className="platform-staff-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                () =>
                  request(
                    "/platform/staff",
                    { method: "POST", body: JSON.stringify(platformForm) },
                    true,
                  ),
                "Platform administrator added",
              ).then(() =>
                setPlatformForm({
                  displayName: "",
                  email: "",
                  accessLevel: "SUB_ADMIN",
                  capabilities: ["companies", "applications"],
                }),
              );
            }}
          >
            <label>
              <span>Name</span>
              <input
                required
                value={platformForm.displayName}
                onChange={(event) =>
                  setPlatformForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Platform email</span>
              <input
                required
                type="email"
                value={platformForm.email}
                onChange={(event) =>
                  setPlatformForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Access level</span>
              <select
                value={platformForm.accessLevel}
                onChange={(event) =>
                  setPlatformForm((current) => ({
                    ...current,
                    accessLevel: event.target.value as
                      | "SUPER_ADMIN"
                      | "SUB_ADMIN",
                  }))
                }
              >
                <option value="SUB_ADMIN">Super admin sub-admin</option>
                <option value="SUPER_ADMIN">Super admin</option>
              </select>
            </label>
            <fieldset>
              <legend>Can manage</legend>
              {PLATFORM_CAPABILITIES.map(([value, label]) => (
                <label key={value} className="check-card">
                  <input
                    type="checkbox"
                    checked={platformForm.capabilities.includes(value)}
                    onChange={() =>
                      setPlatformForm((current) => ({
                        ...current,
                        capabilities: toggleValue(current.capabilities, value),
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <button className="primary-button" disabled={saving}>
              Add platform administrator
            </button>
          </form>
          <div className="platform-staff-list">
            {platformStaff.map((person) => (
              <div key={person.id}>
                <span className="avatar">{person.displayName[0]}</span>
                <span>
                  <b>{person.displayName}</b>
                  <small>{person.email}</small>
                </span>
                <strong>
                  {person.accessLevel === "SUPER_ADMIN"
                    ? "Super admin"
                    : "Sub-admin"}
                </strong>
                <small>
                  {person.capabilities.join(" · ") || "No management areas"}
                </small>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PersonEditor({
  person,
  roles,
  roleById,
  directory,
  saving,
  request,
  run,
}: {
  person: WorkforcePerson;
  roles: AdminRole[];
  roleById: Map<string, string>;
  directory: WorkforceDirectory;
  saving: boolean;
  request: RequestFn;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(person);
  const [roleId, setRoleId] = useState(person.roles?.[0] ?? "");
  const setAccess = (workflowId: string, enabled: boolean) =>
    setDraft((current) => ({
      ...current,
      workflowAccess: enabled
        ? [
            ...current.workflowAccess,
            {
              workflowId,
              accessLevel:
                current.workforceType === "QUALITY_REVIEWER"
                  ? "VERIFY"
                  : current.workforceType === "SUPERVISOR"
                    ? "SUPERVISE"
                    : "PERFORM",
            },
          ]
        : current.workflowAccess.filter(
            (item) => item.workflowId !== workflowId,
          ),
    }));
  return (
    <form
      className="workforce-editor"
      onSubmit={(event) => {
        event.preventDefault();
        void run(
          () =>
            Promise.all([
              request(`/users/${person.id}/workforce-profile`, {
                method: "PUT",
                body: JSON.stringify({
                  jobTitle: draft.jobTitle,
                  workforceType: draft.workforceType,
                  primaryTeamId: draft.primaryTeamId || undefined,
                  canReceiveTasks: draft.canReceiveTasks,
                  canAssignTasks: draft.canAssignTasks,
                  canVerifyTasks: draft.canVerifyTasks,
                  workflowAccess: draft.workflowAccess,
                }),
              }),
              request(`/users/${person.id}/roles`, {
                method: "PUT",
                headers: { "idempotency-key": crypto.randomUUID() },
                body: JSON.stringify({ roleIds: roleId ? [roleId] : [] }),
              }),
            ]),
          "Employee access saved",
        );
      }}
    >
      <div className="workforce-editor__head">
        <div>
          <span>Company employee</span>
          <h2>{person.name}</h2>
          <p>{person.email}</p>
        </div>
        <Status value={person.active ? "ACTIVE" : "INACTIVE"} />
      </div>
      <div className="workforce-form-grid">
        <label>
          <span>Company job title</span>
          <input
            value={draft.jobTitle}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                jobTitle: event.target.value,
              }))
            }
            placeholder="Field engineer, officer, cleaner…"
          />
        </label>
        <label>
          <span>Operating category</span>
          <select
            value={draft.workforceType}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                workforceType: event.target
                  .value as WorkforcePerson["workforceType"],
              }))
            }
          >
            {WORKFORCE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Primary department</span>
          <select
            value={draft.primaryTeamId ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                primaryTeamId: event.target.value,
              }))
            }
          >
            <option value="">No primary department</option>
            {directory.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.departmentLabel || department.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>System role</span>
          <select
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
          >
            <option value="">No system role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <small>
            {roleId
              ? `Current: ${roleById.get(roleId) ?? "Custom role"}`
              : "Permissions are controlled by Roles."}
          </small>
        </label>
      </div>
      <fieldset className="authority-grid">
        <legend>Task authority</legend>
        {(
          [
            ["canReceiveTasks", "Can receive and perform tasks"],
            ["canAssignTasks", "Can assign tasks and manage teams"],
            ["canVerifyTasks", "Can verify completed tasks"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="check-card">
            <input
              type="checkbox"
              checked={draft[key]}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [key]: event.target.checked,
                }))
              }
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="workflow-access">
        <legend>Workflow access</legend>
        <p>
          Only selected workflows appear as work this employee can perform,
          supervise, or verify.
        </p>
        {directory.workflows.map((workflow) => {
          const access = draft.workflowAccess.find(
            (item) => item.workflowId === workflow.id,
          );
          return (
            <div key={workflow.id}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(access)}
                  onChange={(event) =>
                    setAccess(workflow.id, event.target.checked)
                  }
                />
                <span>{workflow.name}</span>
              </label>
              {access ? (
                <select
                  value={access.accessLevel}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      workflowAccess: current.workflowAccess.map((item) =>
                        item.workflowId === workflow.id
                          ? {
                              ...item,
                              accessLevel: event.target.value as
                                | "PERFORM"
                                | "SUPERVISE"
                                | "VERIFY",
                            }
                          : item,
                      ),
                    }))
                  }
                >
                  <option value="PERFORM">Perform</option>
                  <option value="SUPERVISE">Supervise</option>
                  <option value="VERIFY">Verify</option>
                </select>
              ) : null}
            </div>
          );
        })}
      </fieldset>
      <button className="primary-button" disabled={saving}>
        Save employee
      </button>
    </form>
  );
}

function DepartmentEditor({
  department,
  directory,
  saving,
  run,
  request,
}: {
  department: WorkforceDepartment;
  directory: WorkforceDirectory;
  saving: boolean;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
  request: RequestFn;
}) {
  const [draft, setDraft] = useState(department);
  return (
    <form
      className="workforce-editor"
      onSubmit={(event) => {
        event.preventDefault();
        void run(
          () =>
            request(`/teams/${department.id}/governance`, {
              method: "PUT",
              body: JSON.stringify({
                departmentLabel: draft.departmentLabel,
                verificationMode: draft.verificationMode,
                requiredApprovals: draft.requiredApprovals,
                supervisorIds: draft.supervisorIds,
                qualityReviewerIds: draft.qualityReviewerIds,
                workflowIds: draft.workflowIds,
              }),
            }),
          "Department governance saved",
        );
      }}
    >
      <div className="workforce-editor__head">
        <div>
          <span>Company department / team</span>
          <h2>{department.name}</h2>
          <p>{department.memberCount} active member(s)</p>
        </div>
      </div>
      <label>
        <span>Company-facing department name</span>
        <input
          value={draft.departmentLabel}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              departmentLabel: event.target.value,
            }))
          }
        />
      </label>
      <div className="workforce-form-grid">
        <label>
          <span>Verification policy</span>
          <select
            value={draft.verificationMode}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                verificationMode: event.target
                  .value as WorkforceDepartment["verificationMode"],
              }))
            }
          >
            <option value="AUTO">Auto-verify on completion</option>
            <option value="MANUAL_SUPERVISOR">
              Manual supervisor verification
            </option>
            <option value="QUALITY_DEPARTMENT">
              Quality department verification
            </option>
          </select>
        </label>
        <label>
          <span>Approvals required</span>
          <input
            type="number"
            min="1"
            max="20"
            disabled={draft.verificationMode === "AUTO"}
            value={draft.requiredApprovals}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                requiredApprovals: Number(event.target.value),
              }))
            }
          />
        </label>
      </div>
      <PeopleChecklist
        title="Operational supervisors (multiple allowed)"
        people={directory.people.filter(
          (person) =>
            person.canAssignTasks || person.workforceType === "SUPERVISOR",
        )}
        selected={draft.supervisorIds}
        onToggle={(id) =>
          setDraft((current) => ({
            ...current,
            supervisorIds: toggleValue(current.supervisorIds, id),
          }))
        }
      />
      <PeopleChecklist
        title="Quality reviewers"
        people={directory.people.filter(
          (person) =>
            person.canVerifyTasks ||
            person.workforceType === "QUALITY_REVIEWER",
        )}
        selected={draft.qualityReviewerIds}
        onToggle={(id) =>
          setDraft((current) => ({
            ...current,
            qualityReviewerIds: toggleValue(current.qualityReviewerIds, id),
          }))
        }
      />
      <fieldset className="workflow-access">
        <legend>Department workflows</legend>
        {directory.workflows.map((workflow) => (
          <label key={workflow.id} className="check-card">
            <input
              type="checkbox"
              checked={draft.workflowIds.includes(workflow.id)}
              onChange={() =>
                setDraft((current) => ({
                  ...current,
                  workflowIds: toggleValue(current.workflowIds, workflow.id),
                }))
              }
            />
            <span>{workflow.name}</span>
          </label>
        ))}
      </fieldset>
      <button className="primary-button" disabled={saving}>
        Save department
      </button>
    </form>
  );
}

function PeopleChecklist({
  title,
  people,
  selected,
  onToggle,
}: {
  title: string;
  people: WorkforcePerson[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="people-checklist">
      <legend>{title}</legend>
      {people.map((person) => (
        <label key={person.id} className="check-card">
          <input
            type="checkbox"
            checked={selected.includes(person.id)}
            onChange={() => onToggle(person.id)}
          />
          <span>
            <b>{person.name}</b>
            <small>{person.jobTitle}</small>
          </span>
        </label>
      ))}
      {!people.length ? (
        <small>Give an employee the matching task authority first.</small>
      ) : null}
    </fieldset>
  );
}
function EditorEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="workforce-editor workforce-editor--empty">
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}
