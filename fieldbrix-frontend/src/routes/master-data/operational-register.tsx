import { useMemo, useState } from "react";
import { Pagination } from "../../components/ui/Pagination";

export interface RegisterRecord {
  id: string;
  name: string;
  code: string;
  [key: string]: unknown;
}

export interface RegisterColumn<T extends RegisterRecord> {
  key: keyof T & string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object")
    return Object.values(value).filter(Boolean).join(", ") || "—";
  return String(value);
}

export function OperationalRegister<T extends RegisterRecord>({
  title,
  subtitle,
  noun,
  items,
  total,
  columns,
  defaultColumns,
  stats,
  search,
  onSearch,
  onAdd,
  onEdit,
  loading,
  error,
  page,
  limit,
  onPage,
  onLimit,
  children,
}: {
  title: string;
  subtitle: string;
  noun: string;
  items: T[];
  total: number;
  columns: RegisterColumn<T>[];
  defaultColumns: string[];
  stats: { label: string; value: string | number; detail: string }[];
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  loading: boolean;
  error: boolean;
  page: number;
  limit: number;
  onPage: (page: number) => void;
  onLimit: (limit: number) => void;
  children?: React.ReactNode;
}) {
  const [selected, setSelected] = useState(defaultColumns);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visible = columns.filter((column) => selectedSet.has(column.key));
  const toggle = (key: string) => {
    if (key === "name") return;
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  return (
    <div className="fb-page fb-operational-register">
      <div className="fb-page-header fb-register-header">
        <div>
          <span className="fb-register-kicker">Operational master data</span>
          <h1 className="fb-page-title">{title}</h1>
          <p className="fb-page-subtitle">{subtitle}</p>
        </div>
        <button className="fb-btn fb-btn--primary" onClick={onAdd}>
          + Add {noun}
        </button>
      </div>

      {children}

      <div className="fb-register-stats">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.detail}</small>
          </article>
        ))}
      </div>

      <div className="fb-card fb-register-toolbar">
        <input
          type="search"
          className="fb-input"
          value={search}
          placeholder={`Search ${title.toLowerCase()}, contacts and configured fields…`}
          onChange={(event) => onSearch(event.target.value)}
        />
        <details className="fb-column-picker">
          <summary>
            Columns · {visible.length} of {columns.length}
          </summary>
          <div className="fb-column-picker__panel">
            <div className="fb-column-picker__heading">
              <strong>Choose visible columns</strong>
              <span>All fields remain stored when hidden.</span>
            </div>
            <div className="fb-column-picker__list">
              {columns.map((column) => (
                <label key={column.key}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(column.key)}
                    disabled={column.key === "name"}
                    onChange={() => toggle(column.key)}
                  />
                  <span>{column.label}</span>
                  <small>Configured</small>
                </label>
              ))}
            </div>
          </div>
        </details>
      </div>

      {error ? (
        <div className="fb-error">Unable to load {title.toLowerCase()}</div>
      ) : null}
      <section className="fb-card fb-register-table-card">
        <div className="fb-register-table-scroll">
          <table className="fb-table fb-register-table">
            <thead>
              <tr>
                {visible.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visible.length}>
                    Loading {title.toLowerCase()}…
                  </td>
                </tr>
              ) : null}
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={visible.length}>
                    No {title.toLowerCase()} match this view.
                  </td>
                </tr>
              ) : null}
              {items.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onEdit(row.id)}
                  className="fb-table-row--clickable"
                >
                  {visible.map((column) => (
                    <td key={column.key}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : displayValue(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={limit}
          total={total}
          onPageChange={onPage}
          onPageSizeChange={onLimit}
          disabled={loading}
          label={`${title} table pagination`}
        />
      </section>
    </div>
  );
}
