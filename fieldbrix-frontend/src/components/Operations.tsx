import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Request = (
  path: string,
  options?: RequestInit,
  platform?: boolean,
) => Promise<any>;
type RecordItem = {
  id: string;
  name: string;
  code?: string;
  status?: string;
  [key: string]: any;
};
type Props = { request: Request; notify: (message: string) => void };

const tabs = [
  ["customers", "Customers", "The people and companies you serve"],
  ["sites", "Sites", "Places where work happens"],
  ["targets", "Service targets", "Equipment, assets and QR identities"],
  ["parts", "Parts", "A shared catalogue for your crews"],
  ["workflows", "Workflows", "Turn good work into repeatable steps"],
  ["tasks", "Tasks", "Plan, assign and follow up"],
] as const;

export function Operations({ request, notify }: Props) {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("customers");
  const [items, setItems] = useState<RecordItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const mutation = (options: RequestInit): RequestInit => ({
    ...options,
    headers: {
      ...(options.headers as Record<string, string> | undefined),
      "idempotency-key": crypto.randomUUID(),
    },
  });

  const endpoint = tab === "targets" ? "service-targets" : tab;
  const load = async () => {
    setBusy(true);
    try {
      if (tab === "workflows") setItems((await request("/workflows")) ?? []);
      else if (tab === "tasks")
        setItems(
          (await request(
            `/tasks${search ? `?search=${encodeURIComponent(search)}` : ""}`,
          )) ?? [],
        );
      else
        setItems(
          (await request(
            `/${endpoint}${search ? `?search=${encodeURIComponent(search)}` : ""}`,
          )) ?? [],
        );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to load operations",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
  }, [tab]);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (tab === "workflows")
        await request(
          "/workflows",
          mutation({
            method: "POST",
            body: JSON.stringify({ name, description: "A new field workflow" }),
          }),
        );
      else if (tab === "tasks") {
        const [workflowData, customerData, siteData] = await Promise.all([
          request("/workflows"),
          request("/customers"),
          request("/sites"),
        ]);
        const workflow = (workflowData ?? []).find(
          (item: RecordItem) => item.currentVersionId,
        );
        const customer = (customerData ?? [])[0];
        const site = (siteData ?? [])[0];
        if (!workflow?.currentVersionId || !customer?.id || !site?.id)
          throw new Error(
            "Publish a workflow and add a customer/site before creating a task",
          );
        await request(
          "/tasks",
          mutation({
            method: "POST",
            body: JSON.stringify({
              workflowVersionId: workflow.currentVersionId,
              customerId: customer.id,
              siteId: site.id,
              description: name,
            }),
          }),
        );
      } else if (tab === "targets") {
        const sites = (await request("/sites")) ?? [];
        const site = sites.find(
          (item: RecordItem) =>
            item.status !== "ARCHIVED" && item.active !== false,
        );
        if (!site?.id)
          throw new Error("Add a site before creating a service target");
        await request(
          `/${endpoint}`,
          mutation({
            method: "POST",
            body: JSON.stringify({
              name,
              siteId: site.id,
              code:
                code ||
                `${tab.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
            }),
          }),
        );
      } else
        await request(
          `/${endpoint}`,
          mutation({
            method: "POST",
            body: JSON.stringify({
              name,
              code:
                code ||
                `${tab.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
            }),
          }),
        );
      setName("");
      setCode("");
      setShowForm(false);
      notify(`${label} added to your workspace`);
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to save record");
    }
  };
  const label = tabs.find(([key]) => key === tab)?.[1] ?? "Operations";
  const counts = useMemo(
    () => ({
      active: items.filter((item) => item.status !== "ARCHIVED").length,
      attention: items.filter((item) =>
        ["DRAFT", "OVERDUE", "PAUSED"].includes(item.status ?? ""),
      ).length,
    }),
    [items],
  );
  return (
    <div className="operations-page">
      <section className="operations-hero">
        <div>
          <p className="eyebrow accent">OPERATIONS HUB / SPRINTS 06—10</p>
          <h2>Keep the work moving.</h2>
          <p>
            Everything your team needs to know about customers, the places they
            visit, the workflows they follow and the tasks on their plate.
          </p>
        </div>
        <div className="operations-summary">
          <span>
            <b>{counts.active}</b>
            <small>in this view</small>
          </span>
          <span>
            <b>{counts.attention}</b>
            <small>need attention</small>
          </span>
        </div>
      </section>
      <div className="operations-layout">
        <aside className="operations-nav">
          <p className="eyebrow">WORKSPACE</p>
          {tabs.map(([key, title, hint]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => {
                setTab(key);
                setSearch("");
                setSelected(null);
              }}
            >
              <span>
                {title === "Customers"
                  ? "◎"
                  : title === "Tasks"
                    ? "✓"
                    : title === "Workflows"
                      ? "◇"
                      : "▦"}
              </span>
              <strong>{title}</strong>
              <small>{hint}</small>
            </button>
          ))}
        </aside>
        <section className="operations-content">
          <div className="operations-toolbar">
            <div>
              <p className="eyebrow">
                {tab === "tasks"
                  ? "DISPATCH"
                  : tab === "workflows"
                    ? "DESIGN & GOVERNANCE"
                    : "MASTER DATA"}
              </p>
              <h3>{label}</h3>
            </div>
            <button
              className="primary-button"
              onClick={() => setShowForm(true)}
            >
              ＋ Add{" "}
              {tab === "workflows"
                ? "workflow"
                : tab === "tasks"
                  ? "task"
                  : label.slice(0, -1).toLowerCase()}
            </button>
          </div>
          <div className="operations-search">
            <span>⌕</span>
            <input
              placeholder={`Search ${label.toLowerCase()}…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void load()}
            />
            <button className="secondary-button" onClick={() => void load()}>
              Search
            </button>
            <span className="result-count">{items.length} records</span>
          </div>
          {showForm && (
            <form className="operations-form" onSubmit={create}>
              <div>
                <p className="eyebrow">NEW RECORD</p>
                <h4>
                  Add a{" "}
                  {tab === "workflows"
                    ? "workflow"
                    : tab === "tasks"
                      ? "task"
                      : label.slice(0, -1).toLowerCase()}
                </h4>
              </div>
              <label>
                Name
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Quarterly maintenance"
                />
              </label>
              {!["workflows", "tasks"].includes(tab) && (
                <label>
                  Code
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Optional internal code"
                  />
                </label>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button className="primary-button">Save record</button>
              </div>
            </form>
          )}
          {busy ? (
            <div className="empty-state">
              <span className="loading-dot" /> Loading your workspace…
            </div>
          ) : items.length ? (
            <div className="operations-table">
              {items.map((item) => (
                <button
                  className="operation-row"
                  key={item.id}
                  onClick={() => setSelected(item)}
                >
                  <span className="row-icon">
                    {tab === "tasks" ? "✓" : tab === "workflows" ? "◇" : "◎"}
                  </span>
                  <span className="row-main">
                    <strong>{item.name ?? item.number}</strong>
                    <small>
                      {item.code ??
                        item.number ??
                        item.description ??
                        "No description yet"}
                    </small>
                  </span>
                  <span
                    className={`status-pill ${(item.status ?? "ACTIVE").toLowerCase()}`}
                  >
                    {(item.status ?? "ACTIVE").replaceAll("_", " ")}
                  </span>
                  <span className="row-arrow">→</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">✦</span>
              <h4>No {label.toLowerCase()} yet</h4>
              <p>
                Start with one clear record. You can add detail as your
                operation grows.
              </p>
              <button
                className="secondary-button"
                onClick={() => setShowForm(true)}
              >
                Add the first one
              </button>
            </div>
          )}
          {selected && (
            <div className="record-drawer">
              <div>
                <p className="eyebrow">RECORD DETAIL</p>
                <button
                  className="drawer-close"
                  onClick={() => setSelected(null)}
                >
                  ×
                </button>
                <h4>{selected.name ?? selected.number}</h4>
                <p>
                  {selected.description ??
                    "This record is ready for your team."}
                </p>
              </div>
              {tab === "tasks" && (
                <div className="drawer-actions">
                  <button
                    className="secondary-button"
                    onClick={async () => {
                      const teams = (await request("/teams")) ?? [];
                      const team = teams.find(
                        (entry: RecordItem) =>
                          entry.status !== "ARCHIVED" && entry.active !== false,
                      );
                      if (!team?.id)
                        throw new Error(
                          "Create an active team before assigning work",
                        );
                      await request(
                        `/tasks/${selected.id}/assignments`,
                        mutation({
                          method: "POST",
                          body: JSON.stringify({ teamId: team.id, lead: true }),
                        }),
                      );
                      notify(`Task assigned to ${team.name}`);
                      await load();
                    }}
                  >
                    Assign team
                  </button>
                  <button
                    className="primary-button"
                    onClick={async () => {
                      await request(
                        `/tasks/${selected.id}/transitions`,
                        mutation({
                          method: "POST",
                          body: JSON.stringify({
                            targetStatus:
                              selected.status === "DRAFT"
                                ? "SCHEDULED"
                                : "IN_PROGRESS",
                            revision: selected.revision,
                          }),
                        }),
                      );
                      notify("Task status updated");
                      await load();
                    }}
                  >
                    Move forward
                  </button>
                </div>
              )}
              {tab === "workflows" && (
                <div className="drawer-actions">
                  <button
                    className="secondary-button"
                    onClick={async () => {
                      await request(
                        `/workflows/${selected.id}/sections`,
                        mutation({
                          method: "POST",
                          body: JSON.stringify({
                            title: "New section",
                            revision: selected.revision,
                          }),
                        }),
                      );
                      notify("Section added");
                      await load();
                    }}
                  >
                    Add section
                  </button>
                  <button
                    className="primary-button"
                    onClick={async () => {
                      await request(
                        `/workflows/${selected.id}/publish`,
                        mutation({
                          method: "POST",
                          body: JSON.stringify({
                            notes: "Ready for field use",
                            revision: selected.revision,
                          }),
                        }),
                      );
                      notify("Workflow published as an immutable version");
                      await load();
                    }}
                  >
                    Publish version
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
