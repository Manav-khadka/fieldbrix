import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { api } from "../../api/client";
import { useUiStore } from "../../store/ui.store";
import {
  WorkflowIcon,
  PlusIcon,
  SearchIcon,
  CheckIcon,
  LayersIcon,
  AdminIcon,
} from "../../components/icons";
import { Pagination } from "../../components/ui/Pagination";
import { usePaginationState } from "../../components/ui/pagination-state";

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  revision: number;
  industry?: string;
  category?: string;
  updatedAt: string;
  createdAt?: string;
}

const TEMPLATES = [
  {
    id: "blank",
    title: "Blank Custom Workflow",
    desc: "Start with an empty multi-section canvas and build from scratch.",
    icon: "📋",
  },
  {
    id: "hvac",
    title: "HVAC & Cooling System Audit",
    desc: "Includes pressure checks, temperature readings, photo evidence, and signoff.",
    icon: "❄️",
  },
  {
    id: "electrical",
    title: "Electrical & Safety Checklist",
    desc: "Breaker testing, voltage measurement, lockout/tagout verification, and geostamp.",
    icon: "⚡",
  },
  {
    id: "facility",
    title: "Facility Maintenance & Site Survey",
    desc: "Multi-point perimeter check, asset barcode scanning, and supervisor signoff.",
    icon: "🏢",
  },
];

export function WorkflowsListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const pagination = usePaginationState(20);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");

  const qc = useQueryClient();
  const navigate = useNavigate();
  const addToast = useUiStore((state) => state.addToast);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "workflows",
      {
        search,
        status: statusFilter === "ALL" ? "" : statusFilter,
        page: pagination.page,
        limit: pagination.pageSize,
      },
    ],
    queryFn: () =>
      api.get<{
        items: Workflow[];
        total: number;
        page: number;
        limit: number;
      }>(
        `/workflows?search=${encodeURIComponent(search)}&status=${statusFilter === "ALL" ? "" : statusFilter}&page=${pagination.page}&limit=${pagination.pageSize}`,
      ),
    placeholderData: (prev) => prev,
  });

  const items = data?.items;
  const workflows = items ?? [];

  // Summary Metrics
  const stats = useMemo(() => {
    const list = items ?? [];
    const total = data?.total ?? list.length;
    const published = list.filter((w) => w.status === "PUBLISHED").length;
    const drafts = list.filter((w) => w.status === "DRAFT").length;
    return { total, published, drafts };
  }, [data?.total, items]);

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; template?: string }) =>
      api.post<Workflow>(
        "/workflows",
        { name: payload.name },
        crypto.randomUUID(),
      ),
    onSuccess: (newWf) => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      addToast({
        type: "success",
        message: `Workflow "${newWf.name}" created.`,
      });
      setIsCreateOpen(false);
      setWorkflowName("");
      // Navigate straight into the visual builder canvas
      if (newWf?.id) {
        void navigate({
          to: "/workflows/$id/builder",
          params: { id: newWf.id },
        });
      }
    },
    onError: (err: Error) => {
      addToast({
        type: "error",
        message: err.message || "Failed to create workflow",
      });
    },
  });

  const handleCreate = () => {
    if (!workflowName.trim()) return;
    createMutation.mutate({
      name: workflowName.trim(),
      template: selectedTemplate,
    });
  };

  return (
    <div className="fb-page" style={{ width: "100%" }}>
      {/* Overview Stat Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "1rem 1.25rem",
            borderRadius: "var(--fb-radius-lg)",
            border: "1px solid var(--fb-border-subtle)",
            boxShadow: "var(--fb-shadow-xs)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--fb-slate-500)",
                textTransform: "uppercase",
              }}
            >
              Total Workflows
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "var(--fb-slate-900)",
                marginTop: "2px",
              }}
            >
              {stats.total}
            </div>
          </div>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WorkflowIcon size={22} />
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "1rem 1.25rem",
            borderRadius: "var(--fb-radius-lg)",
            border: "1px solid var(--fb-border-subtle)",
            boxShadow: "var(--fb-shadow-xs)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--fb-slate-500)",
                textTransform: "uppercase",
              }}
            >
              Published & Active
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "#16a34a",
                marginTop: "2px",
              }}
            >
              {stats.published}
            </div>
          </div>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckIcon size={22} />
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "1rem 1.25rem",
            borderRadius: "var(--fb-radius-lg)",
            border: "1px solid var(--fb-border-subtle)",
            boxShadow: "var(--fb-shadow-xs)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--fb-slate-500)",
                textTransform: "uppercase",
              }}
            >
              In-Progress Drafts
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "#d97706",
                marginTop: "2px",
              }}
            >
              {stats.drafts}
            </div>
          </div>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LayersIcon size={22} />
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div
        style={{
          background: "#ffffff",
          padding: "0.875rem 1.25rem",
          borderRadius: "var(--fb-radius-lg)",
          border: "1px solid var(--fb-border-subtle)",
          boxShadow: "var(--fb-shadow-xs)",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flex: 1,
            minWidth: "260px",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
            <SearchIcon
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--fb-slate-400)",
              }}
            />
            <input
              id="workflows-search"
              type="search"
              placeholder="Search workflows by title or category…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                pagination.resetPage();
              }}
              className="fb-input"
              style={{
                paddingLeft: "32px",
                width: "100%",
                height: "36px",
                fontSize: "13px",
              }}
            />
          </div>

          {/* Status Filter Pills */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--fb-slate-100)",
              borderRadius: "var(--fb-radius-md)",
              padding: "2px",
            }}
          >
            {(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={`fb-btn ${statusFilter === st ? "fb-btn-primary" : "fb-btn-ghost"} fb-btn-xs`}
                style={{ height: "30px", padding: "0 10px", fontSize: "11px" }}
                onClick={() => {
                  setStatusFilter(st);
                  pagination.resetPage();
                }}
              >
                {st === "ALL"
                  ? "All"
                  : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--fb-slate-100)",
              borderRadius: "var(--fb-radius-md)",
              padding: "2px",
            }}
          >
            <button
              type="button"
              className={`fb-btn ${viewMode === "GRID" ? "fb-btn-primary" : "fb-btn-ghost"} fb-btn-xs`}
              style={{ height: "30px", padding: "0 10px", fontSize: "11px" }}
              onClick={() => setViewMode("GRID")}
            >
              ⊞ Grid
            </button>
            <button
              type="button"
              className={`fb-btn ${viewMode === "TABLE" ? "fb-btn-primary" : "fb-btn-ghost"} fb-btn-xs`}
              style={{ height: "30px", padding: "0 10px", fontSize: "11px" }}
              onClick={() => setViewMode("TABLE")}
            >
              ☰ Table
            </button>
          </div>

          <button
            id="workflow-create-btn"
            type="button"
            className="fb-btn fb-btn-primary"
            style={{
              height: "36px",
              padding: "0 14px",
              fontSize: "13px",
              gap: "6px",
            }}
            onClick={() => setIsCreateOpen(true)}
          >
            <PlusIcon size={14} />
            <span>Create Workflow</span>
          </button>
        </div>
      </div>

      {/* Creation Modal */}
      {isCreateOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1500,
            padding: "1rem",
          }}
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "var(--fb-radius-xl)",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "var(--fb-shadow-xl)",
              border: "1px solid var(--fb-border-subtle)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "#e0e7ff",
                    color: "var(--fb-brand-indigo)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <WorkflowIcon size={18} />
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--fb-slate-900)",
                  }}
                >
                  Create New Workflow
                </h3>
              </div>
              <button
                type="button"
                className="fb-btn fb-btn-ghost fb-btn-xs"
                onClick={() => setIsCreateOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                className="fb-form-label"
                style={{ fontSize: "12px", marginBottom: "4px" }}
              >
                Workflow Title
              </label>
              <input
                id="modal-workflow-name"
                type="text"
                className="fb-input fb-btn--full"
                placeholder="e.g. Commercial HVAC Inspection & Signoff"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                className="fb-form-label"
                style={{ fontSize: "12px", marginBottom: "6px" }}
              >
                Choose Starting Blueprint
              </label>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {TEMPLATES.map((tmpl) => (
                  <label
                    key={tmpl.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "var(--fb-radius-md)",
                      border: `1.5px solid ${selectedTemplate === tmpl.id ? "var(--fb-brand-indigo)" : "var(--fb-border-subtle)"}`,
                      background:
                        selectedTemplate === tmpl.id ? "#f5f3ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <input
                      type="radio"
                      name="workflow-template"
                      checked={selectedTemplate === tmpl.id}
                      onChange={() => setSelectedTemplate(tmpl.id)}
                      style={{ marginTop: "3px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--fb-slate-900)",
                        }}
                      >
                        {tmpl.icon} {tmpl.title}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--fb-slate-500)",
                          marginTop: "2px",
                        }}
                      >
                        {tmpl.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                type="button"
                className="fb-btn fb-btn-ghost"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="fb-btn fb-btn-primary"
                onClick={handleCreate}
                disabled={!workflowName.trim() || createMutation.isPending}
              >
                {createMutation.isPending
                  ? "Creating…"
                  : "Launch Studio Canvas →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          className="fb-alert fb-alert-error"
          style={{ marginBottom: "1rem" }}
        >
          Failed to load workflows. Please check your connection.
        </div>
      )}

      {/* Visual Cards Grid View */}
      {viewMode === "GRID" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          {isLoading && (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "4rem 1rem",
                color: "var(--fb-slate-400)",
              }}
            >
              Loading workflow templates…
            </div>
          )}

          {!isLoading && workflows.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                background: "#ffffff",
                borderRadius: "var(--fb-radius-lg)",
                padding: "4rem 2rem",
                textAlign: "center",
                border: "1px dashed var(--fb-border-medium)",
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>📋</div>
              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--fb-slate-900)",
                }}
              >
                No workflows found
              </h3>
              <p
                style={{
                  margin: "0 0 16px",
                  fontSize: "13px",
                  color: "var(--fb-slate-500)",
                }}
              >
                {search
                  ? `No workflows match "${search}".`
                  : "Get started by creating your first field workflow."}
              </p>
              <button
                type="button"
                className="fb-btn fb-btn-primary"
                onClick={() => setIsCreateOpen(true)}
              >
                + Create Workflow
              </button>
            </div>
          )}

          {workflows.map((w) => (
            <div
              key={w.id}
              style={{
                background: "#ffffff",
                borderRadius: "var(--fb-radius-lg)",
                border: "1px solid var(--fb-border-subtle)",
                boxShadow: "var(--fb-shadow-xs)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.15s ease",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    className={`fb-status fb-status--${w.status.toLowerCase()}`}
                    style={{ fontSize: "10px", padding: "1px 6px" }}
                  >
                    {w.status}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: "var(--fb-slate-100)",
                      color: "var(--fb-slate-600)",
                    }}
                  >
                    Rev {w.revision}
                  </span>
                </div>

                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--fb-slate-900)",
                    lineHeight: 1.3,
                  }}
                >
                  {w.name}
                </h3>

                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: "12px",
                    color: "var(--fb-slate-500)",
                    lineHeight: 1.4,
                    minHeight: "34px",
                  }}
                >
                  {w.description ||
                    "Multi-section execution workflow with structured inputs and verification."}
                </p>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--fb-border-subtle)",
                  paddingTop: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <span
                    style={{ fontSize: "11px", color: "var(--fb-slate-400)" }}
                  >
                    Updated{" "}
                    {w.updatedAt
                      ? new Date(w.updatedAt).toLocaleDateString()
                      : "Recently"}
                  </span>
                  <Link
                    to="/workflows/$id/versions"
                    params={{ id: w.id }}
                    style={{
                      fontSize: "11px",
                      color: "var(--fb-brand-indigo)",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    Versions History
                  </Link>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <Link
                    to="/workflows/$id/builder"
                    params={{ id: w.id }}
                    className="fb-btn fb-btn-primary fb-btn-sm"
                    style={{
                      flex: 1,
                      fontSize: "12px",
                      gap: "4px",
                      justifyContent: "center",
                    }}
                  >
                    <WorkflowIcon size={13} />
                    <span>Open Studio</span>
                  </Link>
                  <Link
                    to="/workflows/$id/rules"
                    params={{ id: w.id }}
                    className="fb-btn fb-btn-secondary fb-btn-sm"
                    style={{ fontSize: "12px", padding: "0 10px" }}
                    title="Configure Rules & Logic"
                  >
                    <AdminIcon size={13} />
                    <span>Rules</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enterprise Data Table View */}
      {viewMode === "TABLE" && (
        <div
          className="fb-table-container"
          style={{ width: "100%", marginBottom: "1.5rem" }}
        >
          <table className="fb-table" role="grid">
            <thead>
              <tr>
                <th scope="col">Workflow Title</th>
                <th scope="col">Status</th>
                <th scope="col">Revision</th>
                <th scope="col">Last Modified</th>
                <th scope="col" style={{ textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="fb-table-loading">
                    Loading workflow registry…
                  </td>
                </tr>
              )}
              {!isLoading && workflows.length === 0 && (
                <tr>
                  <td colSpan={5} className="fb-table-empty">
                    No workflows match the selected criteria.
                  </td>
                </tr>
              )}
              {workflows.map((w) => (
                <tr key={w.id}>
                  <td>
                    <div
                      style={{ fontWeight: 600, color: "var(--fb-slate-900)" }}
                    >
                      {w.name}
                    </div>
                    <div
                      style={{ fontSize: "11px", color: "var(--fb-slate-500)" }}
                    >
                      {w.description || "General field checklist"}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`fb-status fb-status--${w.status.toLowerCase()}`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td>
                    <span className="fb-badge">Rev {w.revision}</span>
                  </td>
                  <td
                    style={{ fontSize: "12px", color: "var(--fb-slate-500)" }}
                  >
                    {w.updatedAt ? new Date(w.updatedAt).toLocaleString() : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      <Link
                        to="/workflows/$id/builder"
                        params={{ id: w.id }}
                        className="fb-btn fb-btn-primary fb-btn-xs"
                      >
                        Studio Canvas
                      </Link>
                      <Link
                        to="/workflows/$id/rules"
                        params={{ id: w.id }}
                        className="fb-btn fb-btn-secondary fb-btn-xs"
                      >
                        Rules
                      </Link>
                      <Link
                        to="/workflows/$id/versions"
                        params={{ id: w.id }}
                        className="fb-btn fb-btn-ghost fb-btn-xs"
                      >
                        Versions
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={data?.total ?? 0}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        disabled={isLoading}
        label="Workflows pagination"
      />
    </div>
  );
}
