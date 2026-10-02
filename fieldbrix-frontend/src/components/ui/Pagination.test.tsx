import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("reports the visible range and exposes accessible page navigation", () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        page={2}
        pageSize={20}
        total={95}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
        label="Clients table pagination"
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Clients table pagination" }),
    ).toHaveTextContent("Showing 21–40 of 95");
    expect(
      screen.getByRole("button", { name: "Go to page 2" }),
    ).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: "Go to last page" }));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it("changes page size and synchronizes an out-of-range controlled page", async () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        page={9}
        pageSize={20}
        total={45}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    await waitFor(() => expect(onPageChange).toHaveBeenCalledWith(3));
    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "50" },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("renders stable disabled controls for an empty table", () => {
    render(
      <Pagination page={1} pageSize={10} total={0} onPageChange={vi.fn()} />,
    );

    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 0–0 of 0");
    expect(
      screen.getByRole("button", { name: "Go to first page" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Go to last page" }),
    ).toBeDisabled();
  });
});
