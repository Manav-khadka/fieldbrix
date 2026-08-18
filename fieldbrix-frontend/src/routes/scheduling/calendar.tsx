import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { RecurrenceForm } from "./recurrence-form";

interface RecurrencePlan {
  id: string;
  name: string;
  frequency: string;
  intervalCount: number;
  lookaheadDays: number;
  priority: string;
  active: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export function SchedulingCalendarPage() {
  const [creating, setCreating] = useState(false);

  const { data: recurrences, isLoading } = useQuery({
    queryKey: ["recurrences"],
    queryFn: () => api.get<RecurrencePlan[]>("/recurrences"),
  });

  const plans = Array.isArray(recurrences) ? recurrences : [];

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Recurring Maintenance & Schedules</h1>
          <p className="fb-page-subtitle">
            Configure automated recurring service plans and lookahead generation
          </p>
        </div>
        <button
          id="recurrence-add"
          className="fb-btn fb-btn--primary"
          onClick={() => setCreating((open) => !open)}
        >
          {creating ? "Cancel" : "+ New Recurring Plan"}
        </button>
      </div>

      {creating && <RecurrenceForm onDone={() => setCreating(false)} />}

      <div className="fb-table-container">
        <table className="fb-table">
          <thead>
            <tr>
              <th>Plan Name</th>
              <th>Frequency</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Start Date</th>
              <th>End Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="fb-table-loading">
                  Loading schedules…
                </td>
              </tr>
            )}
            {!isLoading && plans.length === 0 && (
              <tr>
                <td colSpan={6} className="fb-table-empty">
                  No recurring maintenance plans configured. Click "+ New Recurring Plan" to start.
                </td>
              </tr>
            )}
            {plans.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                </td>
                <td>
                  <span className="fb-badge">
                    {p.frequency} (Every {p.intervalCount || 1})
                  </span>
                </td>
                <td>
                  <span className={`fb-badge fb-badge--${p.priority.toLowerCase()}`}>
                    {p.priority}
                  </span>
                </td>
                <td>
                  <span
                    className={`fb-status fb-status--${p.active ? "active" : "cancelled"}`}
                  >
                    {p.active ? "Active" : "Paused"}
                  </span>
                </td>
                <td>{p.startDate}</td>
                <td>{p.endDate ?? "Indefinite"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
