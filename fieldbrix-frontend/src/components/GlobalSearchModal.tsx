import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import {
  SearchIcon,
  TaskIcon,
  CustomersIcon,
  SitesIcon,
  WorkflowIcon,
} from "./icons";

interface SearchTask {
  id: string;
  number?: string;
  taskNumber?: string;
  description: string;
  status: string;
}

interface SearchCustomer {
  id: string;
  name: string;
  code?: string;
}

interface SearchSite {
  id: string;
  name: string;
  customerName?: string;
}

interface SearchWorkflow {
  id: string;
  name: string;
  status: string;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Tasks Query
  const { data: tasksData } = useQuery({
    queryKey: ["global-search", "tasks", query],
    queryFn: () =>
      api.get<{ items: SearchTask[] }>(
        `/tasks?search=${encodeURIComponent(query)}&limit=5`,
      ),
    enabled: isOpen && query.trim().length > 0,
    retry: false,
  });

  // Customers Query
  const { data: customersData } = useQuery({
    queryKey: ["global-search", "customers", query],
    queryFn: () =>
      api.get<{ items: SearchCustomer[] }>(
        `/customers?search=${encodeURIComponent(query)}&limit=5`,
      ),
    enabled: isOpen && query.trim().length > 0,
    retry: false,
  });

  // Sites Query
  const { data: sitesData } = useQuery({
    queryKey: ["global-search", "sites", query],
    queryFn: () =>
      api.get<{ items: SearchSite[] }>(
        `/sites?search=${encodeURIComponent(query)}&limit=5`,
      ),
    enabled: isOpen && query.trim().length > 0,
    retry: false,
  });

  // Workflows Query
  const { data: workflowsData } = useQuery({
    queryKey: ["global-search", "workflows", query],
    queryFn: () =>
      api.get<{ items: SearchWorkflow[] }>(
        `/workflows?search=${encodeURIComponent(query)}&limit=5`,
      ),
    enabled: isOpen && query.trim().length > 0,
    retry: false,
  });

  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData]);
  const customers = useMemo(() => customersData?.items ?? [], [customersData]);
  const sites = useMemo(() => sitesData?.items ?? [], [sitesData]);
  const workflows = useMemo(() => workflowsData?.items ?? [], [workflowsData]);

  if (!isOpen) return null;

  const handleSelectTask = (id: string) => {
    onClose();
    void navigate({ to: "/tasks/$id", params: { id } });
  };

  const handleSelectCustomer = () => {
    onClose();
    void navigate({ to: "/master-data/customers" });
  };

  const handleSelectSite = () => {
    onClose();
    void navigate({ to: "/master-data/sites" });
  };

  const handleSelectWorkflow = (id: string) => {
    onClose();
    void navigate({ to: "/workflows/$id/builder", params: { id } });
  };

  const hasResults =
    tasks.length > 0 ||
    customers.length > 0 ||
    sites.length > 0 ||
    workflows.length > 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "#ffffff",
          borderRadius: "var(--fb-radius-lg)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          border: "1px solid var(--fb-border-subtle)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--fb-border-subtle)",
            background: "var(--fb-slate-50)",
          }}
        >
          <SearchIcon size={20} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, clients, sites, workflows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: "15px",
              fontWeight: 500,
              color: "var(--fb-slate-900)",
              outline: "none",
            }}
          />
          <kbd
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#ffffff",
              border: "1px solid var(--fb-border-subtle)",
              fontSize: "11px",
              color: "var(--fb-slate-500)",
              fontFamily: "var(--fb-font-mono)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          style={{
            maxHeight: "420px",
            overflowY: "auto",
            padding: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {query.trim().length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "2.5rem 1rem",
                color: "var(--fb-slate-400)",
                fontSize: "13px",
              }}
            >
              Type anything to search across all clients, dispatches, and workflows.
            </div>
          )}

          {query.trim().length > 0 && !hasResults && (
            <div
              style={{
                textAlign: "center",
                padding: "2.5rem 1rem",
                color: "var(--fb-slate-500)",
                fontSize: "13px",
              }}
            >
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Tasks Section */}
          {tasks.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--fb-slate-400)",
                  textTransform: "uppercase",
                  padding: "0.25rem 0.5rem",
                }}
              >
                Tasks ({tasks.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleSelectTask(task.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "var(--fb-radius-md)",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--fb-slate-100)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <TaskIcon size={16} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "13px",
                          color: "var(--fb-brand-indigo)",
                        }}
                      >
                        {task.taskNumber || task.number || task.id.slice(0, 8)}
                      </span>
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "13px",
                          color: "var(--fb-slate-800)",
                        }}
                      >
                        {task.description}
                      </span>
                    </div>
                    <span
                      className={`fb-status fb-status--${task.status.toLowerCase()}`}
                      style={{ fontSize: "10px" }}
                    >
                      {task.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customers Section */}
          {customers.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--fb-slate-400)",
                  textTransform: "uppercase",
                  padding: "0.25rem 0.5rem",
                }}
              >
                Clients / Customers ({customers.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {customers.map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={handleSelectCustomer}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "var(--fb-radius-md)",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--fb-slate-100)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <CustomersIcon size={16} />
                    <div style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "var(--fb-slate-900)" }}>
                      {cust.name} {cust.code && <span style={{ color: "var(--fb-slate-500)", fontWeight: 400 }}>({cust.code})</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sites Section */}
          {sites.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--fb-slate-400)",
                  textTransform: "uppercase",
                  padding: "0.25rem 0.5rem",
                }}
              >
                Sites & Locations ({sites.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {sites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={handleSelectSite}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "var(--fb-radius-md)",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--fb-slate-100)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <SitesIcon size={16} />
                    <div style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "var(--fb-slate-900)" }}>
                      {site.name} {site.customerName && <span style={{ color: "var(--fb-slate-500)", fontWeight: 400 }}>· {site.customerName}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Workflows Section */}
          {workflows.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--fb-slate-400)",
                  textTransform: "uppercase",
                  padding: "0.25rem 0.5rem",
                }}
              >
                Workflows ({workflows.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {workflows.map((wf) => (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => handleSelectWorkflow(wf.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "var(--fb-radius-md)",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--fb-slate-100)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <WorkflowIcon size={16} />
                    <div style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "var(--fb-slate-900)" }}>
                      {wf.name}
                    </div>
                    <span
                      className={`fb-status fb-status--${wf.status.toLowerCase()}`}
                      style={{ fontSize: "10px" }}
                    >
                      {wf.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.625rem 1.25rem",
            background: "var(--fb-slate-50)",
            borderTop: "1px solid var(--fb-border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "var(--fb-slate-500)",
          }}
        >
          <span>Use <strong>↑</strong> <strong>↓</strong> to navigate</span>
          <span>Press <strong>ESC</strong> to close</span>
        </div>
      </div>
    </div>
  );
}
