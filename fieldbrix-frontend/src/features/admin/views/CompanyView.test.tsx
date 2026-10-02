import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompanyView } from "./CompanyView";

describe("CompanyView terminology editor", () => {
  it("uses normal labelled controls and saves structured terminology without exposing JSON", async () => {
    const request = vi
      .fn()
      .mockImplementation((path: string, init?: RequestInit) => {
        if (path === "/company" && !init) {
          return Promise.resolve({
            name: "Al Noor Operations",
            timezone: "Asia/Muscat",
            locale: "en-GB",
            terminology: { task: "Visit", taskPlural: "Visits" },
          });
        }
        return Promise.resolve({});
      });

    render(
      <CompanyView
        branches={[]}
        teams={[]}
        request={request}
        refresh={vi.fn().mockResolvedValue(undefined)}
        notify={vi.fn()}
      />,
    );

    expect(await screen.findByLabelText("Work item singular")).toHaveValue(
      "Visit",
    );
    expect(screen.queryByPlaceholderText(/\{"task"/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Facilities" }));
    expect(screen.getByLabelText("Work item singular")).toHaveValue("Job");
    expect(screen.getByLabelText("Field worker singular")).toHaveValue(
      "Engineer",
    );

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/company",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const patchCall = request.mock.calls.find(
      ([path, init]) => path === "/company" && init?.method === "PATCH",
    );
    const body = JSON.parse(String(patchCall?.[1]?.body)) as {
      terminology: Record<string, string>;
    };
    expect(body.terminology).toEqual(
      expect.objectContaining({
        task: "Job",
        site: "Building",
        agent: "Engineer",
        administrator: "Workspace admin",
      }),
    );
  });
});
