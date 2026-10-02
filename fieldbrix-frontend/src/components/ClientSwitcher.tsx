import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import {
  getStoredGodSessionId,
  useGodModeStore,
  type GodSession,
} from "../store/god-mode.store";
import { SitesIcon, ChevronRightIcon, CheckIcon } from "./icons";

type Tenant = { id: string; name: string; slug?: string };

const PLATFORM_ADMIN_TOKEN =
  (import.meta.env.VITE_PLATFORM_ADMIN_TOKEN as string | undefined) ??
  "local-platform-admin";

export function ClientSwitcher() {
  const queryClient = useQueryClient();
  const session = useGodModeStore((s) => s.session);
  const setSession = useGodModeStore((s) => s.setSession);

  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filter, setFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getStoredGodSessionId() || session) return;
    api.platform
      .get<GodSession | null>("/platform/god-sessions/current")
      .then((current) => {
        if (current) setSession(current);
        else setSession(null);
      })
      .catch(() => setSession(null));
  }, [session, setSession]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load available clients/tenants
  useEffect(() => {
    if (!open && tenants.length > 0) return;
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

  const activeTenantName =
    tenants.find((t) => t.id === session?.tenantId)?.name ??
    (session ? session.tenantId : "Primary Organization");

  const handleSwitchTenant = async (t: Tenant) => {
    if (session?.tenantId === t.id) {
      setOpen(false);
      return;
    }
    try {
      if (session) {
        await api.platform.post(`/platform/god-sessions/${session.id}/end`);
      }
      const next = await api.platform.post<{
        id: string;
        tenantId: string;
        expiresAt: string;
      }>("/platform/god-sessions", {
        tenantId: t.id,
        reason: "Super admin workspace switch",
        reauthSecret: PLATFORM_ADMIN_TOKEN,
      });
      setSession(next);
      await queryClient.invalidateQueries();
      setOpen(false);
    } catch {
      // Fallback
      setOpen(false);
    }
  };

  const handleResetToPrimary = async () => {
    if (!session) {
      setOpen(false);
      return;
    }
    try {
      await api.platform.post(`/platform/god-sessions/${session.id}/end`);
    } finally {
      setSession(null);
      await queryClient.invalidateQueries();
      setOpen(false);
    }
  };

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="fb-btn fb-btn-ghost fb-btn-sm"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: session ? "#fef3c7" : "var(--fb-slate-100)",
          border: `1px solid ${session ? "#fde68a" : "var(--fb-border-subtle)"}`,
          color: session ? "#92400e" : "var(--fb-slate-800)",
          fontWeight: 600,
          fontSize: "12px",
          padding: "0 10px",
          height: "32px",
        }}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Switch Client Workspace"
      >
        <SitesIcon size={14} />
        <span
          style={{
            maxWidth: "140px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {activeTenantName}
        </span>
        <span
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            display: "flex",
          }}
        >
          <ChevronRightIcon size={12} />
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: "280px",
            background: "#ffffff",
            borderRadius: "var(--fb-radius-lg)",
            border: "1px solid var(--fb-border-subtle)",
            boxShadow: "var(--fb-shadow-lg)",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "0.75rem",
              borderBottom: "1px solid var(--fb-border-subtle)",
              background: "var(--fb-slate-50)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--fb-slate-500)",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              Switch Client Context
            </div>
            <input
              type="text"
              className="fb-input"
              placeholder="Search clients..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                height: "30px",
                fontSize: "12px",
                padding: "0 8px",
                background: "#ffffff",
              }}
              autoFocus
            />
          </div>

          <div
            style={{
              maxHeight: "220px",
              overflowY: "auto",
              padding: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={handleResetToPrimary}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: "var(--fb-radius-md)",
                border: "none",
                background: !session ? "var(--fb-slate-100)" : "transparent",
                fontWeight: !session ? 700 : 500,
                color: "var(--fb-slate-900)",
                fontSize: "12px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span>Default Organization</span>
              {!session && <CheckIcon size={14} color="var(--fb-brand-indigo)" />}
            </button>

            {filteredTenants.map((t) => {
              const isSelected = session?.tenantId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSwitchTenant(t)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: "var(--fb-radius-md)",
                    border: "none",
                    background: isSelected ? "var(--fb-slate-100)" : "transparent",
                    fontWeight: isSelected ? 700 : 500,
                    color: "var(--fb-slate-900)",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "var(--fb-slate-50)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.name}
                  </span>
                  {isSelected && <CheckIcon size={14} color="var(--fb-brand-indigo)" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
