import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../../api/client";
import { ImportIcon, WorkflowIcon } from "../../components/icons";
import { Pagination } from "../../components/ui/Pagination";
import { usePaginationState } from "../../components/ui/pagination-state";
import { TaskImportMapper } from "./task-import-mapper";
import {
  CORE_TASK_FIELDS,
  buildInitialFieldSettings,
  buildInitialMapping,
  customSourceColumns,
  type TaskColumnAnalysis,
  type TaskFieldProfile,
  type TaskFieldSettings,
} from "./task-import-mapping";
import "./imports.css";

interface ImportErrorRow {
  rowNumber: number;
  errorCode?: string;
  message?: string;
}

interface ImportJob {
  id: string;
  entityType: string;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  previewRevision: number;
  createdAt: string;
  errors?: ImportErrorRow[];
}

interface Customer {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
}

interface Workflow {
  id: string;
  name: string;
  status: string;
  currentVersionId?: string;
}

interface UploadIntent {
  uploadId: string;
  url: string;
  headers: Record<string, string>;
}

interface UploadedSpreadsheet {
  uploadId: string;
  checksum: string;
}

interface CompanySettings {
  terminology?: { task?: string };
}
interface WorkforcePerson {
  id: string;
  name: string;
  jobTitle: string;
  canReceiveTasks: boolean;
  canAssignTasks: boolean;
  canVerifyTasks: boolean;
}
interface WorkforceDepartment {
  id: string;
  name: string;
  departmentLabel: string;
  active: boolean;
  supervisorIds: string[];
  qualityReviewerIds: string[];
  verificationMode: "AUTO" | "MANUAL_SUPERVISOR" | "QUALITY_DEPARTMENT";
  requiredApprovals: number;
}

const SETUP_ENTITY_TYPES = [
  { value: "customers", label: "Clients" },
  { value: "sites", label: "Locations" },
  { value: "service_targets", label: "Assets & service points" },
  { value: "parts", label: "Parts catalogue" },
  { value: "users", label: "People" },
];

const DEFAULT_VISIBLE_COLUMNS = [
  "number",
  "externalReferenceId",
  "description",
  "status",
  "priority",
];

const localObjectBucket =
  import.meta.env.VITE_S3_BUCKET ?? "fieldbrix-local-uploads";

async function sha256Base64(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  let binary = "";
  for (const byte of new Uint8Array(digest))
    binary += String.fromCharCode(byte);
  return btoa(binary);
}

function spreadsheetMime(file: File) {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith(".csv")) return "text/csv";
  if (file.name.toLowerCase().endsWith(".xls"))
    return "application/vnd.ms-excel";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function friendlyEntity(entityType: string) {
  if (entityType === "tasks") return "Tasks";
  return (
    SETUP_ENTITY_TYPES.find((entity) => entity.value === entityType)?.label ??
    entityType.replaceAll("_", " ")
  );
}

export function ImportsPage({
  embedded = false,
  tasksOnly = false,
}: {
  embedded?: boolean;
  tasksOnly?: boolean;
} = {}) {
  const [importMode, setImportMode] = useState<"tasks" | "setup">("tasks");
  const [entityType, setEntityType] = useState("customers");
  const [duplicateMode, setDuplicateMode] = useState<
    "reject" | "skip" | "update"
  >("reject");
  const [customerId, setCustomerId] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [assignmentWorkerId, setAssignmentWorkerId] = useState("");
  const [assignmentTeamId, setAssignmentTeamId] = useState("");
  const [supervisorIds, setSupervisorIds] = useState<string[]>([]);
  const [verificationMode, setVerificationMode] = useState<
    "AUTO" | "MANUAL_SUPERVISOR" | "QUALITY_DEPARTMENT"
  >("MANUAL_SUPERVISOR");
  const [qualityTeamId, setQualityTeamId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<UploadedSpreadsheet | null>(null);
  const [analysis, setAnalysis] = useState<TaskColumnAnalysis | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
  const [fieldSettings, setFieldSettings] = useState<
    Record<string, TaskFieldSettings>
  >({});
  const [entityLabelOverride, setEntityLabelOverride] = useState("");
  const [previewResult, setPreviewResult] = useState<ImportJob | null>(null);
  const [completedResult, setCompletedResult] = useState<ImportJob | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyPagination = usePaginationState(10);

  const { data: customers } = useQuery({
    queryKey: ["customers", "import-options"],
    queryFn: () => api.get<{ items: Customer[] }>("/customers?limit=100"),
  });
  const { data: workflows } = useQuery({
    queryKey: ["workflows", "published", "import-options"],
    queryFn: () =>
      api.get<{ items: Workflow[] }>("/workflows?status=PUBLISHED&limit=100"),
  });
  const { data: sites } = useQuery({
    queryKey: ["sites", "import-options", customerId],
    queryFn: () =>
      api.get<{ items: Site[] }>(`/sites?customerId=${customerId}&limit=100`),
    enabled: Boolean(customerId),
  });
  const { data: companySettings } = useQuery({
    queryKey: ["company", "task-terminology"],
    queryFn: () => api.get<CompanySettings>("/company").catch(() => null),
  });
  const { data: workforce } = useQuery({
    queryKey: ["workforce-directory", "import-options"],
    queryFn: () =>
      api.get<{
        people: WorkforcePerson[];
        departments: WorkforceDepartment[];
      }>("/workforce-directory"),
  });
  const { data: profileResult } = useQuery({
    queryKey: ["task-field-profiles", customerId, workflowId],
    queryFn: () =>
      api.get<{ items: TaskFieldProfile[] }>(
        `/task-field-profiles?customerId=${customerId}&workflowId=${workflowId}`,
      ),
    enabled: Boolean(customerId && workflowId),
  });
  const {
    data: recentJobs,
    refetch,
    isLoading: jobsLoading,
  } = useQuery({
    queryKey: [
      "imports",
      "recent",
      {
        page: historyPagination.page,
        limit: historyPagination.pageSize,
      },
    ],
    queryFn: () =>
      api
        .get<{
          items: ImportJob[];
          total: number;
          page: number;
          limit: number;
        }>(
          `/imports?page=${historyPagination.page}&limit=${historyPagination.pageSize}`,
        )
        .catch(() => ({
          items: [],
          total: 0,
          page: historyPagination.page,
          limit: historyPagination.pageSize,
        })),
    placeholderData: (previous) => previous,
  });

  const publishedWorkflows = (workflows?.items ?? []).filter(
    (workflow) => workflow.status === "PUBLISHED" && workflow.currentVersionId,
  );
  const selectedWorkflow = publishedWorkflows.find(
    (workflow) => workflow.id === workflowId,
  );
  const existingProfile = profileResult?.items[0];
  const entityLabel =
    entityLabelOverride ||
    existingProfile?.entityLabel ||
    companySettings?.terminology?.task ||
    "Task";
  const assignmentReady =
    Boolean(assignmentWorkerId || assignmentTeamId) &&
    (verificationMode === "AUTO" ||
      (verificationMode === "MANUAL_SUPERVISOR"
        ? supervisorIds.length > 0
        : Boolean(qualityTeamId)));
  const contextReady =
    importMode === "setup" ||
    Boolean(customerId && selectedWorkflow && assignmentReady);
  const currentStep = completedResult
    ? 5
    : previewResult
      ? 4
      : analysis
        ? 3
        : file
          ? 2
          : 1;

  const customColumns = useMemo(
    () => (analysis ? customSourceColumns(analysis, columnMapping) : []),
    [analysis, columnMapping],
  );
  const requiredMappingsReady = CORE_TASK_FIELDS.filter(
    (field) => field.required,
  ).every((field) => Boolean(columnMapping[field.key]?.trim()));
  const selectedSources = Object.values(columnMapping).filter(Boolean);
  const mappingHasDuplicates =
    new Set(selectedSources).size !== selectedSources.length;
  const mappingReady =
    requiredMappingsReady &&
    !mappingHasDuplicates &&
    Boolean(entityLabel.trim());

  const resetWizard = () => {
    setFile(null);
    setUploaded(null);
    setAnalysis(null);
    setColumnMapping({});
    setFieldSettings({});
    setEntityLabelOverride("");
    setPreviewResult(null);
    setCompletedResult(null);
    setError(null);
  };

  const uploadSpreadsheet = async (selectedFile: File) => {
    const checksum = await sha256Base64(selectedFile);
    const mime = spreadsheetMime(selectedFile);
    const intent = await api.post<UploadIntent>(
      "/files/upload-intents",
      { mime, size: selectedFile.size, checksum },
      crypto.randomUUID(),
    );
    const signedUrl = String(intent.url).replace(
      /^https?:\/\/[^/]+\.localstack:4566/,
      `http://localhost:4566/${localObjectBucket}`,
    );
    const response = await fetch(signedUrl, {
      method: "PUT",
      headers: intent.headers,
      body: selectedFile,
    });
    if (!response.ok) throw new Error("The spreadsheet upload was rejected");
    await api.post(
      `/files/${intent.uploadId}/complete`,
      { checksum },
      crypto.randomUUID(),
    );
    return { uploadId: intent.uploadId, checksum };
  };

  const handleAnalyze = async () => {
    if (!file || !contextReady) return;
    setError(null);
    setSubmitting(true);
    try {
      const nextUpload = await uploadSpreadsheet(file);
      const nextAnalysis = await api.post<TaskColumnAnalysis>(
        "/imports/task-columns",
        { uploadId: nextUpload.uploadId },
        crypto.randomUUID(),
      );
      setUploaded(nextUpload);
      setAnalysis(nextAnalysis);
      setColumnMapping(
        buildInitialMapping(
          nextAnalysis.columns,
          existingProfile?.columnMapping,
        ),
      );
      setFieldSettings(
        buildInitialFieldSettings(nextAnalysis, existingProfile),
      );
    } catch (reason) {
      setError(
        (reason as { message?: string }).message ??
          "Unable to read this spreadsheet",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = async () => {
    if (!file || !contextReady) return;
    if (importMode === "tasks" && (!uploaded || !analysis || !mappingReady))
      return;
    setError(null);
    setSubmitting(true);
    try {
      const activeUpload = uploaded ?? (await uploadSpreadsheet(file));
      const fields = customColumns.map((column) => ({
        key: column,
        sourceColumn: column,
        label: fieldSettings[column]?.label || column,
        dataType: fieldSettings[column]?.dataType ?? "text",
        searchable: fieldSettings[column]?.searchable ?? true,
        filterable: fieldSettings[column]?.filterable ?? false,
      }));
      const visibleColumns = [
        ...DEFAULT_VISIBLE_COLUMNS,
        ...customColumns.filter((column) => fieldSettings[column]?.visible),
      ];
      const preview = await api.post<ImportJob>(
        "/imports/preview",
        {
          entityType: importMode === "tasks" ? "tasks" : entityType,
          duplicateMode,
          uploadId: activeUpload.uploadId,
          sourceChecksum: activeUpload.checksum,
          defaults:
            importMode === "tasks"
              ? {
                  customerId,
                  siteId: siteId || undefined,
                  workflowVersionId: selectedWorkflow?.currentVersionId,
                  assignmentWorkerId: assignmentWorkerId || undefined,
                  assignmentTeamId: assignmentTeamId || undefined,
                  supervisorIds,
                  verificationMode,
                  requiredApprovals: 1,
                  qualityTeamId: qualityTeamId || undefined,
                }
              : undefined,
          columnMapping: importMode === "tasks" ? columnMapping : undefined,
          taskProfile:
            importMode === "tasks"
              ? { entityLabel: entityLabel.trim(), fields, visibleColumns }
              : undefined,
        },
        crypto.randomUUID(),
      );
      setPreviewResult(await api.get<ImportJob>(`/imports/${preview.id}`));
    } catch (reason) {
      setError(
        (reason as { message?: string }).message ??
          "Unable to preview this spreadsheet",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommit = async () => {
    if (!previewResult) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<ImportJob>(
        `/imports/${previewResult.id}/commit`,
        { previewRevision: previewResult.previewRevision },
        crypto.randomUUID(),
      );
      setCompletedResult(result);
      setPreviewResult(null);
      if (historyPagination.page === 1) await refetch();
      else historyPagination.resetPage();
    } catch (reason) {
      setError(
        (reason as { message?: string }).message ??
          "Unable to import the batch",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      "reference_id,phone,latitude,longitude,description,priority,account_name,contract_tier",
      'WO-1001,+96890000000,23.5880,58.3829,"Inspect rooftop unit",HIGH,"Al Noor","Gold"',
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "fieldbrix-task-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={
        embedded
          ? "fb-import-page fb-import-page--embedded"
          : "fb-page fb-import-page"
      }
    >
      {!embedded ? (
        <div className="fb-page-header fb-import-header">
          <div>
            <span className="fb-import-kicker">Bulk operations</span>
            <h1 className="fb-page-title">Bring their spreadsheet as it is.</h1>
            <p className="fb-page-subtitle">
              Map four fixed fields once. Keep every other company column,
              searchable and ready for a configurable dashboard.
            </p>
          </div>
          <button
            type="button"
            className="fb-btn fb-btn--ghost"
            onClick={downloadTemplate}
          >
            Download example file
          </button>
        </div>
      ) : null}

      {!tasksOnly ? (
        <div
          className="fb-import-mode-tabs"
          role="tablist"
          aria-label="Import type"
        >
          <button
            type="button"
            role="tab"
            aria-selected={importMode === "tasks"}
            className={importMode === "tasks" ? "is-active" : ""}
            onClick={() => {
              setImportMode("tasks");
              resetWizard();
            }}
          >
            <ImportIcon size={17} /> Task batches{" "}
            <span>Any spreadsheet shape</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={importMode === "setup"}
            className={importMode === "setup" ? "is-active" : ""}
            onClick={() => {
              setImportMode("setup");
              resetWizard();
            }}
          >
            Setup records <span>Clients, locations, assets & people</span>
          </button>
        </div>
      ) : null}

      <ol
        className="fb-import-steps fb-import-steps--five"
        aria-label="Import progress"
      >
        {[
          "Choose context",
          "Upload file",
          "Map columns",
          "Validate rows",
          "Release batch",
        ].map((label, index) => (
          <li
            key={label}
            className={currentStep >= index + 1 ? "is-active" : ""}
            aria-current={currentStep === index + 1 ? "step" : undefined}
          >
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <div className="fb-import-workspace">
        <section className="fb-import-panel">
          <div className="fb-import-panel__heading">
            <span>
              {importMode === "tasks" ? "Task context" : "Record type"}
            </span>
            <h2>
              {importMode === "tasks"
                ? "Where does this batch belong?"
                : "What are you adding?"}
            </h2>
            <p>
              {importMode === "tasks"
                ? "The client and published workflow apply to every row. A saved mapping is reused the next time this combination is imported."
                : "Use the same preview and error-checking flow for setup records."}
            </p>
          </div>

          {importMode === "tasks" ? (
            <div className="fb-import-context-grid">
              <label>
                <span>Client *</span>
                <select
                  className="fb-select"
                  value={customerId}
                  onChange={(event) => {
                    setCustomerId(event.target.value);
                    setSiteId("");
                    resetWizard();
                  }}
                >
                  <option value="">Select the client…</option>
                  {customers?.items.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Workflow *</span>
                <select
                  className="fb-select"
                  value={workflowId}
                  onChange={(event) => {
                    setWorkflowId(event.target.value);
                    resetWizard();
                  }}
                >
                  <option value="">Select a published workflow…</option>
                  {publishedWorkflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
                {!publishedWorkflows.length ? (
                  <small>
                    Publish a workflow first.{" "}
                    <Link to="/workflows">Open workflows →</Link>
                  </small>
                ) : null}
              </label>
              <label>
                <span>Default location</span>
                <select
                  className="fb-select"
                  value={siteId}
                  disabled={!customerId}
                  onChange={(event) => {
                    setSiteId(event.target.value);
                    resetWizard();
                  }}
                >
                  <option value="">Use coordinates from each row</option>
                  {sites?.items.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Assign to field employee</span>
                <select
                  className="fb-select"
                  value={assignmentWorkerId}
                  onChange={(event) => {
                    setAssignmentWorkerId(event.target.value);
                    resetWizard();
                  }}
                >
                  <option value="">No individual employee</option>
                  {workforce?.people
                    .filter((person) => person.canReceiveTasks)
                    .map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name} — {person.jobTitle}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Assign to department / team</span>
                <select
                  className="fb-select"
                  value={assignmentTeamId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setAssignmentTeamId(id);
                    const department = workforce?.departments.find(
                      (item) => item.id === id,
                    );
                    if (department) {
                      setVerificationMode(department.verificationMode);
                      setSupervisorIds(department.supervisorIds);
                      if (department.verificationMode === "QUALITY_DEPARTMENT")
                        setQualityTeamId(department.id);
                    }
                    resetWizard();
                  }}
                >
                  <option value="">No department</option>
                  {workforce?.departments
                    .filter((department) => department.active)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.departmentLabel || department.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Completion verification *</span>
                <select
                  className="fb-select"
                  value={verificationMode}
                  onChange={(event) => {
                    const mode = event.target.value as typeof verificationMode;
                    setVerificationMode(mode);
                    if (mode === "AUTO") setSupervisorIds([]);
                    resetWizard();
                  }}
                >
                  <option value="AUTO">Auto-verify</option>
                  <option value="MANUAL_SUPERVISOR">
                    Manual supervisor verification
                  </option>
                  <option value="QUALITY_DEPARTMENT">
                    Quality department verification
                  </option>
                </select>
              </label>
            </div>
          ) : (
            <label className="fb-import-entity-select">
              <span>Setup record type</span>
              <select
                className="fb-select"
                value={entityType}
                onChange={(event) => {
                  setEntityType(event.target.value);
                  resetWizard();
                }}
              >
                {SETUP_ENTITY_TYPES.map((entity) => (
                  <option key={entity.value} value={entity.value}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {importMode === "tasks" &&
          verificationMode === "MANUAL_SUPERVISOR" ? (
            <fieldset className="fb-import-assignment-reviewers">
              <legend>
                Supervisors for every imported task (multiple allowed)
              </legend>
              {workforce?.people
                .filter(
                  (person) => person.canAssignTasks || person.canVerifyTasks,
                )
                .map((person) => (
                  <label key={person.id}>
                    <input
                      type="checkbox"
                      checked={supervisorIds.includes(person.id)}
                      onChange={() => {
                        setSupervisorIds((current) =>
                          current.includes(person.id)
                            ? current.filter((id) => id !== person.id)
                            : [...current, person.id],
                        );
                        resetWizard();
                      }}
                    />
                    <span>
                      {person.name}
                      <small>{person.jobTitle}</small>
                    </span>
                  </label>
                ))}
            </fieldset>
          ) : null}
          {importMode === "tasks" &&
          verificationMode === "QUALITY_DEPARTMENT" ? (
            <label className="fb-import-entity-select">
              <span>Quality department *</span>
              <select
                className="fb-select"
                value={qualityTeamId}
                onChange={(event) => {
                  setQualityTeamId(event.target.value);
                  resetWizard();
                }}
              >
                <option value="">Select quality department…</option>
                {workforce?.departments
                  .filter(
                    (department) => department.qualityReviewerIds.length > 0,
                  )
                  .map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.departmentLabel || department.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          {importMode === "tasks" && !assignmentReady ? (
            <div className="fb-import-context-warning">
              Choose a field employee or department and a verification owner
              before uploading the batch.
            </div>
          ) : null}

          <div className="fb-import-divider" />
          <div className="fb-import-file-row">
            <label
              className={`fb-import-dropzone ${file ? "has-file" : ""} ${!contextReady ? "is-disabled" : ""}`}
            >
              <input
                type="file"
                accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={
                  !contextReady ||
                  submitting ||
                  Boolean(previewResult || completedResult)
                }
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setUploaded(null);
                  setAnalysis(null);
                  setColumnMapping({});
                  setFieldSettings({});
                  setPreviewResult(null);
                  setCompletedResult(null);
                  setError(null);
                }}
              />
              <ImportIcon size={24} />
              <span>
                <strong>{file ? file.name : "Choose their spreadsheet"}</strong>
                {file
                  ? `${Math.max(1, Math.round(file.size / 1024))} KB · ready to read`
                  : contextReady
                    ? "CSV or Excel · up to 5,000 rows and 200 columns"
                    : "Select the required context first"}
              </span>
            </label>
            <div className="fb-import-duplicate">
              <label htmlFor="import-duplicate-mode">Existing references</label>
              <select
                id="import-duplicate-mode"
                className="fb-select"
                value={duplicateMode}
                disabled={Boolean(previewResult || completedResult)}
                onChange={(event) =>
                  setDuplicateMode(
                    event.target.value as "reject" | "skip" | "update",
                  )
                }
              >
                <option value="reject">Flag as an error</option>
                <option value="skip">Keep existing, skip row</option>
                <option value="update">Update existing record</option>
              </select>
            </div>
          </div>

          {file && !analysis && !previewResult && !completedResult ? (
            <button
              id="import-analyze"
              className="fb-btn fb-btn--primary fb-import-primary-action"
              type="button"
              onClick={() =>
                void (importMode === "tasks"
                  ? handleAnalyze()
                  : handlePreview())
              }
              disabled={submitting || !contextReady}
            >
              {submitting
                ? "Reading spreadsheet…"
                : importMode === "tasks"
                  ? "Read columns & continue"
                  : "Upload & validate rows"}
            </button>
          ) : null}

          {analysis &&
          importMode === "tasks" &&
          !previewResult &&
          !completedResult ? (
            <>
              <TaskImportMapper
                analysis={analysis}
                mapping={columnMapping}
                setMapping={setColumnMapping}
                fieldSettings={fieldSettings}
                setFieldSettings={setFieldSettings}
                entityLabel={entityLabel}
                setEntityLabel={setEntityLabelOverride}
              />
              {mappingHasDuplicates ? (
                <div className="fb-error fb-import-error">
                  One spreadsheet column cannot fill two core fields. Choose a
                  different source column.
                </div>
              ) : null}
              <button
                id="import-preview"
                className="fb-btn fb-btn--primary fb-import-primary-action"
                type="button"
                onClick={() => void handlePreview()}
                disabled={submitting || !mappingReady}
              >
                {submitting
                  ? "Checking every row…"
                  : "Save mapping & validate rows"}
              </button>
            </>
          ) : null}

          {error ? (
            <div className="fb-error fb-import-error">{error}</div>
          ) : null}

          {previewResult ? (
            <div className="fb-import-preview" aria-live="polite">
              <div className="fb-import-preview__summary">
                <div>
                  <strong>{previewResult.totalRows}</strong>
                  <span>Total rows</span>
                </div>
                <div className="is-valid">
                  <strong>{previewResult.validRows}</strong>
                  <span>Ready</span>
                </div>
                <div className={previewResult.errorRows ? "is-error" : ""}>
                  <strong>{previewResult.errorRows}</strong>
                  <span>Need attention</span>
                </div>
              </div>
              {previewResult.errors?.length ? (
                <div className="fb-import-errors">
                  <h3>Rows to fix</h3>
                  {previewResult.errors.slice(0, 5).map((row) => (
                    <div key={`${row.rowNumber}-${row.errorCode}`}>
                      <span>Row {row.rowNumber}</span>
                      <p>{row.message ?? row.errorCode ?? "Invalid row"}</p>
                    </div>
                  ))}
                  {previewResult.errors.length > 5 ? (
                    <small>
                      + {previewResult.errors.length - 5} more invalid rows
                    </small>
                  ) : null}
                </div>
              ) : null}
              <div className="fb-import-preview__actions">
                <button
                  id="import-commit"
                  className="fb-btn fb-btn--primary"
                  type="button"
                  onClick={() => void handleCommit()}
                  disabled={submitting || previewResult.validRows === 0}
                >
                  {submitting
                    ? "Releasing batch…"
                    : `Import ${previewResult.validRows} valid row${previewResult.validRows === 1 ? "" : "s"}`}
                </button>
                <button
                  className="fb-btn fb-btn--ghost"
                  type="button"
                  onClick={resetWizard}
                  disabled={submitting}
                >
                  Choose another file
                </button>
              </div>
            </div>
          ) : null}

          {completedResult ? (
            <div className="fb-import-complete" aria-live="polite">
              <span className="fb-import-complete__mark">✓</span>
              <div>
                <span className="fb-import-kicker">Batch released</span>
                <h2>{completedResult.validRows} records imported</h2>
                <p>
                  {importMode === "tasks"
                    ? `The ${entityLabel.toLowerCase()} records are ready for assignment, and all ${customColumns.length} additional fields remain available to the dashboard.`
                    : "The setup records are now available across FieldBrix."}
                </p>
                <div>
                  {importMode === "tasks" ? (
                    <Link to="/tasks" className="fb-btn fb-btn--primary">
                      Open task board
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="fb-btn fb-btn--ghost"
                    onClick={resetWizard}
                  >
                    Import another batch
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="fb-import-guide">
          <div className="fb-import-guide__icon">
            <WorkflowIcon size={20} />
          </div>
          <span className="fb-import-kicker">Flexible by design</span>
          <h2>Four fixed fields. Everything else stays theirs.</h2>
          <p>
            FieldBrix keeps assignment-critical data consistent while the
            company retains every operational column it already uses.
          </p>
          <dl>
            <div>
              <dt>Reference ID</dt>
              <dd>Durable identity and duplicate control</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>Contact available to the field worker</dd>
            </div>
            <div>
              <dt>Latitude + longitude</dt>
              <dd>Proximity and routing rules</dd>
            </div>
            <div>
              <dt>All remaining columns</dt>
              <dd>JSONB-backed, selectable, searchable, and filterable</dd>
            </div>
          </dl>
          <small>
            Suggested matches are visible and editable. Nothing is silently
            discarded or turned into a physical database column.
          </small>
        </aside>
      </div>

      <section className="fb-import-history">
        <div className="fb-import-history__heading">
          <div>
            <span className="fb-import-kicker">Audit trail</span>
            <h2>Recent imports</h2>
          </div>
          <span>{recentJobs?.total ?? 0} total</span>
        </div>
        <div className="fb-table-container">
          <table className="fb-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Ready</th>
                <th>Errors</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {jobsLoading ? (
                <tr>
                  <td colSpan={5} className="fb-table-loading">
                    Loading import history…
                  </td>
                </tr>
              ) : null}
              {!jobsLoading && !recentJobs?.items.length ? (
                <tr>
                  <td colSpan={5} className="fb-table-empty">
                    Your first completed preview will appear here.
                  </td>
                </tr>
              ) : null}
              {recentJobs?.items.map((job) => (
                <tr key={job.id}>
                  <td>{friendlyEntity(job.entityType)}</td>
                  <td>
                    <span
                      className={`fb-status fb-status--${job.status.toLowerCase()}`}
                    >
                      {job.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>{job.validRows}</td>
                  <td>{job.errorRows}</td>
                  <td>{new Date(job.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={historyPagination.page}
          pageSize={historyPagination.pageSize}
          total={recentJobs?.total ?? 0}
          onPageChange={historyPagination.setPage}
          onPageSizeChange={historyPagination.setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          disabled={jobsLoading}
          label="Import history pagination"
        />
      </section>
    </div>
  );
}
