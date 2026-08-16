import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

interface Customer {
  id: string;
  name: string;
  code: string;
  status: string;
  revision: number;
  createdAt: string;
}

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", { search, page }],
    queryFn: () =>
      api.get<{
        items: Customer[];
        total: number;
        page: number;
        limit: number;
      }>(
        `/customers?search=${encodeURIComponent(search)}&page=${page}&limit=20`,
      ),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Customers</h1>
          <p className="fb-page-subtitle">{data?.total ?? 0} total records</p>
        </div>
      </div>

      <div className="fb-toolbar">
        <input
          id="customers-search"
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

      {error && <div className="fb-error">Failed to load customers</div>}

      <div className="fb-table-container">
        <table className="fb-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Code</th>
              <th scope="col">Status</th>
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
                  No customers found
                </td>
              </tr>
            )}
            {data?.items.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  <span className="fb-badge">{c.code}</span>
                </td>
                <td>
                  <span
                    className={`fb-status fb-status--${(c.status ?? "ACTIVE").toLowerCase()}`}
                  >
                    {c.status ?? "ACTIVE"}
                  </span>
                </td>
                <td>
                  {c.createdAt
                    ? new Date(c.createdAt).toLocaleDateString()
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
            id="customers-prev"
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
            id="customers-next"
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
