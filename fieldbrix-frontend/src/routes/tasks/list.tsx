import { lazy, Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../../api/client";
import { ImportIcon, PlusIcon, SearchIcon } from "../../components/icons";
import { Pagination } from "../../components/ui/Pagination";
import { usePaginationState } from "../../components/ui/pagination-state";
import type { TaskFieldProfile } from "../master-data/task-import-mapping";
import { CreateTaskForm } from "./create-task-form";
import type { TaskMapItem } from "./task-map";
import "./tasks-list.css";

const ImportsPage = lazy(() =>
  import("../master-data/imports").then((module) => ({
    default: module.ImportsPage,
  })),
);
const TaskMap = lazy(() =>
  import("./task-map").then((module) => ({ default: module.TaskMap })),
);

interface Task {
  id: string;
  number: string;
  externalReferenceId?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  status: string;
  priority: string;
  scheduledAt?: string;
  dueAt?: string;
  revision: number;
  flags?: string[];
  customerId?: string;
  customerName?: string;
  siteName?: string;
  coordinateSource?: "TASK" | "LOCATION";
  customFields?: Record<string, unknown>;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface WorkflowOption {
  id: string;
  name: string;
  status: string;
}

interface CompanySettings {
  terminology?: { task?: string; taskPlural?: string };
}

type GridColumn = {
  key: string;
  label: string;
  kind: "core" | "custom";
  dataType?: "text" | "number" | "boolean" | "date";
};

const FLAG_LABELS: Record<string, string> = {
  OVERDUE: "Overdue",
  ESCALATED: "Escalated",
  SYNC_PENDING: "Sync pending",
  CUSTOMER_UNAVAILABLE: "Customer unavailable",
  SAFETY_STOP: "Safety stop",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "DRAFT", label: "Draft" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PAUSED", label: "Paused" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "NORMAL", label: "Normal" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const CORE_COLUMNS: GridColumn[] = [
  { key: "number", label: "FieldBrix #", kind: "core" },
  { key: "externalReferenceId", label: "Client reference", kind: "core" },
  { key: "description", label: "Description", kind: "core" },
  { key: "status", label: "Status", kind: "core" },
  { key: "priority", label: "Priority", kind: "core" },
  { key: "flags", label: "Flags", kind: "core" },
  { key: "contactPhone", label: "Phone", kind: "core" },
  { key: "latitude", label: "Latitude", kind: "core" },
  { key: "longitude", label: "Longitude", kind: "core" },
  { key: "scheduledAt", label: "Scheduled", kind: "core" },
  { key: "dueAt", label: "Due", kind: "core" },
];

const DEFAULT_VISIBLE = [
  "number",
  "externalReferenceId",
  "description",
  "status",
  "priority",
];

function pluralize(label: string) {
  if (/s$/i.test(label)) return label;
  if (/y$/i.test(label)) return `${label.slice(0, -1)}ies`;
  return `${label}s`;
}

function readableKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown, dataType?: GridColumn["dataType"]) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (dataType === "date") {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function TaskCell({ task, column }: { task: Task; column: GridColumn }) {
  if (column.key === "number") {
    return (
      <Link
        to="/tasks/$id"
        params={{ id: task.id }}
        className="fb-link fb-link--mono fb-task-grid__number"
      >
        {task.number || task.id.slice(0, 8)}
      </Link>
    );
  }
  if (column.key === "status") {
    return (
      <span
        className={`fb-status fb-status--${(task.status || "draft").toLowerCase().replaceAll("_", "-")}`}
      >
        {task.status}
      </span>
    );
  }
  if (column.key === "priority") {
    return (
      <span
        className={`fb-priority fb-priority--${(task.priority || "NORMAL").toLowerCase()}`}
      >
        {task.priority || "NORMAL"}
      </span>
    );
  }
  if (column.key === "flags") {
    return task.flags?.length ? (
      <span className="fb-flag-row">
        {task.flags.map((flag) => (
          <span
            key={flag}
            className={`fb-flag fb-flag--${flag.toLowerCase().replaceAll("_", "-")}`}
          >
            {FLAG_LABELS[flag] ?? flag}
          </span>
        ))}
      </span>
    ) : (
      <>—</>
    );
  }
  if (column.key === "scheduledAt" || column.key === "dueAt")
    return <>{formatValue(task[column.key], "date")}</>;
  const value =
    column.kind === "custom"
      ? task.customFields?.[column.key]
      : task[column.key as keyof Task];
  return <>{formatValue(value, column.dataType)}</>;
}

export function TasksListPage({
  initialView = "list",
}: {
  initialView?: "list" | "map" | "import";
} = {}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [customField, setCustomField] = useState("");
  const [customValue, setCustomValue] = useState("");
  const pagination = usePaginationState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<"list" | "map" | "import">(initialView);
  const [columnOverrides, setColumnOverrides] = useState<
    Record<string, string[]>
  >({});

  const { data: customersData } = useQuery({
    queryKey: ["customers", "filter-options"],
    queryFn: () => api.get<{ items: CustomerOption[] }>("/customers?limit=100"),
    retry: false,
  });
  const { data: workflowsData } = useQuery({
    queryKey: ["workflows", "task-filter-options"],
    queryFn: () => api.get<{ items: WorkflowOption[] }>("/workflows?limit=100"),
    retry: false,
  });
  const { data: companySettings } = useQuery({
    queryKey: ["company", "task-terminology"],
    queryFn: () => api.get<CompanySettings>("/company").catch(() => null),
  });
  const { data: profileResult } = useQuery({
    queryKey: ["task-field-profiles", customerId, workflowId],
    queryFn: () =>
      api.get<{ items: TaskFieldProfile[] }>(
        `/task-field-profiles?customerId=${customerId}&workflowId=${workflowId}`,
      ),
    enabled: Boolean(customerId && workflowId),
  });

  const profile = profileResult?.items[0];
  const profileKey =
    profile?.id ?? `${customerId || "all"}:${workflowId || "all"}`;
  const singularLabel =
    profile?.entityLabel || companySettings?.terminology?.task || "Task";
  const pluralLabel = profile?.entityLabel
    ? pluralize(profile.entityLabel)
    : companySettings?.terminology?.taskPlural || "Tasks";

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "tasks",
      {
        search,
        status,
        priority,
        customerId,
        workflowId,
        customField,
        customValue,
        page: pagination.page,
        limit: pagination.pageSize,
      },
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (customerId) params.set("customerId", customerId);
      if (workflowId) params.set("workflowId", workflowId);
      if (customField && customValue.trim()) {
        params.set("customField", customField);
        params.set("customValue", customValue.trim());
        params.set("customOperator", "contains");
      }
      return api.get<{
        items: Task[];
        total: number;
        page: number;
        limit: number;
      }>(`/tasks?${params.toString()}`);
    },
    placeholderData: (previous) => previous,
  });

  const { data: mapData, isLoading: mapLoading } = useQuery({
    queryKey: [
      "tasks-map",
      { search, status, priority, customerId, workflowId },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (customerId) params.set("customerId", customerId);
      if (workflowId) params.set("workflowId", workflowId);
      return api.get<{ items: TaskMapItem[]; total: number }>(
        `/tasks-map?${params.toString()}`,
      );
    },
    enabled: view === "map",
  });

  const customColumns = useMemo<GridColumn[]>(() => {
    if (profile) {
      return profile.fieldDefinitions.map((field) => ({
        key: field.key,
        label: field.label,
        kind: "custom",
        dataType: field.dataType,
      }));
    }
    const keys = new Set<string>();
    for (const task of data?.items ?? [])
      for (const key of Object.keys(task.customFields ?? {})) keys.add(key);
    return [...keys].map((key) => ({
      key,
      label: readableKey(key),
      kind: "custom",
    }));
  }, [data?.items, profile]);
  const availableColumns = useMemo(
    () => [...CORE_COLUMNS, ...customColumns],
    [customColumns],
  );
  const profileDefaults = profile?.visibleColumns?.length
    ? profile.visibleColumns
    : [
        ...DEFAULT_VISIBLE,
        ...customColumns.slice(0, 3).map((column) => column.key),
      ];
  const visibleColumnKeys = columnOverrides[profileKey] ?? profileDefaults;
  const visibleSet = new Set(visibleColumnKeys);
  const visibleColumns = availableColumns.filter((column) =>
    visibleSet.has(column.key),
  );
  const filterableFields =
    profile?.fieldDefinitions.filter((field) => field.filterable) ?? [];
  const totalTasks = data?.total ?? 0;

  const saveViewMutation = useMutation({
    mutationFn: () => {
      if (!profile) throw new Error("Choose a client and workflow first");
      return api.put<TaskFieldProfile>("/task-field-profiles", {
        customerId: profile.customerId,
        workflowId: profile.workflowId,
        entityLabel: profile.entityLabel,
        columnMapping: profile.columnMapping,
        fields: profile.fieldDefinitions,
        visibleColumns: visibleColumnKeys,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["task-field-profiles"],
      });
    },
  });

  const toggleColumn = (key: string) => {
    if (key === "number") return;
    setColumnOverrides((current) => {
      const selected = new Set(current[profileKey] ?? profileDefaults);
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
      return { ...current, [profileKey]: [...selected] };
    });
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setPriority("");
    setCustomerId("");
    setWorkflowId("");
    setCustomField("");
    setCustomValue("");
    pagination.resetPage();
  };

  return (
    <div className="fb-page fb-task-list-page">
      <div className="fb-page-header">
        <div>
          <span className="fb-task-list-kicker">Dynamic work register</span>
          <h1 className="fb-page-title">{pluralLabel} & dispatch</h1>
          <p className="fb-page-subtitle">
            {totalTasks}{" "}
            {totalTasks === 1
              ? singularLabel.toLowerCase()
              : pluralLabel.toLowerCase()}{" "}
            across the active view
          </p>
        </div>
        <div className="fb-page-actions">
          <button
            type="button"
            className="fb-btn fb-btn--ghost"
            onClick={() => {
              setShowCreate(false);
              setView("import");
            }}
          >
            <ImportIcon size={16} />
            <span>Import spreadsheet</span>
          </button>
          <button
            id="tasks-new"
            className="fb-btn fb-btn-primary"
            onClick={() => {
              setView("list");
              setShowCreate((visible) => !visible);
            }}
          >
            <PlusIcon size={16} />
            <span>{showCreate ? "Cancel" : `New ${singularLabel}`}</span>
          </button>
        </div>
      </div>

      <div
        className="fb-task-view-tabs"
        role="tablist"
        aria-label="Task workspace view"
      >
        {(
          [
            ["list", "Table"],
            ["map", "India map"],
            ["import", "Import tasks"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            className={view === key ? "is-active" : ""}
            onClick={() => {
              setShowCreate(false);
              setView(key);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "import" ? (
        <Suspense
          fallback={<div className="fb-card">Loading import workspace…</div>}
        >
          <ImportsPage embedded tasksOnly />
        </Suspense>
      ) : null}

      {view !== "import" && showCreate ? (
        <CreateTaskForm onCreated={() => setShowCreate(false)} />
      ) : null}

      {view !== "import" ? (
        <section className="fb-card fb-task-toolbar" aria-label="Task filters">
          <label className="fb-task-search">
            <span className="sr-only">Search {pluralLabel}</span>
            <SearchIcon size={14} />
            <input
              id="tasks-search"
              type="search"
              placeholder={`Search ${pluralLabel.toLowerCase()} and imported fields…`}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                pagination.resetPage();
              }}
              className="fb-input"
            />
          </label>
          <select
            id="tasks-customer-filter"
            className="fb-select"
            aria-label="Filter by client"
            value={customerId}
            onChange={(event) => {
              setCustomerId(event.target.value);
              setWorkflowId("");
              setCustomField("");
              setCustomValue("");
              pagination.resetPage();
            }}
          >
            <option value="">All clients</option>
            {customersData?.items.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          <select
            className="fb-select"
            aria-label="Filter by workflow"
            value={workflowId}
            onChange={(event) => {
              setWorkflowId(event.target.value);
              setCustomField("");
              setCustomValue("");
              pagination.resetPage();
            }}
          >
            <option value="">All workflows</option>
            {workflowsData?.items.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
          <select
            className="fb-select"
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              pagination.resetPage();
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="fb-select"
            aria-label="Filter by priority"
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              pagination.resetPage();
            }}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {filterableFields.length ? (
            <div className="fb-task-custom-filter">
              <select
                className="fb-select"
                aria-label="Imported field to filter"
                value={customField}
                onChange={(event) => {
                  setCustomField(event.target.value);
                  setCustomValue("");
                  pagination.resetPage();
                }}
              >
                <option value="">Imported field…</option>
                {filterableFields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
              {customField ? (
                <input
                  className="fb-input"
                  aria-label="Imported field filter value"
                  placeholder="Contains…"
                  value={customValue}
                  onChange={(event) => {
                    setCustomValue(event.target.value);
                    pagination.resetPage();
                  }}
                />
              ) : null}
            </div>
          ) : null}
          {search ||
          status ||
          priority ||
          customerId ||
          workflowId ||
          customValue ? (
            <button
              type="button"
              className="fb-btn fb-btn-ghost fb-btn-sm"
              onClick={resetFilters}
            >
              Reset
            </button>
          ) : null}
        </section>
      ) : null}

      {view === "list" ? (
        <div className="fb-task-grid-controls">
          <p>
            {profile
              ? `Using the saved ${profile.entityLabel.toLowerCase()} field profile for this client and workflow.`
              : "Choose a client and workflow to load its saved terminology and field profile."}
          </p>
          <details className="fb-column-picker">
            <summary>
              Columns · {visibleColumns.length} of {availableColumns.length}
            </summary>
            <div className="fb-column-picker__panel">
              <div className="fb-column-picker__heading">
                <strong>Choose dashboard columns</strong>
                <span>All imported data remains stored when hidden.</span>
              </div>
              <div className="fb-column-picker__list">
                {availableColumns.map((column) => (
                  <label key={column.key}>
                    <input
                      type="checkbox"
                      checked={visibleSet.has(column.key)}
                      disabled={column.key === "number"}
                      onChange={() => toggleColumn(column.key)}
                    />
                    <span>{column.label}</span>
                    <small>
                      {column.kind === "custom" ? "Imported" : "Core"}
                    </small>
                  </label>
                ))}
              </div>
              {profile ? (
                <button
                  type="button"
                  className="fb-btn fb-btn--primary"
                  onClick={() => saveViewMutation.mutate()}
                  disabled={saveViewMutation.isPending}
                >
                  {saveViewMutation.isPending
                    ? "Saving…"
                    : "Save as workflow view"}
                </button>
              ) : null}
            </div>
          </details>
        </div>
      ) : null}

      {error ? (
        <div className="fb-error">
          Failed to load {pluralLabel.toLowerCase()}
        </div>
      ) : null}

      {view === "list" ? (
        <section className="fb-card fb-task-grid-card">
          <div className="fb-task-grid-scroll">
            <table className="fb-table fb-task-grid" role="grid">
              <thead>
                <tr>
                  {visibleColumns.map((column) => (
                    <th scope="col" key={column.key}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={Math.max(1, visibleColumns.length)}
                      className="fb-table-loading"
                    >
                      Loading {pluralLabel.toLowerCase()}…
                    </td>
                  </tr>
                ) : null}
                {!isLoading && !data?.items.length ? (
                  <tr>
                    <td
                      colSpan={Math.max(1, visibleColumns.length)}
                      className="fb-table-empty"
                    >
                      No {pluralLabel.toLowerCase()} match the active filters.
                    </td>
                  </tr>
                ) : null}
                {data?.items.map((task) => (
                  <tr key={task.id}>
                    {visibleColumns.map((column) => (
                      <td key={column.key}>
                        <TaskCell task={task} column={column} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={data?.total ?? 0}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            disabled={isLoading}
            label={`${pluralLabel} table pagination`}
          />
        </section>
      ) : null}

      {view === "map" ? (
        <section className="fb-card fb-task-map-card">
          <div className="fb-task-map-summary">
            <span>
              <strong>{mapData?.total ?? 0}</strong> geocoded tasks across India
            </span>
            <span>
              {mapLoading
                ? "Loading live locations…"
                : "Select a numbered cluster to zoom in and reveal smaller location groups."}
            </span>
          </div>
          <Suspense fallback={<div className="fb-task-map">Loading map…</div>}>
            <TaskMap tasks={mapData?.items ?? []} />
          </Suspense>
        </section>
      ) : null}
    </div>
  );
}
