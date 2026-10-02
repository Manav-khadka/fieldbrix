import React, { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Operations } from "../../components/Operations";
import { Login } from "../auth/Login";
import { OverviewView } from "./views/OverviewView";
import { TenantsView } from "./views/TenantsView";
import { CompanyView } from "./views/CompanyView";
import { PeopleView } from "./views/PeopleView";
import { RolesView } from "./views/RolesView";
import { SecurityView } from "./views/SecurityView";
import { FilesView } from "./views/FilesView";
import { SessionsView } from "./views/SessionsView";
import {
  DashboardIcon,
  WorkflowIcon,
  SitesIcon,
  BuildingsIcon,
  CustomersIcon,
  AdminIcon,
  CapacityIcon,
  ImportIcon,
  ReviewQueueIcon,
  LogoutIcon,
} from "../../components/icons";
import type {
  AdminAuditEvent,
  AdminItem,
  AdminRole,
  AdminSession,
  AdminTenant,
  AdminUser,
  AdminView,
  GodSession,
  PlatformStaff,
  WorkforceDirectory,
} from "./types";
import "../../App.css";

const api =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:3000";
const platformToken =
  (import.meta.env.VITE_PLATFORM_ADMIN_TOKEN as string | undefined) ??
  "local-platform-admin";
const platformAdminId = import.meta.env.VITE_PLATFORM_ADMIN_ID as
  | string
  | undefined;

interface NavEntry {
  id: AdminView;
  label: string;
  icon: React.ReactNode;
  hint: string;
}

const navigation: NavEntry[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <DashboardIcon size={18} />,
    hint: "Workspace pulse",
  },
  {
    id: "operations",
    label: "Operations",
    icon: <WorkflowIcon size={18} />,
    hint: "Master data & work",
  },
  {
    id: "tenants",
    label: "Tenants",
    icon: <SitesIcon size={18} />,
    hint: "Lifecycle & limits",
  },
  {
    id: "company",
    label: "Company",
    icon: <BuildingsIcon size={18} />,
    hint: "Settings & structure",
  },
  {
    id: "people",
    label: "People",
    icon: <CustomersIcon size={18} />,
    hint: "Users & invitations",
  },
  {
    id: "roles",
    label: "Roles",
    icon: <AdminIcon size={18} />,
    hint: "Access control",
  },
  {
    id: "security",
    label: "Security",
    icon: <CapacityIcon size={18} />,
    hint: "Audit & sessions",
  },
  {
    id: "files",
    label: "Files",
    icon: <ImportIcon size={18} />,
    hint: "Evidence uploads",
  },
  {
    id: "sessions",
    label: "Sessions",
    icon: <ReviewQueueIcon size={18} />,
    hint: "Devices & revocation",
  },
];

export function AdminApp() {
  const [token, setToken] = useState(
    () => localStorage.getItem("fieldbrix_token") ?? "",
  );
  const [view, setView] = useState<AdminView>("overview");
  const [identifier, setIdentifier] = useState("admin@fieldbrix.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<AdminItem[]>([]);
  const [teams, setTeams] = useState<AdminItem[]>([]);
  const [audit, setAudit] = useState<AdminAuditEvent[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [godSession, setGodSession] = useState<GodSession | null>(null);
  const [workforce, setWorkforce] = useState<WorkforceDirectory>({
    people: [],
    departments: [],
    workflows: [],
  });
  const [platformStaff, setPlatformStaff] = useState<PlatformStaff[]>([]);

  const request = useCallback(
    async (path: string, options: RequestInit = {}, platform = false) => {
      const headers = new Headers(options.headers);
      headers.set("Content-Type", "application/json");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (platform) {
        headers.set("x-platform-admin-token", platformToken);
        if (platformAdminId)
          headers.set("x-platform-admin-id", platformAdminId);
      }
      const result = await fetch(`${api}${path}`, { ...options, headers });
      const body = (await result.json().catch(() => ({}))) as Record<
        string,
        any
      >;
      if (!result.ok) {
        if (result.status === 401) {
          localStorage.removeItem("fieldbrix_token");
          localStorage.removeItem("fieldbrix_refresh_token");
          setToken("");
          if (
            typeof window !== "undefined" &&
            window.location.pathname !== "/login"
          ) {
            window.location.href = "/login";
          }
        }
        throw new Error(
          body.error?.message ?? body.message ?? "Request failed",
        );
      }
      return body.data;
    },
    [token],
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      const [
        me,
        roleData,
        userData,
        branchData,
        teamData,
        auditData,
        sessionData,
        workforceData,
      ] = await Promise.all([
        request("/me"),
        request("/roles"),
        request("/users"),
        request("/branches"),
        request("/teams"),
        request("/audit-events"),
        request("/me/sessions"),
        request("/workforce-directory").catch(() => ({
          people: [],
          departments: [],
          workflows: [],
        })),
      ]);
      const toArray = (v: any) =>
        Array.isArray(v)
          ? v
          : Array.isArray(v?.items)
            ? v.items
            : Array.isArray(v?.data)
              ? v.data
              : [];
      setProfile(me);
      setRoles(toArray(roleData));
      setUsers(toArray(userData));
      setBranches(toArray(branchData));
      setTeams(toArray(teamData));
      setAudit(toArray(auditData));
      setSessions(toArray(sessionData));
      setWorkforce(workforceData);
      const tenantData = await request("/platform/tenants", {}, true).catch(
        () => [],
      );
      setTenants(toArray(tenantData));
      const platformStaffData = await request(
        "/platform/staff",
        {},
        true,
      ).catch(() => []);
      setPlatformStaff(toArray(platformStaffData));
      setError("");
    } catch (reason) {
      const msg =
        reason instanceof Error ? reason.message : "Unable to load workspace";
      if (msg === "UNAUTHORIZED" || msg.includes("UNAUTHORIZED")) {
        localStorage.removeItem("fieldbrix_token");
        localStorage.removeItem("fieldbrix_refresh_token");
        setToken("");
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          window.location.href = "/login";
        }
        return;
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [request, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const endGodMode = useCallback(async () => {
    if (!godSession) return;
    try {
      await request(
        `/platform/god-sessions/${godSession.id}/end`,
        { method: "POST" },
        true,
      );
      setGodSession(null);
      setNotice("God-mode context ended");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to end god mode",
      );
    }
  }, [godSession, request]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier,
          password,
          deviceName: "FieldBrix Web",
        }),
      });
      localStorage.setItem("fieldbrix_token", result.accessToken);
      setToken(result.accessToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async (forgottenIdentifier: string) => {
    await request("/auth/password/forgot", {
      method: "POST",
      headers: { "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ identifier: forgottenIdentifier }),
    });
  };

  if (!token)
    return (
      <Login
        identifier={identifier}
        password={password}
        setIdentifier={setIdentifier}
        setPassword={setPassword}
        onSubmit={login}
        error={error}
        busy={busy}
        onForgot={forgotPassword}
      />
    );

  const signOut = () => {
    localStorage.removeItem("fieldbrix_token");
    setToken("");
  };

  const currentNav = navigation.find((item) => item.id === view);

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <span>
            fieldbrix<small>operations cloud</small>
          </span>
        </div>
        <div className="workspace">
          <span className="tenant-dot" />
          <span>
            <b>{profile?.name ?? "Workspace"}</b>
            <small>Active workspace</small>
          </span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              className={`nav-item ${view === item.id ? "selected" : ""}`}
              key={item.id}
              onClick={() => setView(item.id)}
            >
              <i style={{ display: "flex", alignItems: "center" }}>
                {item.icon}
              </i>
              <span>
                <b>{item.label}</b>
                <small>{item.hint}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system">
            <span className="live-dot" />
            <span>
              <b>All systems operational</b>
              <small>API · Database · Queue</small>
            </span>
          </div>
          <button className="profile" onClick={signOut}>
            <span className="avatar">{(profile?.name ?? "A").slice(0, 1)}</span>
            <span>
              <b>{profile?.name ?? "Administrator"}</b>
              <small>Sign out</small>
            </span>
            <LogoutIcon size={14} />
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">FIELD BRIX / ADMINISTRATION</p>
            <h1>{currentNav?.label}</h1>
          </div>
          <div className="top-actions">
            <span className="connection">
              <span className="live-dot" /> Live
            </span>
            <button
              className="icon-button"
              onClick={() => void refresh()}
              aria-label="Refresh"
            >
              ↻
            </button>
            <span className="avatar">{(profile?.name ?? "A").slice(0, 1)}</span>
          </div>
        </header>
        {godSession && (
          <div className="god-banner app-god-banner" role="status">
            <b>God mode active</b>
            <span>
              {godSession.tenantId} · expires{" "}
              {new Date(godSession.expiresAt).toLocaleTimeString()}
            </span>
            <small>
              Every action is audited. This context is not available to
              workforce users.
            </small>
            <button
              className="secondary-button"
              onClick={() => void endGodMode()}
            >
              End context
            </button>
          </div>
        )}
        {error && (
          <div className="alert error" role="alert">
            ! {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {notice && (
          <div className="alert success" role="status">
            ✓ {notice}
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        {view === "overview" && (
          <OverviewView
            tenants={tenants}
            roles={roles}
            users={users}
            branches={branches}
            audit={audit}
            go={setView}
          />
        )}
        {view === "tenants" && (
          <TenantsView
            tenants={tenants}
            request={request}
            refresh={refresh}
            notify={setNotice}
            godSession={godSession}
            onStartGodMode={setGodSession}
            onEndGodMode={endGodMode}
          />
        )}
        {view === "company" && (
          <CompanyView
            branches={branches}
            teams={teams}
            request={request}
            refresh={refresh}
            notify={setNotice}
          />
        )}
        {view === "people" && (
          <PeopleView
            users={users}
            roles={roles}
            workforce={workforce}
            platformStaff={platformStaff}
            request={request}
            refresh={refresh}
            notify={setNotice}
          />
        )}
        {view === "roles" && (
          <RolesView
            roles={roles}
            request={request}
            refresh={refresh}
            notify={setNotice}
          />
        )}
        {view === "security" && (
          <SecurityView audit={audit} request={request} notify={setNotice} />
        )}
        {view === "files" && <FilesView request={request} notify={setNotice} />}
        {view === "sessions" && (
          <SessionsView
            sessions={sessions}
            request={request}
            refresh={refresh}
            notify={setNotice}
          />
        )}
        {view === "operations" && (
          <Operations request={request} notify={setNotice} />
        )}
      </main>
    </div>
  );
}

export default AdminApp;
