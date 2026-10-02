import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { CompanyView } from "../../features/admin/views/CompanyView";
import { useUiStore } from "../../store/ui.store";
import { api } from "../../api/client";
import type { AdminItem } from "../../features/admin/types";

export function CompanyPage() {
  const [notice, setNotice] = useState("");
  const addToast = useUiStore((state) => state.addToast);

  const { data: branches = [], refetch: refetchBranches } = useQuery<AdminItem[]>({
    queryKey: ["company", "branches"],
    queryFn: async () => {
      try {
        const res = await api.get<AdminItem[]>("/branches");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const { data: teams = [], refetch: refetchTeams } = useQuery<AdminItem[]>({
    queryKey: ["company", "teams"],
    queryFn: async () => {
      try {
        const res = await api.get<AdminItem[]>("/teams");
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
      <CompanyView
        branches={branches}
        teams={teams}
        request={request}
        refresh={async () => {
          await Promise.all([refetchBranches(), refetchTeams()]);
        }}
        notify={notify}
      />
    </div>
  );
}
