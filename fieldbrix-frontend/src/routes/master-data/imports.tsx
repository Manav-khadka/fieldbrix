import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

interface ImportJob {
  id: string;
  entityType: string;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  previewRevision: number;
  createdAt: string;
}

const ENTITY_TYPES = ["customers", "sites", "service_targets", "parts", "users"];

export function ImportsPage() {
  const [entityType, setEntityType] = useState("customers");
  const [duplicateMode, setDuplicateMode] = useState<
    "reject" | "skip" | "update"
  >("reject");
  const [rows, setRows] = useState<string>("");
  const [previewResult, setPreviewResult] = useState<ImportJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: recentJobs, refetch } = useQuery({
    queryKey: ["imports", "recent"],
    queryFn: () =>
      api
        .get<{ items: ImportJob[] }>("/imports?limit=10")
        .catch(() => ({ items: [] })),
  });

  const handlePreview = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const parsed = JSON.parse(rows) as Record<string, unknown>[];
      const result = await api.post<ImportJob>("/imports/preview", {
        entityType,
        duplicateMode,
        rows: parsed,
      });
      setPreviewResult(result);
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "Invalid JSON — paste rows as a JSON array"
          : String((err as { message?: string }).message ?? err),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommit = async () => {
    if (!previewResult) return;
    setSubmitting(true);
    try {
      await api.post(`/imports/${previewResult.id}/commit`, {
        previewRevision: previewResult.previewRevision,
      });
      await refetch();
      setPreviewResult(null);
      setRows("");
    } catch (err) {
      setError(String((err as { message?: string }).message ?? err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Imports</h1>
          <p className="fb-page-subtitle">
            Preview and commit spreadsheet imports
          </p>
        </div>
      </div>

      <div className="fb-card">
        <div className="fb-form-row">
          <label htmlFor="import-entity-type" className="fb-label">
            Entity type
          </label>
          <select
            id="import-entity-type"
            className="fb-select"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="fb-form-row">
          <label htmlFor="import-duplicate-mode" className="fb-label">
            Duplicate mode
          </label>
          <select
            id="import-duplicate-mode"
            className="fb-select"
            value={duplicateMode}
            onChange={(e) =>
              setDuplicateMode(e.target.value as typeof duplicateMode)
            }
          >
            <option value="reject">Reject duplicates</option>
            <option value="skip">Skip duplicates</option>
            <option value="update">Update duplicates</option>
          </select>
        </div>
        <div className="fb-form-row">
          <label htmlFor="import-rows" className="fb-label">
            Rows (JSON array)
          </label>
          <textarea
            id="import-rows"
            className="fb-textarea"
            rows={6}
            value={rows}
            onChange={(e) => setRows(e.target.value)}
            placeholder={`[{"name":"Acme Corp","code":"ACM"}]`}
          />
        </div>
        {error && <div className="fb-error">{error}</div>}
        {previewResult && (
          <div className="fb-import-preview">
            <p>
              Preview ready:{" "}
              <strong>{previewResult.validRows ?? 0} valid</strong>,{" "}
              {previewResult.errorRows ?? 0} errors
            </p>
            <button
              id="import-commit"
              className="fb-btn fb-btn--primary"
              onClick={handleCommit}
              disabled={submitting}
            >
              {submitting ? "Committing…" : "Commit Import"}
            </button>
          </div>
        )}
        {!previewResult && (
          <button
            id="import-preview"
            className="fb-btn fb-btn--primary"
            onClick={handlePreview}
            disabled={submitting || !rows.trim()}
          >
            {submitting ? "Previewing…" : "Preview Import"}
          </button>
        )}
      </div>

      {recentJobs?.items && recentJobs.items.length > 0 && (
        <div className="fb-card" style={{ marginTop: "1.5rem" }}>
          <h2 className="fb-card-title">Recent Imports</h2>
          <table className="fb-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.items.map((job) => (
                <tr key={job.id}>
                  <td>{job.entityType}</td>
                  <td>
                    <span
                      className={`fb-status fb-status--${job.status.toLowerCase()}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td>{job.totalRows}</td>
                  <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
