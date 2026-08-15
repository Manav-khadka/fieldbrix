const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:3000';

function getToken(): string {
  return localStorage.getItem('fieldbrix_token') ?? '';
}

export type ApiError = { status: number; code: string; message: string };

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw {
      status: res.status,
      code: String(body.code ?? body.error ?? 'API_ERROR'),
      message: String(body.message ?? res.statusText),
    } satisfies ApiError;
  }
  // The backend wraps everything in { data: ... }
  const envelope = await res.json() as { data?: T } | T;
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return (envelope as { data: T }).data;
  }
  return envelope as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};
