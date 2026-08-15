import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

interface TeamCapacity {
  teamId: string;
  name: string;
  scheduled: number;
  total: number;
}
interface CapacityResponse {
  window: string;
  teams: TeamCapacity[];
}

export function CapacityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['scheduling', 'capacity'],
    queryFn: () => api.get<CapacityResponse>('/scheduling/capacity'),
    refetchInterval: 60_000, // refresh every minute
  });

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Capacity</h1>
          <p className="fb-page-subtitle">{data?.window ?? 'This week'}</p>
        </div>
      </div>

      {isLoading && <p className="fb-table-loading">Loading…</p>}

      <div className="fb-capacity-grid">
        {data?.teams.map((team) => {
          const util = team.total > 0 ? Math.round((team.scheduled / team.total) * 100) : 0;
          return (
            <div key={team.teamId} className="fb-capacity-card">
              <h2 className="fb-capacity-team">{team.name}</h2>
              <div className="fb-capacity-stats">
                <span className="fb-capacity-scheduled">{team.scheduled}</span>
                <span className="fb-capacity-sep">/</span>
                <span className="fb-capacity-total">{team.total}</span>
              </div>
              <div className="fb-capacity-bar-bg">
                <div
                  className="fb-capacity-bar"
                  style={{ width: `${Math.min(util, 100)}%`, '--util': `${util}%` } as React.CSSProperties}
                  role="progressbar"
                  aria-valuenow={util}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${util}% utilization`}
                />
              </div>
              <span className="fb-capacity-util">{util}% utilization</span>
            </div>
          );
        })}
        {!isLoading && !data?.teams.length && (
          <p className="fb-table-empty">No team capacity data available</p>
        )}
      </div>
    </div>
  );
}
