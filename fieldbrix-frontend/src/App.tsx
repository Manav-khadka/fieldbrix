import "./App.css";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Operations } from "./components/Operations";

const api =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:3000";
const platformToken =
  import.meta.env.VITE_PLATFORM_ADMIN_TOKEN ?? "local-platform-admin";
const platformAdminId = import.meta.env.VITE_PLATFORM_ADMIN_ID;
const localObjectBucket =
  import.meta.env.VITE_S3_BUCKET ?? "fieldbrix-local-uploads";
type View =
  | "overview"
  | "tenants"
  | "company"
  | "people"
  | "roles"
  | "security"
  | "files"
  | "sessions"
  | "operations";
type Tenant = {
  id: string;
  name: string;
  status: string;
  timezone: string;
  users: number;
  branches: number;
};
type Role = {
  id: string;
  name: string;
  permissions: string[];
  preset: boolean;
  revision: number;
};
type User = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles: string[];
};
type Item = {
  id: string;
  name: string;
  timezone?: string;
  active: boolean;
  leadUserId?: string;
};
type Session = { id: string; userId: string };

const navigation: Array<[View, string, string, string]> = [
  ["overview", "Overview", "✦", "Workspace pulse"],
  ["operations" as View, "Operations", "◌", "Master data & work"],
  ["tenants", "Tenants", "⌂", "Lifecycle & limits"],
  ["company", "Company", "▦", "Settings & structure"],
  ["people", "People", "◎", "Users & invitations"],
  ["roles", "Roles", "◈", "Access control"],
  ["security", "Security", "⌁", "Audit & sessions"],
  ["files", "Files", "↥", "Evidence uploads"],
  ["sessions", "Sessions", "◌", "Devices & revocation"],
];

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("fieldbrix_token") ?? "",
  );
  const [view, setView] = useState<View>("overview");
  const [identifier, setIdentifier] = useState("admin@fieldbrix.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Item[]>([]);
  const [teams, setTeams] = useState<Item[]>([]);
  const [audit, setAudit] = useState<
    Array<{ id: string; action: string; targetId: string; occurredAt: string }>
  >([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [godSession, setGodSession] = useState<GodSession | null>(null);
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
      const body = await result.json().catch(() => ({}));
      if (!result.ok) {
        if (result.status === 401) {
          localStorage.removeItem("fieldbrix_token");
          localStorage.removeItem("fieldbrix_refresh_token");
          setToken("");
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
        throw new Error(body.error?.message ?? body.message ?? "Request failed");
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
      ] = await Promise.all([
        request("/me"),
        request("/roles"),
        request("/users"),
        request("/branches"),
        request("/teams"),
        request("/audit-events"),
        request("/me/sessions"),
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
      const tenantData = await request("/platform/tenants", {}, true).catch(
        () => [],
      );
      setTenants(toArray(tenantData));
      setError("");
    } catch (reason) {
      const msg =
        reason instanceof Error ? reason.message : "Unable to load workspace";
      if (msg === "UNAUTHORIZED" || msg.includes("UNAUTHORIZED")) {
        localStorage.removeItem("fieldbrix_token");
        localStorage.removeItem("fieldbrix_refresh_token");
        setToken("");
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
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
          <span>⌄</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(([id, label, icon, hint]) => (
            <button
              className={`nav-item ${view === id ? "selected" : ""}`}
              key={id}
              onClick={() => setView(id)}
            >
              <i>{icon}</i>
              <span>
                <b>{label}</b>
                <small>{hint}</small>
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
            ↗
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">FIELD BRIX / ADMINISTRATION</p>
            <h1>{navigation.find(([id]) => id === view)?.[1]}</h1>
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
            <button className="secondary-button" onClick={() => void endGodMode()}>
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
          <Overview
            tenants={tenants}
            roles={roles}
            users={users}
            branches={branches}
            audit={audit}
            go={setView}
          />
        )}
        {view === "tenants" && (
          <Tenants
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
          <Company
            branches={branches}
            teams={teams}
            request={request}
            refresh={refresh}
            notify={setNotice}
          />
        )}
        {view === "people" && (
          <People
            users={users}
            roles={roles}
            request={request}
            refresh={refresh}
            notify={setNotice}
          />
        )}
        {view === "roles" && (
          <Roles
            roles={roles}
            request={request}
            refresh={refresh}
            notify={setNotice}
          />
        )}
        {view === "security" && (
          <Security audit={audit} request={request} notify={setNotice} />
        )}
        {view === "files" && <Files request={request} notify={setNotice} />}
        {view === "sessions" && (
          <Sessions
            sessions={sessions}
            request={request}
            refresh={refresh}
            notify={setNotice}
          />
        )}
        {view === ("operations" as View) && (
          <Operations request={request} notify={setNotice} />
        )}
      </main>
    </div>
  );
}

export function Login({
  identifier,
  password,
  setIdentifier,
  setPassword,
  onSubmit,
  error,
  busy,
  onForgot,
}: {
  identifier: string;
  password: string;
  setIdentifier: (value: string) => void;
  setPassword: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  error: string;
  busy: boolean;
  onForgot: (identifier: string) => Promise<void>;
}) {
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState(identifier);
  const [forgotMessage, setForgotMessage] = useState("");
  const submitForgot = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await onForgot(forgotIdentifier);
      setForgotMessage(
        "If the account exists, reset instructions have been queued.",
      );
    } catch (reason) {
      setForgotMessage(
        reason instanceof Error ? reason.message : "Unable to request a reset",
      );
    }
  };
  return (
    <main className="login-page">
      <div className="login-visual">
        <span className="eyebrow light">FIELD OPERATIONS / 01</span>
        <h1>
          Make every
          <br />
          <em>move count.</em>
        </h1>
        <p>
          One calm command center for the people, places, and work that keep
          your operation moving.
        </p>
        <div className="quote">
          “The clearest view of our operation we’ve ever had.”
          <small>— Operations team, Muscat</small>
        </div>
      </div>
      <div className="login-panel">
        <div className="brand dark">
          <span className="brand-mark">F</span>
          <span>
            fieldbrix<small>operations cloud</small>
          </span>
        </div>
        <form onSubmit={onSubmit}>
          <p className="eyebrow accent">WELCOME BACK</p>
          <h2>Sign in to your workspace</h2>
          <p className="form-copy">
            Use your workforce email or user ID to continue.
          </p>
          <label>
            Email or user ID
            <input
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button full" disabled={busy}>
            {busy ? "Signing in…" : "Continue to workspace"}
            <span>→</span>
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => setForgotOpen((open) => !open)}
          >
            Forgot password?
          </button>
          {forgotOpen && (
            <form className="forgot-form" onSubmit={submitForgot}>
              <label>
                Account email or user ID
                <input
                  value={forgotIdentifier}
                  onChange={(event) => setForgotIdentifier(event.target.value)}
                />
              </label>
              <button className="secondary-button">
                Send reset instructions
              </button>
              {forgotMessage && (
                <small className="form-copy">{forgotMessage}</small>
              )}
            </form>
          )}
        </form>
        <small className="login-foot">
          Protected by FieldBrix identity · v0.0.1
        </small>
      </div>
    </main>
  );
}

async function sha256Base64(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  let binary = "";
  for (const byte of new Uint8Array(digest))
    binary += String.fromCharCode(byte);
  return btoa(binary);
}

function Files({
  request,
  notify,
}: {
  request: (
    path: string,
    options?: RequestInit,
    platform?: boolean,
  ) => Promise<any>;
  notify: (message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const checksum = await sha256Base64(file);
      const intent = await request("/files/upload-intents", {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ mime: file.type, size: file.size, checksum }),
      });
      const signedUrl = String(intent.url).replace(
        /^https?:\/\/[^/]+\.localstack:4566/,
        `http://localhost:4566/${localObjectBucket}`,
      );
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: intent.headers,
        body: file,
      });
      if (!uploadResponse.ok)
        throw new Error("The object store rejected the upload");
      await request(`/files/${intent.uploadId}/complete`, {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ checksum }),
      });
      setUploaded((current) => [file.name, ...current]);
      setFile(null);
      notify("File uploaded and verified");
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to upload file",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-stack">
      <Intro
        eyebrow="EVIDENCE STORAGE"
        title="Files & evidence"
        text="Upload approved images and PDFs through a checksum-verified, tenant-scoped object-store flow."
      >
        <form className="inline-form" onSubmit={upload}>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <button className="primary-button" disabled={!file || busy}>
            {busy ? "Uploading…" : "Upload file"}
          </button>
        </form>
      </Intro>
      <section className="panel">
        <PanelTitle title="Recent uploads" />
        {uploaded.map((name) => (
          <div className="directory-row" key={name}>
            <span className="company-logo">↥</span>
            <span>
              <b>{name}</b>
              <small>Checksum verified · object stored</small>
            </span>
            <Status value="COMPLETED" />
          </div>
        ))}
        {!uploaded.length && (
          <Empty text="Uploaded evidence will appear here during this session." />
        )}
      </section>
    </div>
  );
}

function Sessions({
  sessions,
  request,
  refresh,
  notify,
}: {
  sessions: Session[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const revoke = async (id: string) => {
    try {
      await request(`/me/sessions/${id}`, { method: "DELETE" });
      notify("Session revoked");
      await refresh();
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to revoke session",
      );
    }
  };
  return (
    <div className="page-stack">
      <Intro
        eyebrow="IDENTITY SECURITY"
        title="Sessions & devices"
        text="Review active sessions and revoke access you no longer recognize."
      />
      <section className="table-panel">
        <div className="table-toolbar">
          <b>{sessions.length} active sessions</b>
          <span>Revocation is immediate</span>
        </div>
        {sessions.map((session) => (
          <div className="directory-row" key={session.id}>
            <span className="company-logo">◌</span>
            <span>
              <b>{session.id.slice(0, 12)}…</b>
              <small>User {session.userId}</small>
            </span>
            <Status value="ACTIVE" />
            <button
              className="secondary-button"
              onClick={() => void revoke(session.id)}
            >
              Revoke
            </button>
          </div>
        ))}
        {!sessions.length && (
          <Empty text="No active sessions were returned by the identity service." />
        )}
      </section>
    </div>
  );
}

function Overview({
  tenants,
  roles,
  users,
  branches,
  audit,
  go,
}: {
  tenants: Tenant[];
  roles: Role[];
  users: User[];
  branches: Item[];
  audit: Array<{
    id: string;
    action: string;
    targetId: string;
    occurredAt: string;
  }>;
  go: (view: View) => void;
}) {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow accent">THURSDAY · 14 AUGUST 2026</span>
          <h2>Good morning, Admin.</h2>
          <p>
            Your operation is in a good place. Here’s the signal from across
            your workspace.
          </p>
        </div>
        <div className="hero-signal">
          <b>+12.4%</b>
          <small>workspace health</small>
          <div className="sparkline">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>
      <section className="metric-grid">
        <Metric
          label="Active tenants"
          value={String(tenants.length)}
          detail="provisioned workspaces"
          tone="blue"
          go={() => go("tenants")}
        />
        <Metric
          label="Workforce"
          value={String(users.length)}
          detail="active identities"
          tone="green"
          go={() => go("people")}
        />
        <Metric
          label="Access roles"
          value={String(roles.length)}
          detail="capability sets"
          tone="amber"
          go={() => go("roles")}
        />
        <Metric
          label="Branches"
          value={String(branches.length)}
          detail="operational sites"
          tone="purple"
          go={() => go("company")}
        />
      </section>
      <div className="content-grid">
        <section className="panel">
          <PanelTitle
            title="Recent activity"
            action="View audit"
            onClick={() => go("security")}
          />
          {audit.slice(0, 5).map((item) => (
            <div className="activity" key={item.id}>
              <span className="activity-icon">✦</span>
              <span>
                <b>{item.action.replaceAll("_", " ").toLowerCase()}</b>
                <small>
                  {item.targetId} ·{" "}
                  {new Date(item.occurredAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </span>
            </div>
          ))}
          {!audit.length && (
            <Empty text="Mutations and security events will appear here." />
          )}
        </section>
        <section className="panel">
          <PanelTitle title="Quick actions" />
          <div className="quick-grid">
            <button onClick={() => go("tenants")}>
              <b>＋</b>
              <span>
                Provision tenant<small>Add a new company</small>
              </span>
            </button>
            <button onClick={() => go("people")}>
              <b>◎</b>
              <span>
                Invite teammate<small>Grow your workforce</small>
              </span>
            </button>
            <button onClick={() => go("roles")}>
              <b>◈</b>
              <span>
                Configure access<small>Review role grants</small>
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
  tone,
  go,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
  go: () => void;
}) {
  return (
    <button className={`metric-card ${tone}`} onClick={go}>
      <span>{label} ↗</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      <i />
    </button>
  );
}
function PanelTitle({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="panel-title">
      <h3>{title}</h3>
      {action && <button onClick={onClick}>{action} →</button>}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <span>✦</span>
      <b>Nothing here yet</b>
      <small>{text}</small>
    </div>
  );
}
function Intro({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <section className="page-intro">
      <div>
        <span className="eyebrow accent">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {children}
    </section>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span className={`status-pill ${value.toLowerCase()}`}>
      <i />
      {value}
    </span>
  );
}
function TableHead({ labels }: { labels: string[] }) {
  return (
    <div className="table-head">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

function Tenants({
  tenants,
  request,
  refresh,
  notify,
  godSession,
  onStartGodMode,
  onEndGodMode,
}: {
  tenants: Tenant[];
  request: (
    path: string,
    options?: RequestInit,
    platform?: boolean,
  ) => Promise<any>;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  godSession: GodSession | null;
  onStartGodMode: (session: GodSession) => void;
  onEndGodMode: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request(
        "/platform/tenants",
        { method: "POST", body: JSON.stringify({ name }) },
        true,
      );
      setName("");
      notify("Tenant provisioned successfully");
      await refresh();
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to provision tenant",
      );
    }
  };
  const changeStatus = async (tenant: Tenant) => {
    const reason = window.prompt(
      `${tenant.status === "ACTIVE" ? "Suspend" : "Restore"} reason`,
    );
    if (!reason?.trim()) return;
    try {
      await request(
        `/platform/tenants/${tenant.id}/${tenant.status === "ACTIVE" ? "suspend" : "restore"}`,
        { method: "POST", body: JSON.stringify({ reason }) },
        true,
      );
      notify(`Tenant ${tenant.status === "ACTIVE" ? "suspended" : "restored"}`);
      await refresh();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to change tenant status",
      );
    }
  };
  const inspectUsage = async (id: string) => {
    try {
      setUsage(await request(`/platform/tenants/${id}/usage`, {}, true));
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to load tenant usage",
      );
    }
  };
  return (
    <div className="page-stack">
      <Intro
        eyebrow="PLATFORM CONTROL"
        title="Tenant lifecycle"
        text="Provision, monitor, and protect every company in your FieldBrix network."
      >
        <form className="inline-form" onSubmit={submit}>
          <input
            placeholder="New tenant name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button className="primary-button">＋ Provision</button>
        </form>
      </Intro>
      <section className="table-panel">
        <div className="table-toolbar">
          <b>{tenants.length} tenants</b>
          <span>Platform-wide visibility · limits enforced server-side</span>
        </div>
        <TableHead
          labels={["Company", "Status", "Timezone", "People", "Branches", ""]}
        />
        {tenants.map((tenant) => (
          <div className="table-row" key={tenant.id}>
            <span className="entity">
              <span className="company-logo">{tenant.name[0]}</span>
              <span>
                <b>{tenant.name}</b>
                <small>{tenant.id}</small>
              </span>
            </span>
            <Status value={tenant.status} />
            <span>{tenant.timezone}</span>
            <span>{tenant.users}</span>
            <span>{tenant.branches}</span>
            <div className="row-actions">
              <button
                className="row-menu"
                onClick={() => void inspectUsage(tenant.id)}
              >
                Usage
              </button>
              <button
                className="row-menu"
                onClick={() => void changeStatus(tenant)}
              >
                {tenant.status === "ACTIVE" ? "Suspend" : "Restore"}
              </button>
            </div>
          </div>
        ))}
        {!tenants.length && (
          <Empty text="Check platform administrator configuration or provision your first tenant." />
        )}
      </section>
      {usage && (
        <section className="panel usage-card">
          <PanelTitle
            title="Tenant usage"
            action="Close"
            onClick={() => setUsage(null)}
          />
          <pre>{JSON.stringify(usage, null, 2)}</pre>
        </section>
      )}
      <GodMode
        tenants={tenants}
        request={request}
        notify={notify}
        session={godSession}
        onStart={onStartGodMode}
        onEnd={onEndGodMode}
      />
    </div>
  );
}

function Company({
  branches,
  teams,
  request,
  refresh,
  notify,
}: {
  branches: Item[];
  teams: Item[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState("settings");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("FieldBrix Demo Company");
  const [timezone, setTimezone] = useState("Asia/Muscat");
  const [locale, setLocale] = useState("en-GB");
  const [terminology, setTerminology] = useState("");
  const [colorTheme, setColorTheme] = useState("#2C6E8C");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [numberFormat, setNumberFormat] = useState("1,234.56");
  const [logoObjectKey, setLogoObjectKey] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  useEffect(() => {
    void request("/company")
      .then((settings) => {
        if (typeof settings?.timezone === "string")
          setTimezone(settings.timezone);
        if (typeof settings?.locale === "string") setLocale(settings.locale);
        if (settings?.terminology && typeof settings.terminology === "object")
          setTerminology(JSON.stringify(settings.terminology));
        if (typeof settings?.colorTheme === "string")
          setColorTheme(settings.colorTheme);
        if (typeof settings?.dateFormat === "string")
          setDateFormat(settings.dateFormat);
        if (typeof settings?.numberFormat === "string")
          setNumberFormat(settings.numberFormat);
        if (typeof settings?.logoObjectKey === "string")
          setLogoObjectKey(settings.logoObjectKey);
      })
      .catch(() => undefined);
  }, [request]);
  const uploadLogo = async (file: File) => {
    setLogoBusy(true);
    try {
      const checksum = await sha256Base64(file);
      const intent = await request("/files/upload-intents", {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ mime: file.type, size: file.size, checksum }),
      });
      const signedUrl = String(intent.url).replace(
        /^https?:\/\/[^/]+\.localstack:4566/,
        `http://localhost:4566/${localObjectBucket}`,
      );
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: intent.headers,
        body: file,
      });
      if (!uploadResponse.ok)
        throw new Error("The object store rejected the logo upload");
      await request(`/files/${intent.uploadId}/complete`, {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ checksum }),
      });
      setLogoObjectKey(intent.uploadId);
      notify("Logo uploaded — save changes to apply it");
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to upload logo",
      );
    } finally {
      setLogoBusy(false);
    }
  };
  const add = async (event: FormEvent, kind: "branches" | "teams") => {
    event.preventDefault();
    try {
      await request(`/${kind}`, {
        method: "POST",
        body: JSON.stringify({ name, timezone: "Asia/Muscat" }),
      });
      setName("");
      notify(`${kind.slice(0, -1)} created`);
      await refresh();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Unable to save");
    }
  };
  const saveSettings = async () => {
    try {
      let parsedTerminology: unknown = {};
      try {
        parsedTerminology = terminology.trim() ? JSON.parse(terminology) : {};
      } catch {
        throw new Error("Terminology must be valid JSON");
      }
      await request("/company", {
        method: "PATCH",
        body: JSON.stringify({
          name: companyName,
          timezone,
          locale,
          terminology: parsedTerminology,
          colorTheme,
          dateFormat,
          numberFormat,
          ...(logoObjectKey ? { logoObjectKey } : {}),
        }),
      });
      notify("Company settings saved");
      await refresh();
    } catch (reason) {
      notify(
        reason instanceof Error
          ? reason.message
          : "Unable to save company settings",
      );
    }
  };
  return (
    <div className="page-stack">
      <Intro
        eyebrow="WORKSPACE SETTINGS"
        title="Company control room"
        text="Shape the operating language, structure, and working rhythm of your company."
      />
      <div className="subnav">
        {[
          ["settings", "Settings"],
          ["branches", `Branches · ${branches.length}`],
          ["teams", `Teams · ${teams.length}`],
        ].map(([id, label]) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "settings" && (
        <section className="settings-layout">
          <div className="panel settings-form">
            <PanelTitle title="Workspace identity" />
            <label>
              Company name
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </label>
            <label>
              Timezone
              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              >
                <option>Asia/Muscat</option>
                <option>UTC</option>
              </select>
            </label>
            <label>
              Locale
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
              >
                <option>en-GB · English</option>
                <option>ar-OM · العربية</option>
              </select>
            </label>
            <label>
              Terminology
              <textarea
                placeholder='{"task":"work order"}'
                value={terminology}
                onChange={(event) => setTerminology(event.target.value)}
              />
            </label>
            <label>
              Brand color
              <input
                type="color"
                value={colorTheme}
                onChange={(event) => setColorTheme(event.target.value)}
              />
            </label>
            <label>
              Date format
              <select
                value={dateFormat}
                onChange={(event) => setDateFormat(event.target.value)}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </label>
            <label>
              Number format
              <select
                value={numberFormat}
                onChange={(event) => setNumberFormat(event.target.value)}
              >
                <option value="1,234.56">1,234.56</option>
                <option value="1.234,56">1.234,56</option>
                <option value="1 234,56">1 234,56</option>
              </select>
            </label>
            <label>
              Logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                disabled={logoBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadLogo(file);
                }}
              />
              {logoObjectKey && (
                <small className="form-copy">
                  {logoBusy ? "Uploading…" : `Current logo: ${logoObjectKey}`}
                </small>
              )}
            </label>
            <button
              className="primary-button"
              onClick={() => void saveSettings()}
            >
              Save changes →
            </button>
          </div>
          <div className="panel preview">
            <span className="eyebrow accent">LIVE PREVIEW</span>
            <h3 style={{ color: colorTheme }}>{companyName}</h3>
            <p>Operations workspace</p>
            <hr />
            <span>
              Working week <b>Sun — Thu</b>
            </span>
            <span>
              Local time <b>{timezone.replace("/", " / ")}</b>
            </span>
            <span>
              Date shown as <b>{dateFormat}</b>
            </span>
            <span>
              Numbers shown as <b>{numberFormat}</b>
            </span>
            <span className="brand-swatch-row">
              Brand color <i style={{ background: colorTheme }} />
              <b>{colorTheme}</b>
            </span>
          </div>
        </section>
      )}
      {tab !== "settings" && (
        <section className="table-panel">
          <div className="table-toolbar">
            <b>{tab === "branches" ? "Branches" : "Teams"}</b>
            <form
              className="inline-form"
              onSubmit={(event) => void add(event, tab as "branches" | "teams")}
            >
              <input
                placeholder={`New ${tab.slice(0, -1)} name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <button className="primary-button">＋ Add</button>
            </form>
          </div>
          {(tab === "branches" ? branches : teams).map((item) => (
            <div className="directory-row" key={item.id}>
              <span className="company-logo">{item.name[0]}</span>
              <span>
                <b>{item.name}</b>
                <small>
                  {item.timezone ??
                    (item.leadUserId
                      ? `Lead ${item.leadUserId}`
                      : "No lead assigned")}
                </small>
              </span>
              <Status value={item.active ? "ACTIVE" : "INACTIVE"} />
              <button className="row-menu">•••</button>
            </div>
          ))}
          {!(tab === "branches" ? branches : teams).length && (
            <Empty
              text={`Create your first ${tab.slice(0, -1)} to organize the operation.`}
            />
          )}
        </section>
      )}
    </div>
  );
}

function People({
  users,
  roles,
  request,
  refresh,
  notify,
}: {
  users: User[];
  roles: Role[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [invitationToken, setInvitationToken] = useState("");
  const invite = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const invitation = await request("/users/invite", {
        method: "POST",
        body: JSON.stringify({ email, idempotencyKey: crypto.randomUUID() }),
      });
      setEmail("");
      setInvitationToken(invitation?.invitationToken ?? "");
      notify("Invitation sent");
      await refresh();
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to invite user",
      );
    }
  };
  const changeActiveState = async (person: User) => {
    try {
      await request(
        `/users/${person.id}/${person.active ? "deactivate" : "unlock"}`,
        {
          method: "POST",
          body: person.active
            ? JSON.stringify({ reason: "Local administrator action" })
            : undefined,
        },
      );
      notify(person.active ? "User deactivated" : "User unlocked");
      await refresh();
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to update user",
      );
    }
  };
  const assignRole = async (userId: string, roleId: string) => {
    try {
      await request(`/users/${userId}/roles`, {
        method: "PUT",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ roleIds: roleId ? [roleId] : [] }),
      });
      notify("Role assignment saved");
      await refresh();
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to assign role",
      );
    }
  };
  return (
    <div className="page-stack">
      <Intro
        eyebrow="WORKFORCE DIRECTORY"
        title="People & access"
        text="Invite the right people, keep identities current, and protect the work behind every account."
      >
        <form className="inline-form" onSubmit={invite}>
          <input
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="primary-button">＋ Invite</button>
        </form>
      </Intro>
      {invitationToken && (
        <div className="alert success" role="status">
          Invitation token (local only): <code>{invitationToken}</code>
          <button onClick={() => setInvitationToken("")}>×</button>
        </div>
      )}
      <section className="table-panel">
        <div className="table-toolbar">
          <b>{users.length} workforce identities</b>
          <span>Tenant-scoped directory</span>
        </div>
        <TableHead labels={["Person", "State", "Roles", "Activity", ""]} />
        {users.map((person) => (
          <div className="table-row" key={person.id}>
            <span className="entity">
              <span className="avatar">{person.name[0]}</span>
              <span>
                <b>{person.name}</b>
                <small>{person.email}</small>
              </span>
            </span>
            <Status value={person.active ? "ACTIVE" : "INACTIVE"} />
            <select
              className="compact-select"
              value={person.roles?.[0] ?? ""}
              onChange={(event) =>
                void assignRole(person.id, event.target.value)
              }
              aria-label={`Role for ${person.name}`}
            >
              <option value="">No role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <span className="muted">Recently</span>
            <button
              className="row-menu"
              onClick={() => void changeActiveState(person)}
            >
              {person.active ? "Deactivate" : "Unlock"}
            </button>
          </div>
        ))}
        {!users.length && (
          <Empty text="Invite a teammate to begin building your workforce." />
        )}
      </section>
    </div>
  );
}

type GodSession = { id: string; tenantId: string; expiresAt: string };

function GodMode({
  tenants,
  request,
  notify,
  session,
  onStart,
  onEnd,
}: {
  tenants: Tenant[];
  request: (
    path: string,
    options?: RequestInit,
    platform?: boolean,
  ) => Promise<any>;
  notify: (message: string) => void;
  session: GodSession | null;
  onStart: (session: GodSession) => void;
  onEnd: () => Promise<void>;
}) {
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!tenantId && tenants[0]) setTenantId(tenants[0].id);
  }, [tenantId, tenants]);
  const start = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const next = await request(
        "/platform/god-sessions",
        {
          method: "POST",
          body: JSON.stringify({
            tenantId,
            reason,
            reauthSecret: platformToken,
          }),
        },
        true,
      );
      onStart(next);
      notify("God-mode context started and is audited");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to start god mode",
      );
    }
  };
  return (
    <section className={`panel god-panel ${session ? "active" : ""}`}>
      <PanelTitle
        title="Platform context"
        action={session ? "End context" : undefined}
        onClick={() => void onEnd()}
      />
      {session ? (
        <div className="god-banner">
          <b>God mode active</b>
          <span>
            {session.tenantId} · expires{" "}
            {new Date(session.expiresAt).toLocaleTimeString()}
          </span>
          <small>
            Every action is audited. This context is not available to workforce
            users.
          </small>
        </div>
      ) : (
        <form className="god-form" onSubmit={start}>
          <label>
            Tenant
            <select
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reason
            <input
              required
              minLength={5}
              placeholder="Support investigation reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button className="secondary-button">Enter audited context</button>
        </form>
      )}
    </section>
  );
}

function Roles({
  roles,
  request,
  refresh,
  notify,
}: {
  roles: Role[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Role | null>(null);
  const [catalog, setCatalog] = useState<string[]>([]);
  useEffect(() => {
    void request("/permissions")
      .then((data) =>
        setCatalog(
          (data?.permissions ?? []).map((item: { key: string }) => item.key),
        ),
      )
      .catch(() => setCatalog([]));
  }, [request]);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request("/roles", {
        method: "POST",
        body: JSON.stringify({ name, idempotencyKey: crypto.randomUUID() }),
      });
      setName("");
      notify("Role created");
      await refresh();
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : "Unable to create role",
      );
    }
  };
  return (
    <div className="page-stack">
      <Intro
        eyebrow="DYNAMIC AUTHORIZATION"
        title="Roles & capabilities"
        text="Compose additive access from clear permissions. Default is deny; every grant has a reason."
      >
        <form className="inline-form" onSubmit={create}>
          <input
            placeholder="New role name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button className="primary-button">＋ Create role</button>
        </form>
      </Intro>
      <div className="roles-layout">
        <section className="panel role-list">
          <PanelTitle title="Role library" />
          {roles.map((role) => (
            <button
              className={`role-item ${selected?.id === role.id ? "selected" : ""}`}
              key={role.id}
              onClick={() => setSelected(role)}
            >
              <span className="role-symbol">{role.preset ? "✦" : "◈"}</span>
              <span>
                <b>{role.name}</b>
                <small>
                  {role.permissions.length} permissions · revision{" "}
                  {role.revision}
                </small>
              </span>
              →
            </button>
          ))}
          {!roles.length && (
            <Empty text="Sign in with a tenant administrator to manage access." />
          )}
        </section>
        <section className="panel capability-panel">
          {selected ? (
            <>
              <span className="eyebrow accent">
                {selected.preset ? "PRESET ROLE" : "CUSTOM ROLE"}
              </span>
              <h3>{selected.name}</h3>
              <p className="muted">
                Effective grants are additive and revisioned.
              </p>
              <div className="permission-cloud">
                {selected.permissions.map((permission) => (
                  <span key={permission}>{permission}</span>
                ))}
              </div>
              {!selected.preset && catalog.length > 0 && (
                <div className="permission-matrix">
                  <p className="eyebrow">CAPABILITY MATRIX</p>
                  {catalog.map((permission) => (
                    <label key={permission} className="permission-option">
                      <input
                        type="checkbox"
                        checked={selected.permissions.includes(permission)}
                        onChange={(event) =>
                          setSelected({
                            ...selected,
                            permissions: event.target.checked
                              ? [...selected.permissions, permission]
                              : selected.permissions.filter(
                                  (item) => item !== permission,
                                ),
                          })
                        }
                      />
                      <span>{permission}</span>
                    </label>
                  ))}
                </div>
              )}
              {!selected.preset && (
                <button
                  className="secondary-button"
                  onClick={() =>
                    void request(`/roles/${selected.id}/permissions`, {
                      method: "PUT",
                      headers: { "idempotency-key": crypto.randomUUID() },
                      body: JSON.stringify({
                        permissions: selected.permissions,
                        revision: selected.revision,
                      }),
                    }).then(() => {
                      notify("Role permissions saved");
                      return refresh();
                    })
                  }
                >
                  Save permissions
                </button>
              )}
              {!selected.preset && (
                <button
                  className="secondary-button"
                  onClick={() =>
                    void request(`/roles/${selected.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        name: selected.name,
                        revision: selected.revision,
                      }),
                    }).then(() => {
                      notify("Role revision saved");
                      return refresh();
                    })
                  }
                >
                  Save role name
                </button>
              )}
            </>
          ) : (
            <Empty text="Select a role to review its effective capability set." />
          )}
        </section>
      </div>
    </div>
  );
}

function Security({
  audit,
  request,
  notify,
}: {
  audit: Array<{
    id: string;
    action: string;
    targetId: string;
    occurredAt: string;
  }>;
  request: (path: string, options?: RequestInit) => Promise<any>;
  notify: (message: string) => void;
}) {
  return (
    <div className="page-stack">
      <Intro
        eyebrow="TRUST & CONTROL"
        title="Security center"
        text="A clear trail for every sensitive action, session, and authorization decision."
      >
        <button
          className="secondary-button"
          onClick={() =>
            void request("/audit-events/verify")
              .then(() => notify("Audit chain verified"))
              .catch(() => notify("Audit chain requires review"))
          }
        >
          Verify audit chain
        </button>
      </Intro>
      <div className="security-grid">
        <section className="panel security-score">
          <span className="eyebrow accent">SECURITY POSTURE</span>
          <strong className="score">
            98<small>/100</small>
          </strong>
          <h3>Healthy and monitored</h3>
          <p>
            Tenant isolation, session rotation, and audit integrity are active.
          </p>
          {[
            "RLS tenant isolation",
            "Refresh token rotation",
            "Append-only audit trail",
          ].map((item) => (
            <div className="check" key={item}>
              <span>✓</span>
              <b>{item}</b>
              <small>Active and monitored</small>
            </div>
          ))}
        </section>
        <section className="table-panel">
          <div className="table-toolbar">
            <b>Audit events</b>
            <span>Immutable operational record</span>
          </div>
          {audit.map((event) => (
            <div className="audit-row" key={event.id}>
              <span className="audit-dot" />
              <span>
                <b>{event.action.replaceAll("_", " ")}</b>
                <small>{event.targetId}</small>
              </span>
              <time>{new Date(event.occurredAt).toLocaleString()}</time>
            </div>
          ))}
          {!audit.length && (
            <Empty text="Security events will be recorded as your team works." />
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
