import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../api/client";

interface Customer {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
}

interface Workflow {
  id: string;
  name: string;
  status: string;
  currentVersionId?: string;
}

export function RecurrenceForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<
    "DAILY" | "WEEKDAY" | "WEEKLY" | "MONTHLY" | "CUSTOM"
  >("WEEKLY");
  const [intervalCount, setIntervalCount] = useState(1);
  const [lookaheadDays, setLookaheadDays] = useState(14);
  const [customerId, setCustomerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [workflowVersionId, setWorkflowVersionId] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [instructions, setInstructions] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: customers } = useQuery({
    queryKey: ["customers", "for-recurrence"],
    queryFn: () => api.get<{ items: Customer[] }>("/customers?limit=100"),
  });

  const { data: sites } = useQuery({
    queryKey: ["sites", "for-recurrence", customerId],
    queryFn: () =>
      api.get<{ items: Site[] }>(`/sites?customerId=${customerId}&limit=100`),
    enabled: Boolean(customerId),
  });

  const { data: workflows } = useQuery({
    queryKey: ["workflows", "for-recurrence"],
    queryFn: () => api.get<{ items: Workflow[] }>("/workflows?limit=100"),
  });

  const customerList = customers?.items ?? [];
  const siteList = sites?.items ?? [];
  const publishedWorkflows = (workflows?.items ?? []).filter(
    (w) => w.status === "PUBLISHED" && w.currentVersionId,
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post("/recurrences", {
        name,
        frequency,
        intervalCount,
        lookaheadDays,
        customerId,
        siteId,
        workflowVersionId,
        priority,
        instructions,
        startDate,
        endDate: endDate || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recurrences"] });
      onDone();
    },
    onError: (err: any) => {
      setServerError(err.message ?? "Failed to create recurrence plan");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !customerId || !siteId || !workflowVersionId) {
      setServerError("Please complete all required fields.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <form className="fb-form-card" onSubmit={handleSubmit}>
      <h2 className="fb-card-title">New Recurring Maintenance Plan</h2>
      {serverError && <div className="fb-error-banner">{serverError}</div>}

      <div className="fb-form-row">
        <label htmlFor="rec-name" className="fb-label">
          Plan Name *
        </label>
        <input
          id="rec-name"
          type="text"
          className="fb-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Monthly Chiller Service"
          required
        />
      </div>

      <div className="fb-form-grid">
        <div className="fb-form-row">
          <label htmlFor="rec-frequency" className="fb-label">
            Frequency *
          </label>
          <select
            id="rec-frequency"
            className="fb-select"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKDAY">Weekdays (Mon-Fri)</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>

        <div className="fb-form-row">
          <label htmlFor="rec-interval" className="fb-label">
            Interval Count
          </label>
          <input
            id="rec-interval"
            type="number"
            min={1}
            className="fb-input"
            value={intervalCount}
            onChange={(e) => setIntervalCount(parseInt(e.target.value, 10) || 1)}
          />
        </div>
      </div>

      <div className="fb-form-grid">
        <div className="fb-form-row">
          <label htmlFor="rec-lookahead" className="fb-label">
            Lookahead Days
          </label>
          <input
            id="rec-lookahead"
            type="number"
            min={1}
            max={90}
            className="fb-input"
            value={lookaheadDays}
            onChange={(e) => setLookaheadDays(parseInt(e.target.value, 10) || 14)}
          />
        </div>

        <div className="fb-form-row">
          <label htmlFor="rec-priority" className="fb-label">
            Priority
          </label>
          <select
            id="rec-priority"
            className="fb-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      <div className="fb-form-grid">
        <div className="fb-form-row">
          <label htmlFor="rec-customer" className="fb-label">
            Customer *
          </label>
          <select
            id="rec-customer"
            className="fb-select"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setSiteId("");
            }}
            required
          >
            <option value="">Select customer…</option>
            {customerList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="fb-form-row">
          <label htmlFor="rec-site" className="fb-label">
            Site *
          </label>
          <select
            id="rec-site"
            className="fb-select"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            disabled={!customerId}
            required
          >
            <option value="">Select site…</option>
            {siteList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="fb-form-row">
        <label htmlFor="rec-workflow" className="fb-label">
          Workflow *
        </label>
        <select
          id="rec-workflow"
          className="fb-select"
          value={workflowVersionId}
          onChange={(e) => setWorkflowVersionId(e.target.value)}
          required
        >
          <option value="">Select published workflow…</option>
          {publishedWorkflows.map((w) => (
            <option key={w.id} value={w.currentVersionId}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div className="fb-form-grid">
        <div className="fb-form-row">
          <label htmlFor="rec-start" className="fb-label">
            Start Date *
          </label>
          <input
            id="rec-start"
            type="date"
            className="fb-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="fb-form-row">
          <label htmlFor="rec-end" className="fb-label">
            End Date (Optional)
          </label>
          <input
            id="rec-end"
            type="date"
            className="fb-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="fb-form-row">
        <label htmlFor="rec-instructions" className="fb-label">
          Instructions
        </label>
        <textarea
          id="rec-instructions"
          className="fb-textarea"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Special notes for recurring visits…"
          rows={3}
        />
      </div>

      <div className="fb-form-actions">
        <button
          type="button"
          className="fb-btn fb-btn--ghost"
          onClick={onDone}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="fb-btn fb-btn--primary"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Creating Plan…" : "Create Recurrence Plan"}
        </button>
      </div>
    </form>
  );
}
