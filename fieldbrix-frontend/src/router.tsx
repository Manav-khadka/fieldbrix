import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "./routes/_layout";
import { OverviewPage } from "./routes/index";
import { CustomersPage } from "./routes/master-data/customers";
import { SitesPage } from "./routes/master-data/sites";
import { ServiceTargetsPage } from "./routes/master-data/service-targets";
import { PartsPage } from "./routes/master-data/parts";
import { ImportsPage } from "./routes/master-data/imports";
import { WorkflowsListPage } from "./routes/workflows/list";
import { WorkflowBuilderPage } from "./routes/workflows/builder";
import { WorkflowRulesPage } from "./routes/workflows/rules";
import { WorkflowVersionsPage } from "./routes/workflows/versions";
import { TasksListPage } from "./routes/tasks/list";
import { TaskDetailPage } from "./routes/tasks/detail";
import { CapacityPage } from "./routes/tasks/capacity";
import LegacyAdminApp, { Login } from "./App";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:3000";

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("admin@fieldbrix.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? "Login failed");
      }
      const body = (await res.json()) as {
        data?: { accessToken?: string; refreshToken?: string; token?: string };
        accessToken?: string;
        token?: string;
      };
      const token =
        body?.data?.accessToken ??
        body?.data?.token ??
        body?.accessToken ??
        body?.token ??
        "";
      if (!token) {
        throw new Error("No authentication token returned from server");
      }
      localStorage.setItem("fieldbrix_token", token);
      if (body?.data?.refreshToken) {
        localStorage.setItem("fieldbrix_refresh_token", body.data.refreshToken);
      }
      await navigate({ to: "/" });
    } catch (err) {
      setError((err as Error).message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (forgottenIdentifier: string) => {
    await fetch(`${API_BASE}/auth/password/forgot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({ identifier: forgottenIdentifier }),
    });
  };

  return (
    <Login
      identifier={identifier}
      password={password}
      setIdentifier={setIdentifier}
      setPassword={setPassword}
      onSubmit={(e) => void handleLogin(e)}
      error={error}
      busy={loading}
      onForgot={forgotPassword}
    />
  );
}

// Root route
const rootRoute = createRootRoute({ component: Outlet });

// Auth guard: redirect to /login if no token
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  component: Layout,
  beforeLoad: () => {
    const token = localStorage.getItem("fieldbrix_token");
    if (!token) throw redirect({ to: "/login" });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
  beforeLoad: () => {
    const token = localStorage.getItem("fieldbrix_token");
    if (token) throw redirect({ to: "/" });
  },
});

// Legacy platform/company administration console (tenants, company settings,
// people, roles, security, files, sessions — sprints 01-05). Not yet ported
// to the router/page architecture; mounted as-is so it stays reachable
// instead of being orphaned by the sprint 06-10 router migration. It gates
// its own login/session state, so it is intentionally NOT nested under
// layoutRoute's guard.
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: LegacyAdminApp,
});

const overviewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  component: OverviewPage,
});

// Master Data
const customersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/master-data/customers",
  component: CustomersPage,
});
const sitesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/master-data/sites",
  component: SitesPage,
});
const serviceTargetsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/master-data/service-targets",
  component: ServiceTargetsPage,
});
const partsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/master-data/parts",
  component: PartsPage,
});
const importsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/master-data/imports",
  component: ImportsPage,
});

// Workflows
const workflowsListRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/workflows",
  component: WorkflowsListPage,
});
const workflowBuilderRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/workflows/$id/builder",
  component: WorkflowBuilderPage,
});
const workflowRulesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/workflows/$id/rules",
  component: WorkflowRulesPage,
});
const workflowVersionsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/workflows/$id/versions",
  component: WorkflowVersionsPage,
});

// Tasks
const tasksListRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/tasks",
  component: TasksListPage,
});
const taskDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/tasks/$id",
  component: TaskDetailPage,
});
const capacityRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/scheduling/capacity",
  component: CapacityPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  adminRoute,
  layoutRoute.addChildren([
    overviewRoute,
    customersRoute,
    sitesRoute,
    serviceTargetsRoute,
    partsRoute,
    importsRoute,
    workflowsListRoute,
    workflowBuilderRoute,
    workflowRulesRoute,
    workflowVersionsRoute,
    tasksListRoute,
    taskDetailRoute,
    capacityRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
