import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { PanelTitle } from "../components/AdminUiAtoms";
import type { AdminTenant, GodSession, RequestFn } from "../types";

const platformToken =
  import.meta.env.VITE_PLATFORM_ADMIN_TOKEN ?? "local-platform-admin";

export function GodModeView({
  tenants,
  request,
  notify,
  session,
  onStart,
  onEnd,
}: {
  tenants: AdminTenant[];
  request: RequestFn;
  notify: (message: string) => void;
  session: GodSession | null;
  onStart: (session: GodSession) => void;
  onEnd: () => Promise<void>;
}) {
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!tenantId && tenants[0]) setTenantId(tenants[0].id);
  }, [tenantId, tenants]);

  const start = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const next = await request(
        "/platform/god-sessions",
        {
          method: "POST",
          body: JSON.stringify({
            tenantId,
            reason,
            reauthSecret: platformToken,
          }),
        },
        true,
      );
      onStart(next);
      notify("God-mode context started and is audited");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to start god mode",
      );
    }
  };

  return (
    <section className={`panel god-panel ${session ? "active" : ""}`}>
      <PanelTitle
        title="Platform context"
        action={session ? "End context" : undefined}
        onClick={() => void onEnd()}
      />
      {session ? (
        <div className="god-banner">
          <b>God mode active</b>
          <span>
            {session.tenantId} · expires{" "}
            {new Date(session.expiresAt).toLocaleTimeString()}
          </span>
          <small>
            Every action is audited. This context is not available to workforce
            users.
          </small>
        </div>
      ) : (
        <form className="god-form" onSubmit={start}>
          <label>
            Tenant
            <select
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reason
            <input
              required
              minLength={5}
              placeholder="Support investigation reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button className="secondary-button">Enter audited context</button>
        </form>
      )}
    </section>
  );
}
