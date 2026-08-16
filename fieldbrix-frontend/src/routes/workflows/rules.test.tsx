import type { ReactElement, ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkflowRulesPage } from "./rules";
import { api } from "../../api/client";

const WORKFLOW_ID = "11111111-1111-4111-8111-111111111111";

vi.mock("../../api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

// This page only needs the :id route param and a couple of nav links —
// stub both rather than standing up a full router just for this test.
// `Link` needs live router context to compute an href; outside a
// RouterProvider it throws, so it's swapped for a plain anchor here.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useParams: () => ({ id: WORKFLOW_ID }),
    Link: ({
      children,
      className,
    }: {
      children?: ReactNode;
      className?: string;
    }) => <a className={className}>{children}</a>,
  };
});

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("WorkflowRulesPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it("renders existing rules from the workflow schema", async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: WORKFLOW_ID,
      name: "HVAC Visit",
      revision: 3,
      schema: {
        fields: [{ key: "temperature", label: "Temperature" }],
        rules: [
          {
            id: "rule-1",
            priority: 5,
            conditions: [
              { fieldKey: "temperature", operator: "greater_than", value: 40 },
            ],
            actions: [{ type: "warning", message: "Too hot" }],
          },
        ],
      },
    });

    renderWithClient(<WorkflowRulesPage />);

    await waitFor(() => screen.getByText(/1 rule/));
    const table = screen.getByRole("grid");
    expect(
      within(table).getByText(/temperature greater_than 40/),
    ).toBeInTheDocument();
    expect(within(table).getByText("warning")).toBeInTheDocument();
  });

  it("shows an empty state and lets you add a new rule", async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: WORKFLOW_ID,
      name: "HVAC Visit",
      revision: 1,
      schema: {
        fields: [{ key: "temperature", label: "Temperature" }],
        rules: [],
      },
    });
    vi.mocked(api.post).mockResolvedValue({ id: "rule-2" });

    renderWithClient(<WorkflowRulesPage />);

    await waitFor(() => screen.getByText(/no rules yet/i));

    const [fieldSelect] = screen.getAllByRole("combobox");
    fireEvent.change(fieldSelect, { target: { value: "temperature" } });
    fireEvent.click(screen.getByRole("button", { name: /add rule/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const [path, body] = vi.mocked(api.post).mock.calls[0];
    expect(path).toBe(`/workflows/${WORKFLOW_ID}/rules`);
    expect(body).toMatchObject({
      conditions: [expect.objectContaining({ fieldKey: "temperature" })],
    });
  });

  it("deletes a rule with the current workflow revision", async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: WORKFLOW_ID,
      name: "HVAC Visit",
      revision: 7,
      schema: {
        fields: [],
        rules: [
          {
            id: "rule-1",
            priority: 0,
            conditions: [],
            actions: [{ type: "safety_stop" }],
          },
        ],
      },
    });
    vi.mocked(api.delete).mockResolvedValue(null);

    renderWithClient(<WorkflowRulesPage />);

    await waitFor(() => screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => expect(api.delete).toHaveBeenCalled());
    expect(api.delete).toHaveBeenCalledWith(
      `/workflows/${WORKFLOW_ID}/rules/rule-1`,
      { revision: 7 },
    );
  });
});
