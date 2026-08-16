import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { api } from "../../api/client";
import { CustomerForm } from "./customer-form";

interface Customer {
  id: string;
  name: string;
  code: string;
  status: string;
  revision: number;
  createdAt: string;
}

const columnHelper = createColumnHelper<Customer>();
const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("code", {
    header: "Code",
    cell: (info) => <span className="fb-badge">{info.getValue()}</span>,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const status = info.getValue() ?? "ACTIVE";
      return (
        <span className={`fb-status fb-status--${status.toLowerCase()}`}>
          {status}
        </span>
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (info) =>
      info.getValue() ? new Date(info.getValue()).toLocaleDateString() : "—",
  }),
];

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Customers</h1>
          <p className="fb-page-subtitle">{data?.total ?? 0} total records</p>
        </div>
        <button
          id="customers-add"
          className="fb-btn fb-btn--primary"
          onClick={() => {
            setEditingId(null);
            setCreating((open) => !open);
          }}
        >
          {creating ? "Cancel" : "+ Add customer"}
        </button>
      </div>

      {creating && (
        <CustomerForm onDone={() => setCreating(false)} />
      )}
      {editingId && (
        <CustomerForm
          customerId={editingId}
          onDone={() => setEditingId(null)}
        />
      )}

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
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} scope="col">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={columns.length} className="fb-table-loading">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="fb-table-empty">
                  No customers found
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="fb-table-row--clickable"
                onClick={() => {
                  setCreating(false);
                  setEditingId(row.original.id);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
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
