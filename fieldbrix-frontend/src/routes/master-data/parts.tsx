import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

interface Part {
  id: string;
  name: string;
  code: string;
  unit: string;
  createdAt: string;
}

export function PartsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["parts", { search, page }],
    queryFn: () =>
      api.get<{ items: Part[]; total: number; page: number; limit: number }>(
        `/parts?search=${encodeURIComponent(search)}&page=${page}&limit=20`,
      ),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Parts</h1>
          <p className="fb-page-subtitle">{data?.total ?? 0} total records</p>
        </div>
      </div>
      <div className="fb-toolbar">
        <input
          id="parts-search"
          type="search"
          placeholder="Search by name or code…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="fb-search-input"
        />
      </div>
      {error && <div className="fb-error">Failed to load parts</div>}
      <div className="fb-table-container">
        <table className="fb-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Code</th>
              <th scope="col">Unit</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="fb-table-loading">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={4} className="fb-table-empty">
                  No parts found
                </td>
              </tr>
            )}
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  <span className="fb-badge">{p.code}</span>
                </td>
                <td>{p.unit}</td>
                <td>
                  {p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString()
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
            id="parts-prev"
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
            id="parts-next"
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
