import { useGodModeStore } from "../store/god-mode.store";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:3000";

const PLATFORM_ADMIN_TOKEN =
  (import.meta.env.VITE_PLATFORM_ADMIN_TOKEN as string | undefined) ??
  "local-platform-admin";
const PLATFORM_ADMIN_ID = import.meta.env.VITE_PLATFORM_ADMIN_ID as
  | string
  | undefined;

function getToken(): string {
  return localStorage.getItem("fieldbrix_token") ?? "";
}

export type ApiError = { status: number; code: string; message: string };

async function request<T>(
  path: string,
  init: RequestInit = {},
  platform = false,
): Promise<T> {
  const token = getToken();
  const godSessionId = useGodModeStore.getState().session?.id;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(godSessionId ? { "x-god-session-id": godSessionId } : {}),
    ...(platform
      ? {
          "x-platform-admin-token": PLATFORM_ADMIN_TOKEN,
          ...(PLATFORM_ADMIN_ID ? { "x-platform-admin-id": PLATFORM_ADMIN_ID } : {}),
        }
      : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("fieldbrix_token");
      localStorage.removeItem("fieldbrix_refresh_token");
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    throw {
      status: res.status,
      code: String(body.code ?? body.error ?? "API_ERROR"),
      message: String(body.message ?? res.statusText),
    } satisfies ApiError;
  }
  // The backend wraps everything in { data: ... }
  const envelope = (await res.json()) as { data?: T } | T;
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as { data: T }).data;
  }
  return envelope as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers: idempotencyKey ? { "idempotency-key": idempotencyKey } : {},
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      headers: idempotencyKey ? { "idempotency-key": idempotencyKey } : {},
    }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }),
  platform: {
    get: <T>(path: string) => request<T>(path, {}, true),
    post: <T>(path: string, body?: unknown) =>
      request<T>(
        path,
        { method: "POST", body: body ? JSON.stringify(body) : undefined },
        true,
      ),
  },
};
