import { useState } from "react";
import type { FormEvent } from "react";
import { Intro, PanelTitle, Status, TableHead, Empty } from "../components/AdminUiAtoms";
import { GodModeView } from "./GodModeView";
import type { AdminTenant, GodSession, RequestFn } from "../types";

export function TenantsView({
  tenants,
  request,
  refresh,
  notify,
  godSession,
  onStartGodMode,
  onEndGodMode,
}: {
  tenants: AdminTenant[];
  request: RequestFn;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  godSession: GodSession | null;
  onStartGodMode: (session: GodSession) => void;
  onEndGodMode: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request(
        "/platform/tenants",
        { method: "POST", body: JSON.stringify({ name }) },
        true,
      );
      setName("");
      notify("Tenant provisioned successfully");
      await refresh();
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to provision tenant",
      );
    }
  };

  const changeStatus = async (tenant: AdminTenant) => {
    const reason = window.prompt(
      `${tenant.status === "ACTIVE" ? "Suspend" : "Restore"} reason`,
    );
    if (!reason?.trim()) return;
    try {
      await request(
        `/platform/tenants/${tenant.id}/${tenant.status === "ACTIVE" ? "suspend" : "restore"}`,
        { method: "POST", body: JSON.stringify({ reason }) },
        true,
      );
      notify(`Tenant ${tenant.status === "ACTIVE" ? "suspended" : "restored"}`);
      await refresh();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to change tenant status",
      );
    }
  };

  const inspectUsage = async (id: string) => {
    try {
      setUsage(await request(`/platform/tenants/${id}/usage`, {}, true));
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to load tenant usage",
      );
    }
  };

  return (
    <div className="page-stack">
      <Intro
        eyebrow="PLATFORM CONTROL"
        title="Tenant lifecycle"
        text="Provision, monitor, and protect every company in your FieldBrix network."
      >
        <form className="inline-form" onSubmit={submit}>
          <input
            placeholder="New tenant name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button className="primary-button">＋ Provision</button>
        </form>
      </Intro>
      <section className="table-panel">
        <div className="table-toolbar">
          <b>{tenants.length} tenants</b>
          <span>Platform-wide visibility · limits enforced server-side</span>
        </div>
        <TableHead
          labels={["Company", "Status", "Timezone", "People", "Branches", ""]}
        />
        {tenants.map((tenant) => (
          <div className="table-row" key={tenant.id}>
            <span className="entity">
              <span className="company-logo">{tenant.name[0]}</span>
              <span>
                <b>{tenant.name}</b>
                <small>{tenant.id}</small>
              </span>
            </span>
            <Status value={tenant.status} />
            <span>{tenant.timezone}</span>
            <span>{tenant.users}</span>
            <span>{tenant.branches}</span>
            <div className="row-actions">
              <button
                className="row-menu"
                onClick={() => void inspectUsage(tenant.id)}
              >
                Usage
              </button>
              <button
                className="row-menu"
                onClick={() => void changeStatus(tenant)}
              >
                {tenant.status === "ACTIVE" ? "Suspend" : "Restore"}
              </button>
            </div>
          </div>
        ))}
        {!tenants.length && (
          <Empty text="Check platform administrator configuration or provision your first tenant." />
        )}
      </section>
      {usage && (
        <section className="panel usage-card">
          <PanelTitle
            title="Tenant usage"
            action="Close"
            onClick={() => setUsage(null)}
          />
          <pre>{JSON.stringify(usage, null, 2)}</pre>
        </section>
      )}
      <GodModeView
        tenants={tenants}
        request={request}
        notify={notify}
        session={godSession}
        onStart={onStartGodMode}
        onEnd={onEndGodMode}
      />
    </div>
  );
}
