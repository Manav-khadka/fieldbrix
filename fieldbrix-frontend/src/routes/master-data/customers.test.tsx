import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CustomersPage } from "./customers";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: { get: vi.fn() },
}));

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("CustomersPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("shows a loading state before data arrives", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderWithClient(<CustomersPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders customer rows once the query resolves", async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [
        {
          id: "1",
          name: "Al Noor Facilities",
          code: "ALN-001",
          status: "ACTIVE",
          revision: 1,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderWithClient(<CustomersPage />);
    await waitFor(() => {
      expect(screen.getByText("Al Noor Facilities")).toBeInTheDocument();
    });
    expect(screen.getByText("ALN-001")).toBeInTheDocument();
    expect(screen.getByText("1 total records")).toBeInTheDocument();
  });

  it("shows an empty state when there are no customers", async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    renderWithClient(<CustomersPage />);
    await waitFor(() => {
      expect(screen.getByText(/no customers found/i)).toBeInTheDocument();
    });
  });

  it("shows an error state when the request fails", async () => {
    vi.mocked(api.get).mockRejectedValue({
      status: 500,
      code: "API_ERROR",
      message: "boom",
    });
    renderWithClient(<CustomersPage />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load customers/i)).toBeInTheDocument();
    });
  });
});
