import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCapabilities } from "./useCapabilities";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { get: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useCapabilities", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("reports isLoading true before the capabilities response arrives", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCapabilities(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.can("master.customers.view")).toBe(false);
  });

  it("can() reflects exactly the granted permission keys, nothing else", async () => {
    vi.mocked(api.get).mockResolvedValue({
      capabilities: ["master.customers.view", "tasks.view"],
    });
    const { result } = renderHook(() => useCapabilities(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.can("master.customers.view")).toBe(true);
    expect(result.current.can("tasks.view")).toBe(true);
    expect(result.current.can("workflows.publish")).toBe(false);
  });

  it("defaults to no capabilities when the request fails", async () => {
    vi.mocked(api.get).mockRejectedValue({
      status: 500,
      code: "API_ERROR",
      message: "boom",
    });
    const { result } = renderHook(() => useCapabilities(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.capabilities).toEqual([]);
    expect(result.current.can("tasks.view")).toBe(false);
  });
});
