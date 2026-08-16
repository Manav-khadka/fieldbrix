import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateTaskForm } from "./create-task-form";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";
const SITE_ID = "22222222-2222-4222-8222-222222222222";
const WORKFLOW_ID = "33333333-3333-4333-8333-333333333333";
const VERSION_ID = "44444444-4444-4444-8444-444444444444";

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function mockGetResponses() {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path.startsWith("/customers"))
      return Promise.resolve({
        items: [{ id: CUSTOMER_ID, name: "Al Noor Facilities" }],
      });
    if (path.startsWith("/sites"))
      return Promise.resolve({
        items: [{ id: SITE_ID, name: "Al Noor HQ", customerId: CUSTOMER_ID }],
      });
    if (path.startsWith("/service-targets"))
      return Promise.resolve({ items: [] });
    if (path.startsWith("/workflows"))
      return Promise.resolve({
        items: [
          {
            id: WORKFLOW_ID,
            name: "Preventive HVAC Visit",
            status: "PUBLISHED",
            currentVersionId: VERSION_ID,
          },
        ],
      });
    return Promise.resolve({ items: [] });
  });
}

describe("CreateTaskForm", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    mockGetResponses();
  });

  it("disables the site select until a customer is chosen", async () => {
    renderWithClient(<CreateTaskForm onCreated={() => {}} />);
    const siteSelect = await screen.findByLabelText("Site");
    expect(siteSelect).toBeDisabled();

    // The <option> for this customer only exists once the /customers query
    // resolves — changing the select before then is a silent no-op in
    // jsdom (there's nothing to select), not a real interaction.
    await screen.findByRole("option", { name: "Al Noor Facilities" });
    fireEvent.change(screen.getByLabelText("Customer"), {
      target: { value: CUSTOMER_ID },
    });
    await waitFor(() => expect(siteSelect).not.toBeDisabled());
  });

  it("shows validation errors and does not submit when required fields are missing", async () => {
    renderWithClient(<CreateTaskForm onCreated={() => {}} />);
    await screen.findByLabelText("Customer");
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => {
      expect(screen.getByText("Customer is required")).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it("resolves the workflow to its currentVersionId and submits a well-formed payload", async () => {
    vi.mocked(api.post).mockResolvedValue({ id: "task-1" });
    const onCreated = vi.fn();
    renderWithClient(<CreateTaskForm onCreated={onCreated} />);

    await screen.findByRole("option", { name: "Al Noor Facilities" });
    fireEvent.change(screen.getByLabelText("Customer"), {
      target: { value: CUSTOMER_ID },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Site")).not.toBeDisabled(),
    );
    await screen.findByRole("option", { name: "Al Noor HQ" });
    fireEvent.change(screen.getByLabelText("Site"), {
      target: { value: SITE_ID },
    });
    await screen.findByRole("option", { name: "Preventive HVAC Visit" });
    fireEvent.change(screen.getByLabelText("Workflow"), {
      target: { value: WORKFLOW_ID },
    });
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith(
      "/tasks",
      expect.objectContaining({
        workflowVersionId: VERSION_ID,
        customerId: CUSTOMER_ID,
        siteId: SITE_ID,
        priority: "NORMAL",
      }),
      expect.any(String),
    );
  });

  it("includes workType and signaturePolicy when set", async () => {
    vi.mocked(api.post).mockResolvedValue({ id: "task-1" });
    renderWithClient(<CreateTaskForm onCreated={() => {}} />);

    await screen.findByRole("option", { name: "Al Noor Facilities" });
    fireEvent.change(screen.getByLabelText("Customer"), {
      target: { value: CUSTOMER_ID },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Site")).not.toBeDisabled(),
    );
    await screen.findByRole("option", { name: "Al Noor HQ" });
    fireEvent.change(screen.getByLabelText("Site"), {
      target: { value: SITE_ID },
    });
    await screen.findByRole("option", { name: "Preventive HVAC Visit" });
    fireEvent.change(screen.getByLabelText("Workflow"), {
      target: { value: WORKFLOW_ID },
    });
    fireEvent.change(screen.getByLabelText("Work type"), {
      target: { value: "COMPLAINT" },
    });
    fireEvent.click(
      screen.getByLabelText(/require a signature to complete/i),
    );
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith(
      "/tasks",
      expect.objectContaining({
        workType: "COMPLAINT",
        signaturePolicy: { required: true },
      }),
      expect.any(String),
    );
  });
});
