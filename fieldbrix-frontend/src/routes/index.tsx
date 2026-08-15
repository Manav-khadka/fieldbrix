import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function OverviewPage() {
  const { data: customers } = useQuery({
    queryKey: ['customers', 'count'],
    queryFn: () => api.get<{ total: number }>('/customers?limit=1'),
    retry: false,
  });
  const { data: workflows } = useQuery({
    queryKey: ['workflows', 'count'],
    queryFn: () => api.get<{ total: number }>('/workflows?limit=1'),
    retry: false,
  });
  const { data: tasks } = useQuery({
    queryKey: ['tasks', 'count'],
    queryFn: () => api.get<{ total: number }>('/tasks?limit=1'),
    retry: false,
  });

  const stats = [
    { label: 'Customers', value: customers?.total ?? '—', icon: '◎', color: 'var(--c-accent-blue)' },
    { label: 'Workflows', value: workflows?.total ?? '—', icon: '◌', color: 'var(--c-accent-green)' },
    { label: 'Tasks', value: tasks?.total ?? '—', icon: '⌁', color: 'var(--c-accent-amber)' },
  ];

  return (
    <div className="fb-page">
      <h1 className="fb-page-title">Overview</h1>
      <p className="fb-page-subtitle">Workspace pulse</p>
      <div className="fb-stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="fb-stat-card" style={{ '--accent': stat.color } as React.CSSProperties}>
            <span className="fb-stat-icon">{stat.icon}</span>
            <div className="fb-stat-body">
              <span className="fb-stat-value">{String(stat.value)}</span>
              <span className="fb-stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
