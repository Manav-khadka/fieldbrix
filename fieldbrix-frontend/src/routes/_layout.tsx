import { Outlet, Link, useRouter } from "@tanstack/react-router";
import { useCapabilities } from "../hooks/useCapabilities";
import { useUiStore } from "../store/ui.store";
import { NotificationBell } from "../components/NotificationBell";

type NavItem = {
  label: string;
  icon: string;
  path: string;
  permission?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", icon: "✦", path: "/" },
  {
    label: "Customers",
    icon: "◎",
    path: "/master-data/customers",
    permission: "master.customers.view",
  },
  {
    label: "Sites",
    icon: "▦",
    path: "/master-data/sites",
    permission: "master.sites.view",
  },
  {
    label: "Service Targets",
    icon: "◈",
    path: "/master-data/service-targets",
    permission: "master.targets.view",
  },
  {
    label: "Parts",
    icon: "⌥",
    path: "/master-data/parts",
    permission: "master.parts.view",
  },
  {
    label: "Imports",
    icon: "↥",
    path: "/master-data/imports",
    permission: "master.imports.view",
  },
  {
    label: "Workflows",
    icon: "◌",
    path: "/workflows",
    permission: "workflows.view",
  },
  { label: "Tasks", icon: "⌁", path: "/tasks", permission: "tasks.view" },
  {
    label: "Schedules",
    icon: "📅",
    path: "/scheduling/calendar",
  },
  {
    label: "Capacity",
    icon: "⌀",
    path: "/scheduling/capacity",
    permission: "tasks.assign",
  },
  {
    label: "Review Queue",
    icon: "✓",
    path: "/tasks/review-queue",
  },
  { label: "Administration", icon: "⚙", path: "/admin" },
];

export function Layout() {
  const { can, isLoading } = useCapabilities();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const router = useRouter();
  const currentPath = router.state.location.pathname;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || isLoading || can(item.permission),
  );

  return (
    <div className="fb-app-shell">
      {/* Sidebar */}
      <aside
        className={`fb-sidebar ${sidebarOpen ? "" : "fb-sidebar--collapsed"}`}
      >
        <div className="fb-sidebar-header">
          <span className="fb-logo">FieldBrix</span>
          <button
            id="sidebar-toggle"
            className="fb-sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
        <nav className="fb-nav" role="navigation" aria-label="Main navigation">
          {visibleItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`fb-nav-item ${currentPath === item.path ? "fb-nav-item--active" : ""}`}
              aria-current={currentPath === item.path ? "page" : undefined}
            >
              <span className="fb-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {sidebarOpen && (
                <span className="fb-nav-label">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>
        <div
          className="fb-sidebar-footer"
          style={{
            padding: "1rem",
            marginTop: "auto",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <button
            onClick={() => {
              localStorage.removeItem("fieldbrix_token");
              localStorage.removeItem("fieldbrix_refresh_token");
              window.location.href = "/login";
            }}
            className="fb-signout-button"
            style={{
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fff",
              borderRadius: "6px",
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem",
              cursor: "pointer",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
            aria-label="Sign out"
          >
            <span aria-hidden="true">⎋</span>
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="fb-main">
        <header
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "0.5rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff",
          }}
        >
          <NotificationBell />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
