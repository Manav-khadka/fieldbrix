import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api } from '../../api/client';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  revision: number;
  updatedAt: string;
}

export function WorkflowsListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['workflows', { search, status, page }],
    queryFn: () =>
      api.get<{ items: Workflow[]; total: number; page: number; limit: number }>(
        `/workflows?search=${encodeURIComponent(search)}&status=${status}&page=${page}&limit=20`,
      ),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post<Workflow>('/workflows', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });

  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createMutation.mutateAsync(newName.trim());
    setNewName('');
  };

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Workflows</h1>
          <p className="fb-page-subtitle">{data?.total ?? 0} total drafts</p>
        </div>
        <div className="fb-page-actions">
          <input id="workflow-new-name" type="text" className="fb-input" placeholder="New workflow name…" value={newName}
            onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }} />
          <button id="workflow-create" className="fb-btn fb-btn--primary" onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
            + New Workflow
          </button>
        </div>
      </div>

      <div className="fb-toolbar">
        <input id="workflows-search" type="search" placeholder="Search by name…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="fb-search-input" />
        <select id="workflows-status-filter" className="fb-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {error && <div className="fb-error">Failed to load workflows</div>}

      <div className="fb-table-container">
        <table className="fb-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
              <th scope="col">Revision</th>
              <th scope="col">Updated</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="fb-table-loading">Loading…</td></tr>}
            {!isLoading && data?.items.length === 0 && <tr><td colSpan={5} className="fb-table-empty">No workflows found</td></tr>}
            {data?.items.map((w) => (
              <tr key={w.id}>
                <td>{w.name}</td>
                <td><span className={`fb-status fb-status--${w.status.toLowerCase()}`}>{w.status}</span></td>
                <td>v{w.revision}</td>
                <td>{w.updatedAt ? new Date(w.updatedAt).toLocaleDateString() : '—'}</td>
                <td>
                  <Link to="/workflows/$id/builder" params={{ id: w.id }} className="fb-link">
                    Edit
                  </Link>
                  {' · '}
                  <Link to="/workflows/$id/versions" params={{ id: w.id }} className="fb-link">
                    Versions
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.limit && (
        <div className="fb-pagination">
          <button id="workflows-prev" className="fb-btn fb-btn--ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span className="fb-pagination-info">Page {data.page} of {Math.ceil(data.total / data.limit)}</span>
          <button id="workflows-next" className="fb-btn fb-btn--ghost" onClick={() => setPage((p) => p + 1)} disabled={page * data.limit >= data.total}>Next →</button>
        </div>
      )}
    </div>
  );
}
