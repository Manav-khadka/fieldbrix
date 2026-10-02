import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/client";
import {
  getStoredGodSessionId,
  useGodModeStore,
  type GodSession,
} from "../store/god-mode.store";

type Tenant = { id: string; name: string };

const PLATFORM_ADMIN_TOKEN =
  (import.meta.env.VITE_PLATFORM_ADMIN_TOKEN as string | undefined) ??
  "local-platform-admin";

export function GodModeControl() {
  const session = useGodModeStore((s) => s.session);
  const setSession = useGodModeStore((s) => s.setSession);
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const storedId = getStoredGodSessionId();
    if (!storedId || session) return;
    api.platform
      .get<GodSession | null>("/platform/god-sessions/current")
      .then((current) => {
        if (current) setSession(current);
      })
      .catch(() => setSession(null));
    // Rehydrate once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open || tenants.length) return;
    api.platform
      .get<Tenant[] | { data: Tenant[] } | { items: Tenant[] }>(
        "/platform/tenants",
      )
      .then((result) => {
        const list = Array.isArray(result)
          ? result
          : Array.isArray((result as { data?: Tenant[] })?.data)
            ? (result as { data: Tenant[] }).data
            : Array.isArray((result as { items?: Tenant[] })?.items)
              ? (result as { items: Tenant[] }).items
              : [];
        setTenants(list);
      })
      .catch(() => setTenants([]));
  }, [open, tenants.length]);

  useEffect(() => {
    if (!tenantId && tenants[0]) setTenantId(tenants[0].id);
  }, [tenantId, tenants]);

  const start = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const next = await api.platform.post<GodSession>(
        "/platform/god-sessions",
        { tenantId, reason, reauthSecret: PLATFORM_ADMIN_TOKEN },
      );
      setSession(next);
      setOpen(false);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start god mode");
    }
  };

  const end = async () => {
    if (!session) return;
    try {
      await api.platform.post(`/platform/god-sessions/${session.id}/end`);
    } finally {
      setSession(null);
    }
  };

  if (session) {
    return (
      <div className="app-god-banner" role="status">
        <b>God mode active</b>
        <span>
          {session.tenantId} · expires{" "}
          {new Date(session.expiresAt).toLocaleTimeString()}
        </span>
        <button className="fb-btn fb-btn--ghost" onClick={() => void end()}>
          End context
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        className="fb-btn fb-btn--ghost"
        onClick={() => setOpen((v) => !v)}
        aria-label="Enter god mode"
      >
        ⌘ God mode
      </button>
      {open && (
        <form
          onSubmit={start}
          className="fb-card"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 0.5rem)",
            width: "280px",
            zIndex: 20,
            display: "grid",
            gap: "0.75rem",
          }}
        >
          {error && <p className="fb-field-error">{error}</p>}
          <label>
            <span className="fb-label">Tenant</span>
            <select
              className="fb-select"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              style={{ width: "100%" }}
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="fb-label">Reason</span>
            <input
              required
              minLength={5}
              className="fb-input"
              style={{ width: "100%" }}
              placeholder="Support investigation reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button type="submit" className="fb-btn fb-btn--primary">
            Enter audited context
          </button>
        </form>
      )}
    </div>
  );
}
