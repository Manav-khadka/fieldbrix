import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { useState } from 'react';
import { Layout } from './routes/_layout';
import { OverviewPage } from './routes/index';
import { CustomersPage } from './routes/master-data/customers';
import { SitesPage } from './routes/master-data/sites';
import { ServiceTargetsPage } from './routes/master-data/service-targets';
import { PartsPage } from './routes/master-data/parts';
import { ImportsPage } from './routes/master-data/imports';
import { WorkflowsListPage } from './routes/workflows/list';
import { WorkflowBuilderPage } from './routes/workflows/builder';
import { WorkflowVersionsPage } from './routes/workflows/versions';
import { TasksListPage } from './routes/tasks/list';
import { TaskDetailPage } from './routes/tasks/detail';
import { CapacityPage } from './routes/tasks/capacity';
import LegacyAdminApp from './App';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:3000';

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('admin@fieldbrix.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? 'Login failed');
      }
      const data = await res.json() as { data?: { token?: string }; token?: string };
      const token = data?.data?.token ?? (data as { token?: string }).token ?? '';
      localStorage.setItem('fieldbrix_token', token);
      await navigate({ to: '/' });
    } catch (err) {
      setError((err as Error).message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fb-login-shell">
      <div className="fb-login-card">
        <h1 className="fb-login-title">FieldBrix</h1>
        <p className="fb-login-subtitle">Sign in to your workspace</p>
        <form className="fb-login-form" onSubmit={(e) => void handleLogin(e)}>
          <div className="fb-form-row">
            <label htmlFor="login-identifier" className="fb-label">Email</label>
            <input
              id="login-identifier"
              type="email"
              className="fb-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="fb-form-row">
            <label htmlFor="login-password" className="fb-label">Password</label>
            <input
              id="login-password"
              type="password"
              className="fb-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="fb-error">{error}</div>}
          <button
            id="login-submit"
            type="submit"
            className="fb-btn fb-btn--primary fb-btn--full"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Root route
const rootRoute = createRootRoute({ component: Outlet });

// Auth guard: redirect to /login if no token
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: Layout,
  beforeLoad: () => {
    const token = localStorage.getItem('fieldbrix_token');
    if (!token) throw redirect({ to: '/login' });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    const token = localStorage.getItem('fieldbrix_token');
    if (token) throw redirect({ to: '/' });
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
  path: '/admin',
  component: LegacyAdminApp,
});

const overviewRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/', component: OverviewPage });

// Master Data
const customersRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/master-data/customers', component: CustomersPage });
const sitesRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/master-data/sites', component: SitesPage });
const serviceTargetsRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/master-data/service-targets', component: ServiceTargetsPage });
const partsRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/master-data/parts', component: PartsPage });
const importsRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/master-data/imports', component: ImportsPage });

// Workflows
const workflowsListRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/workflows', component: WorkflowsListPage });
const workflowBuilderRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/workflows/$id/builder', component: WorkflowBuilderPage });
const workflowVersionsRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/workflows/$id/versions', component: WorkflowVersionsPage });

// Tasks
const tasksListRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/tasks', component: TasksListPage });
const taskDetailRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/tasks/$id', component: TaskDetailPage });
const capacityRoute = createRoute({ getParentRoute: () => layoutRoute, path: '/scheduling/capacity', component: CapacityPage });

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
    workflowVersionsRoute,
    tasksListRoute,
    taskDetailRoute,
    capacityRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

