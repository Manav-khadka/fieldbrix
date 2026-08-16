import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CustomersPage } from "./customers";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
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
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
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

  it("opens the add-customer form and submits a create payload", async () => {
    vi.mocked(api.get).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    vi.mocked(api.post).mockResolvedValue({ id: "new-1" });
    renderWithClient(<CustomersPage />);

    await waitFor(() => screen.getByText(/no customers found/i));
    fireEvent.click(screen.getByRole("button", { name: /add customer/i }));

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Al Noor Facilities" },
    });
    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "ALN-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create customer/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith(
      "/customers",
      expect.objectContaining({ name: "Al Noor Facilities", code: "ALN-001" }),
      expect.any(String),
    );
  });

  it("does not submit the create form when required fields are missing", async () => {
    vi.mocked(api.get).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    renderWithClient(<CustomersPage />);

    await waitFor(() => screen.getByText(/no customers found/i));
    fireEvent.click(screen.getByRole("button", { name: /add customer/i }));
    fireEvent.click(screen.getByRole("button", { name: /create customer/i }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });
});
