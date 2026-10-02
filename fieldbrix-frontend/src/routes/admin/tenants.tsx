import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { TenantsView } from "../../features/admin/views/TenantsView";
import { useGodModeStore } from "../../store/god-mode.store";
import { useUiStore } from "../../store/ui.store";
import { api } from "../../api/client";
import type { AdminTenant, GodSession } from "../../features/admin/types";

const PLATFORM_ADMIN_TOKEN =
  (import.meta.env.VITE_PLATFORM_ADMIN_TOKEN as string | undefined) ??
  "local-platform-admin";
const PLATFORM_ADMIN_ID = import.meta.env.VITE_PLATFORM_ADMIN_ID as string | undefined;

export function TenantsPage() {
  const [notice, setNotice] = useState("");
  const addToast = useUiStore((state) => state.addToast);
  const session = useGodModeStore((state) => state.session);
  const setSession = useGodModeStore((state) => state.setSession);

  const { data: tenants = [], refetch } = useQuery<AdminTenant[]>({
    queryKey: ["platform", "tenants"],
    queryFn: async () => {
      try {
        const res = await api.platform.get<AdminTenant[]>("/platform/tenants");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const notify = useCallback(
    (msg: string) => {
      setNotice(msg);
      addToast({ type: "success", message: msg });
    },
    [addToast],
  );

  const request = useCallback(
    async (path: string, options: RequestInit = {}, platform = false) => {
      const headers = new Headers(options.headers);
      headers.set("Content-Type", "application/json");
      const token = localStorage.getItem("fieldbrix_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (platform) {
        headers.set("x-platform-admin-token", PLATFORM_ADMIN_TOKEN);
        if (PLATFORM_ADMIN_ID)
          headers.set("x-platform-admin-id", PLATFORM_ADMIN_ID);
      }
      const API_BASE =
        (import.meta.env.VITE_API_URL as string | undefined) ??
        (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
        "http://localhost:3000";
      const result = await fetch(`${API_BASE}${path}`, { ...options, headers });
      const body = (await result.json().catch(() => ({}))) as Record<string, any>;
      if (!result.ok) {
        throw new Error(body.error?.message ?? body.message ?? "Request failed");
      }
      return body.data;
    },
    [],
  );

  const handleStartGodMode = (nextSession: GodSession) => {
    setSession(nextSession);
  };

  const handleEndGodMode = async () => {
    if (!session) return;
    try {
      await request(`/platform/god-sessions/${session.id}/end`, { method: "POST" }, true);
      setSession(null);
      notify("Audited session context ended");
    } catch (err) {
      notify((err as Error).message ?? "Unable to end session");
    }
  };

  return (
    <div className="fb-page">
      {notice && (
        <div className="alert success" role="status" style={{ marginBottom: "1rem" }}>
          ✓ {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
      <TenantsView
        tenants={tenants}
        request={request}
        refresh={async () => {
          await refetch();
        }}
        notify={notify}
        godSession={session}
        onStartGodMode={handleStartGodMode}
        onEndGodMode={handleEndGodMode}
      />
    </div>
  );
}
