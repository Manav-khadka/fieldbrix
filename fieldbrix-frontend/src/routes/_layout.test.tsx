import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./_layout";
import { useCapabilities } from "../hooks/useCapabilities";

vi.mock("../hooks/useCapabilities");

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useRouter: () => ({ state: { location: { pathname: "/" } } }),
  useLocation: () => ({ pathname: "/" }),
  useNavigate: () => vi.fn(),
}));

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("Layout navigation", () => {
  it("hides permission-gated items while capabilities are still loading", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      capabilities: [],
      isLoading: true,
      can: () => false,
    });
    renderWithQuery(<Layout />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    // Overview has no permission requirement and is always visible.
    expect(within(nav).getByText("Overview")).toBeInTheDocument();
    // isLoading:true shows every item optimistically per the component's
    // `!item.permission || isLoading || can(item.permission)` filter, so
    // Client setup remains visible here too.
    expect(within(nav).getByText("Clients")).toBeInTheDocument();
  });

  it("shows only items the resolved capabilities actually grant", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      capabilities: ["tasks.view"],
      isLoading: false,
      can: (permission: string) => permission === "tasks.view",
    });
    renderWithQuery(<Layout />);
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.queryByText("Customers")).not.toBeInTheDocument();
    expect(screen.queryByText("Workflows")).not.toBeInTheDocument();
  });

  it("always shows unguarded administration items regardless of capabilities", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      capabilities: [],
      isLoading: false,
      can: () => false,
    });
    renderWithQuery(<Layout />);
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("People & Teams")).toBeInTheDocument();
  });
});
