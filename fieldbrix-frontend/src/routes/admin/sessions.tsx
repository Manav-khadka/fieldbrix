import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SessionsView } from "../../features/admin/views/SessionsView";
import { useUiStore } from "../../store/ui.store";
import { api } from "../../api/client";
import type { AdminSession } from "../../features/admin/types";

export function SessionsPage() {
  const [notice, setNotice] = useState("");
  const addToast = useUiStore((state) => state.addToast);

  const { data: sessions = [], refetch } = useQuery<AdminSession[]>({
    queryKey: ["admin", "sessions"],
    queryFn: async () => {
      try {
        const res = await api.get<AdminSession[]>("/me/sessions");
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
      <SessionsView
        sessions={sessions}
        request={request}
        refresh={async () => {
          await refetch();
        }}
        notify={notify}
      />
    </div>
  );
}
