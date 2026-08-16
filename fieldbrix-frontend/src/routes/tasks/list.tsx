import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../../api/client";

interface Task {
  id: string;
  number: string;
  description: string;
  status: string;
  priority: string;
  scheduledAt?: string;
  revision: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in-progress",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REOPENED: "reopened",
};

export function TasksListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", { search, status, page }],
    queryFn: () =>
      api.get<{ items: Task[]; total: number; page: number; limit: number }>(
        `/tasks?search=${encodeURIComponent(search)}&status=${status}&page=${page}&limit=20`,
      ),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Tasks</h1>
          <p className="fb-page-subtitle">{data?.total ?? 0} total tasks</p>
        </div>
      </div>

      <div className="fb-toolbar">
        <input
          id="tasks-search"
          type="search"
          placeholder="Search by number or description…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="fb-search-input"
        />
        <select
          id="tasks-status-filter"
          className="fb-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="fb-error">Failed to load tasks</div>}

      <div className="fb-table-container">
        <table className="fb-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Number</th>
              <th scope="col">Description</th>
              <th scope="col">Status</th>
              <th scope="col">Priority</th>
              <th scope="col">Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="fb-table-loading">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={5} className="fb-table-empty">
                  No tasks found
                </td>
              </tr>
            )}
            {data?.items.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link
                    to="/tasks/$id"
                    params={{ id: t.id }}
                    className="fb-link fb-link--mono"
                  >
                    {t.number}
                  </Link>
                </td>
                <td className="fb-table-description">{t.description || "—"}</td>
                <td>
                  <span
                    className={`fb-status fb-status--${STATUS_COLORS[t.status] ?? "draft"}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td>
                  <span
                    className={`fb-priority fb-priority--${(t.priority ?? "NORMAL").toLowerCase()}`}
                  >
                    {t.priority ?? "NORMAL"}
                  </span>
                </td>
                <td>
                  {t.scheduledAt
                    ? new Date(t.scheduledAt).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.limit && (
        <div className="fb-pagination">
          <button
            id="tasks-prev"
            className="fb-btn fb-btn--ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Prev
          </button>
          <span className="fb-pagination-info">
            Page {data.page} of {Math.ceil(data.total / data.limit)}
          </span>
          <button
            id="tasks-next"
            className="fb-btn fb-btn--ghost"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * data.limit >= data.total}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
