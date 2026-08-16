import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PartsPage } from "./parts";
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

describe("PartsPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
  });

  it("renders part rows once the query resolves", async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [
        {
          id: "1",
          name: "HVAC Filter",
          code: "HVAC-F1",
          unit: "each",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderWithClient(<PartsPage />);
    await waitFor(() => {
      expect(screen.getByText("HVAC Filter")).toBeInTheDocument();
    });
    expect(screen.getByText("HVAC-F1")).toBeInTheDocument();
  });

  it("opens the add-part form and submits a create payload", async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    vi.mocked(api.post).mockResolvedValue({ id: "new-1" });
    renderWithClient(<PartsPage />);

    await waitFor(() => screen.getByText(/no parts found/i));
    fireEvent.click(screen.getByRole("button", { name: /add part/i }));

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "HVAC Filter" },
    });
    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "HVAC-F1" },
    });
    fireEvent.change(screen.getByLabelText("Unit"), {
      target: { value: "each" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create part/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith(
      "/parts",
      expect.objectContaining({
        name: "HVAC Filter",
        code: "HVAC-F1",
        unit: "each",
        active: true,
      }),
      expect.any(String),
    );
  });

  it("does not submit the create form when required fields are missing", async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    renderWithClient(<PartsPage />);

    await waitFor(() => screen.getByText(/no parts found/i));
    fireEvent.click(screen.getByRole("button", { name: /add part/i }));
    fireEvent.click(screen.getByRole("button", { name: /create part/i }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });
});
