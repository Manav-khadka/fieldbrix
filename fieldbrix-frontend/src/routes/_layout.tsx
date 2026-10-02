import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "@tanstack/react-router";
import { useCapabilities } from "../hooks/useCapabilities";
import { NotificationBell } from "../components/NotificationBell";
import { ClientSwitcher } from "../components/ClientSwitcher";
import { GlobalSearchModal } from "../components/GlobalSearchModal";
import { ToastContainer } from "../components/ui/Toast";
import { useUiStore } from "../store/ui.store";
import {
  DashboardIcon,
  CustomersIcon,
  SitesIcon,
  ServiceTargetIcon,
  PartsIcon,
  ImportIcon,
  WorkflowIcon,
  TaskIcon,
  CalendarIcon,
  CapacityIcon,
  ReviewQueueIcon,
  AdminIcon,
  BuildingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogoutIcon,
  SearchIcon,
} from "../components/icons";

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Operations",
    items: [
      { label: "Overview", icon: <DashboardIcon size={18} />, path: "/" },
      {
        label: "Tasks",
        icon: <TaskIcon size={18} />,
        path: "/tasks",
        permission: "tasks.view",
      },
      {
        label: "Schedules",
        icon: <CalendarIcon size={18} />,
        path: "/scheduling/calendar",
      },
      {
        label: "Capacity",
        icon: <CapacityIcon size={18} />,
        path: "/scheduling/capacity",
        permission: "tasks.assign",
      },
      {
        label: "Review Queue",
        icon: <ReviewQueueIcon size={18} />,
        path: "/tasks/review-queue",
      },
    ],
  },
  {
    title: "Client setup",
    items: [
      {
        label: "Setup Guide",
        icon: <BuildingsIcon size={18} />,
        path: "/setup",
        permission: "master.customers.view",
      },
      {
        label: "Clients",
        icon: <CustomersIcon size={18} />,
        path: "/master-data/customers",
        permission: "master.customers.view",
      },
      {
        label: "Locations",
        icon: <SitesIcon size={18} />,
        path: "/master-data/sites",
        permission: "master.sites.view",
      },
      {
        label: "Assets & Service Points",
        icon: <ServiceTargetIcon size={18} />,
        path: "/master-data/service-targets",
        permission: "master.targets.view",
      },
      {
        label: "Parts Catalogue",
        icon: <PartsIcon size={18} />,
        path: "/master-data/parts",
        permission: "master.parts.view",
      },
      {
        label: "Workflows",
        icon: <WorkflowIcon size={18} />,
        path: "/workflows",
        permission: "workflows.view",
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Tenants",
        icon: <SitesIcon size={18} />,
        path: "/admin/tenants",
        permission: "platform.tenants.manage",
      },
      {
        label: "Company",
        icon: <BuildingsIcon size={18} />,
        path: "/admin/company",
      },
      {
        label: "People & Teams",
        icon: <CustomersIcon size={18} />,
        path: "/admin/people",
      },
      {
        label: "Roles & Access",
        icon: <AdminIcon size={18} />,
        path: "/admin/roles",
      },
      {
        label: "Security & Audit",
        icon: <CapacityIcon size={18} />,
        path: "/admin/security",
      },
      {
        label: "Evidence Files",
        icon: <ImportIcon size={18} />,
        path: "/admin/files",
      },
      {
        label: "Active Sessions",
        icon: <ReviewQueueIcon size={18} />,
        path: "/admin/sessions",
      },
    ],
  },
];

function isNavActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === "/") {
    return currentPath === "/";
  }
  if (itemPath === "/tasks") {
    return (
      currentPath === "/tasks" ||
      (currentPath.startsWith("/tasks/") &&
        !currentPath.startsWith("/tasks/review-queue"))
    );
  }
  if (itemPath === "/workflows") {
    return (
      currentPath === "/workflows" || currentPath.startsWith("/workflows/")
    );
  }
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}

export function Layout() {
  const { can, isLoading } = useCapabilities();
  const location = useLocation();
  const currentPath = location.pathname;

  const [searchOpen, setSearchOpen] = useState(false);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  // Global shortcut: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute visible sections based on user capabilities/permissions
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.permission || isLoading || can(item.permission),
    ),
  })).filter((section) => section.items.length > 0);

  const allVisibleItems = visibleSections.flatMap((s) => s.items);
  const currentItem = allVisibleItems.find((item) =>
    isNavActive(item.path, currentPath),
  );
  const currentLabel = currentItem?.label ?? "Overview";
  const currentSection = visibleSections.find((s) =>
    s.items.some((item) => isNavActive(item.path, currentPath)),
  );
  const currentSectionTitle = currentSection?.title ?? "Operations";

  const handleSignOut = () => {
    localStorage.removeItem("fieldbrix_token");
    localStorage.removeItem("fieldbrix_refresh_token");
    window.location.href = "/login";
  };

  return (
    <div className="fb-app-shell">
      {/* Global Command Palette */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* Sticky Collapsible Unified Sidebar */}
      <aside
        className={`fb-sidebar ${sidebarCollapsed ? "fb-sidebar--collapsed" : ""}`}
        aria-label="Application sidebar"
      >
        <div className="fb-sidebar-header">
          <div className="fb-brand-container">
            <span className="fb-brand-badge">F</span>
            {!sidebarCollapsed && (
              <div className="fb-brand-text">
                <span className="fb-logo-text">FieldBrix</span>
                <span className="fb-logo-sub">Operations Cloud</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="fb-sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRightIcon size={16} />
            ) : (
              <ChevronLeftIcon size={16} />
            )}
          </button>
        </div>

        <nav className="fb-nav" role="navigation" aria-label="Main navigation">
          {visibleSections.map((section, sIdx) => (
            <div key={section.title ?? sIdx} className="fb-nav-section">
              {section.title && !sidebarCollapsed && (
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(255, 255, 255, 0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    padding: "0.75rem 0.75rem 0.35rem",
                  }}
                >
                  {section.title}
                </div>
              )}
              {sidebarCollapsed && sIdx > 0 && (
                <div
                  style={{
                    height: "1px",
                    background: "rgba(255, 255, 255, 0.08)",
                    margin: "0.5rem 0.5rem",
                  }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}
              >
                {section.items.map((item) => {
                  const isActive = isNavActive(item.path, currentPath);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`fb-nav-item ${isActive ? "fb-nav-item--active" : ""}`}
                      aria-current={isActive ? "page" : undefined}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <span className="fb-nav-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      {!sidebarCollapsed && (
                        <span className="fb-nav-label">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="fb-sidebar-footer">
          <button
            type="button"
            onClick={handleSignOut}
            className="fb-signout-button"
            aria-label="Sign out"
            title={sidebarCollapsed ? "Sign out" : undefined}
          >
            <span className="fb-signout-icon" aria-hidden="true">
              <LogoutIcon size={16} />
            </span>
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="fb-main">
        <header className="fb-topbar">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "var(--fb-slate-500)",
                fontFamily: "var(--fb-font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              FieldBrix
            </span>
            <span style={{ color: "var(--fb-slate-400)", fontSize: "11px" }}>
              /
            </span>
            <span style={{ color: "var(--fb-slate-500)", fontSize: "12px" }}>
              {currentSectionTitle}
            </span>
            <span style={{ color: "var(--fb-slate-400)", fontSize: "11px" }}>
              /
            </span>
            <span
              style={{
                fontWeight: 700,
                color: "var(--fb-slate-900)",
                fontSize: "13px",
              }}
            >
              {currentLabel}
            </span>
          </div>

          <div className="fb-top-actions">
            {/* Global Search Bar Trigger */}
            <button
              type="button"
              className="fb-topbar-search-btn"
              onClick={() => setSearchOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 12px",
                height: "34px",
                borderRadius: "var(--fb-radius-md)",
                background: "#ffffff",
                border: "1px solid var(--fb-border-subtle)",
                color: "var(--fb-slate-500)",
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: "var(--fb-shadow-xs)",
              }}
            >
              <SearchIcon size={14} />
              <span style={{ marginRight: "12px" }}>
                Quick search tasks, clients...
              </span>
              <kbd
                style={{
                  padding: "1px 5px",
                  borderRadius: "4px",
                  background: "var(--fb-slate-100)",
                  border: "1px solid var(--fb-border-subtle)",
                  fontSize: "10px",
                  fontWeight: 600,
                  fontFamily: "var(--fb-font-mono)",
                }}
              >
                ⌘K
              </kbd>
            </button>

            {/* Client / Workspace Context Switcher */}
            <ClientSwitcher />

            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </header>

        <div className="fb-content-viewport">
          <Outlet />
        </div>
      </main>

      {/* Global Snackbars & Toasts Container */}
      <ToastContainer />
    </div>
  );
}
