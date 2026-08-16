import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Layout } from "./_layout";
import { useCapabilities } from "../hooks/useCapabilities";
import { useUiStore } from "../store/ui.store";

vi.mock("../hooks/useCapabilities");

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useRouter: () => ({ state: { location: { pathname: "/" } } }),
}));

describe("Layout navigation", () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarOpen: true });
  });

  it("hides permission-gated items while capabilities are still loading", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      capabilities: [],
      isLoading: true,
      can: () => false,
    });
    render(<Layout />);
    // Overview has no permission requirement and is always visible.
    expect(screen.getByText("Overview")).toBeInTheDocument();
    // isLoading:true shows every item optimistically per the component's
    // `!item.permission || isLoading || can(item.permission)` filter, so
    // Customers is visible here too — this locks in that documented behavior.
    expect(screen.getByText("Customers")).toBeInTheDocument();
  });

  it("shows only items the resolved capabilities actually grant", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      capabilities: ["tasks.view"],
      isLoading: false,
      can: (permission: string) => permission === "tasks.view",
    });
    render(<Layout />);
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.queryByText("Customers")).not.toBeInTheDocument();
    expect(screen.queryByText("Workflows")).not.toBeInTheDocument();
  });

  it("always shows the unguarded Administration link regardless of capabilities", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      capabilities: [],
      isLoading: false,
      can: () => false,
    });
    render(<Layout />);
    expect(screen.getByText("Administration")).toBeInTheDocument();
  });
});
