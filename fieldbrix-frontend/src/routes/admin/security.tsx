import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SecurityView } from "../../features/admin/views/SecurityView";
import { useUiStore } from "../../store/ui.store";
import { api } from "../../api/client";
import type { AdminAuditEvent } from "../../features/admin/types";

export function SecurityPage() {
  const [notice, setNotice] = useState("");
  const addToast = useUiStore((state) => state.addToast);

  const { data: audit = [] } = useQuery<AdminAuditEvent[]>({
    queryKey: ["admin", "audit-events"],
    queryFn: async () => {
      try {
        const res = await api.get<AdminAuditEvent[]>("/audit-events");
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
    async (path: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      headers.set("Content-Type", "application/json");
      const token = localStorage.getItem("fieldbrix_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
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

  return (
    <div className="fb-page">
      {notice && (
        <div className="alert success" role="status" style={{ marginBottom: "1rem" }}>
          ✓ {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
      <SecurityView
        audit={audit}
        request={request}
        notify={notify}
      />
    </div>
  );
}
