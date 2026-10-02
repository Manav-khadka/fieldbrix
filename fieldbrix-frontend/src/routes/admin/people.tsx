import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PeopleView } from "../../features/admin/views/PeopleView";
import { useUiStore } from "../../store/ui.store";
import { api } from "../../api/client";
import type {
  AdminRole,
  AdminUser,
  WorkforceDirectory,
} from "../../features/admin/types";

const EMPTY_WORKFORCE: WorkforceDirectory = {
  people: [],
  departments: [],
  workflows: [],
};

export function PeoplePage() {
  const [notice, setNotice] = useState("");
  const addToast = useUiStore((state) => state.addToast);

  const { data: users = [], refetch: refetchUsers } = useQuery<AdminUser[]>({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      try {
        const res = await api.get<AdminUser[]>("/users");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const { data: roles = [], refetch: refetchRoles } = useQuery<AdminRole[]>({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      try {
        const res = await api.get<AdminRole[]>("/roles");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    retry: false,
  });
  const { data: workforce = EMPTY_WORKFORCE, refetch: refetchWorkforce } =
    useQuery<WorkforceDirectory>({
      queryKey: ["admin", "workforce-directory"],
      queryFn: () =>
        api
          .get<WorkforceDirectory>("/workforce-directory")
          .catch(() => EMPTY_WORKFORCE),
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
      const configuredPlatformToken = import.meta.env
        .VITE_PLATFORM_ADMIN_TOKEN as string | undefined;
      if (platform && configuredPlatformToken)
        headers.set("x-platform-admin-token", configuredPlatformToken);
      const API_BASE =
        (import.meta.env.VITE_API_URL as string | undefined) ??
        (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
        "http://localhost:3000";
      const result = await fetch(`${API_BASE}${path}`, { ...options, headers });
      const body = (await result.json().catch(() => ({}))) as Record<
        string,
        any
      >;
      if (!result.ok) {
        throw new Error(
          body.error?.message ?? body.message ?? "Request failed",
        );
      }
      return body.data;
    },
    [],
  );

  return (
    <div className="fb-page">
      {notice && (
        <div
          className="alert success"
          role="status"
          style={{ marginBottom: "1rem" }}
        >
          ✓ {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
      <PeopleView
        users={users}
        roles={roles}
        workforce={workforce}
        platformStaff={[]}
        request={request}
        refresh={async () => {
          await Promise.all([
            refetchUsers(),
            refetchRoles(),
            refetchWorkforce(),
          ]);
        }}
        notify={notify}
      />
    </div>
  );
}
