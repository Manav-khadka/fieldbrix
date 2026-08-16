import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { api } from "../../api/client";

interface WorkflowVersion {
  id: string;
  version: number;
  hash: string;
  publishedAt: string;
}

export function WorkflowVersionsPage() {
  const { id } = useParams({ from: "/layout/workflows/$id/versions" });

  const { data: versions, isLoading } = useQuery({
    queryKey: ["workflow-versions", id],
    queryFn: () => api.get<WorkflowVersion[]>(`/workflows/${id}/versions`),
  });

  return (
    <div className="fb-page">
      <h1 className="fb-page-title">Workflow Versions</h1>
      {isLoading && <p className="fb-table-loading">Loading…</p>}
      <div className="fb-table-container">
        <table className="fb-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Version</th>
              <th scope="col">Hash</th>
              <th scope="col">Published</th>
            </tr>
          </thead>
          <tbody>
            {versions?.map((v) => (
              <tr key={v.id}>
                <td>
                  <span className="fb-badge">v{v.version}</span>
                </td>
                <td>
                  <span className="fb-code">{v.hash?.slice(0, 12)}…</span>
                </td>
                <td>
                  {v.publishedAt
                    ? new Date(v.publishedAt).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
            {!isLoading && !versions?.length && (
              <tr>
                <td colSpan={3} className="fb-table-empty">
                  No published versions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
