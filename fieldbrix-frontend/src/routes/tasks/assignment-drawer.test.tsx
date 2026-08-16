import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AssignmentDrawer } from "./assignment-drawer";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const WORKER_ID = "11111111-1111-4111-8111-111111111111";
const TEAM_ID = "22222222-2222-4222-8222-222222222222";

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function mockGetResponses(
  currentAssignment: {
    workerId: string | null;
    teamId: string | null;
    lead: boolean;
  } | null = null,
) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path.startsWith("/users"))
      return Promise.resolve({
        data: [{ id: WORKER_ID, name: "Ada Worker", email: "ada@example.com" }],
      });
    if (path.startsWith("/teams"))
      return Promise.resolve({
        data: [
          { id: TEAM_ID, name: "Field Operations", active: true },
          { id: "inactive-team", name: "Retired Team", active: false },
        ],
      });
    if (path.includes("/assignments"))
      return Promise.resolve(currentAssignment);
    return Promise.resolve({ data: [] });
  });
}

describe("AssignmentDrawer", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    mockGetResponses();
  });

  it("disables submit until a worker or team is chosen, and hides inactive teams", async () => {
    renderWithClient(<AssignmentDrawer taskId="task-1" onClose={() => {}} />);
    await screen.findByRole("option", { name: "Field Operations" });

    expect(screen.getByRole("button", { name: "Assign" })).toBeDisabled();
    expect(screen.queryByText("Retired Team")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Team"), {
      target: { value: TEAM_ID },
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Assign" })).not.toBeDisabled(),
    );
  });

  it("submits worker + lead + reason and closes on success", async () => {
    vi.mocked(api.post).mockResolvedValue({ id: "assignment-1" });
    const onClose = vi.fn();
    renderWithClient(<AssignmentDrawer taskId="task-1" onClose={onClose} />);

    await screen.findByRole("option", { name: /Ada Worker/ });
    fireEvent.change(screen.getByLabelText("Worker"), {
      target: { value: WORKER_ID },
    });
    fireEvent.click(
      screen.getByLabelText("Responsible lead (final submission authority)"),
    );
    fireEvent.change(screen.getByLabelText("Reason (optional)"), {
      target: { value: "primary technician" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith(
      "/tasks/task-1/assignments",
      {
        workerId: WORKER_ID,
        teamId: undefined,
        lead: true,
        reason: "primary technician",
      },
      expect.any(String),
    );
  });

  it("surfaces a server error instead of silently closing", async () => {
    vi.mocked(api.post).mockRejectedValue({
      status: 400,
      code: "ACTIVE_WORKER_REQUIRED",
      message: "ACTIVE_WORKER_REQUIRED",
    });
    const onClose = vi.fn();
    renderWithClient(<AssignmentDrawer taskId="task-1" onClose={onClose} />);

    await screen.findByRole("option", { name: /Ada Worker/ });
    fireEvent.change(screen.getByLabelText("Worker"), {
      target: { value: WORKER_ID },
    });
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));

    await waitFor(() => {
      expect(screen.getByText("ACTIVE_WORKER_REQUIRED")).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("pre-fills the form from the task's current assignment and labels the action as reassign", async () => {
    mockGetResponses({ workerId: WORKER_ID, teamId: null, lead: true });
    renderWithClient(<AssignmentDrawer taskId="task-1" onClose={() => {}} />);

    await waitFor(() =>
      expect(screen.getByLabelText<HTMLSelectElement>("Worker").value).toBe(
        WORKER_ID,
      ),
    );
    expect(
      screen.getByLabelText<HTMLInputElement>(
        "Responsible lead (final submission authority)",
      ).checked,
    ).toBe(true);
    expect(screen.getByText("Reassign task")).toBeInTheDocument();
  });
});
