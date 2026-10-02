import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Layout } from "./routes/_layout";
import { OverviewPage } from "./routes/index";
import { CustomersPage } from "./routes/master-data/customers";
import { SitesPage } from "./routes/master-data/sites";
import { ServiceTargetsPage } from "./routes/master-data/service-targets";
import { PartsPage } from "./routes/master-data/parts";
import { WorkflowsListPage } from "./routes/workflows/list";
import { WorkflowBuilderPage } from "./routes/workflows/builder";
import { WorkflowRulesPage } from "./routes/workflows/rules";
import { WorkflowVersionsPage } from "./routes/workflows/versions";
import { TasksListPage } from "./routes/tasks/list";
import { LegacyTaskImportsPage } from "./routes/tasks/legacy-imports";
import { TaskDetailPage } from "./routes/tasks/detail";
import { CapacityPage } from "./routes/tasks/capacity";
import { SchedulingCalendarPage } from "./routes/scheduling/calendar";
import { ReviewQueuePage } from "./routes/tasks/review-queue";
import { LoginPage } from "./features/auth/LoginPage";
import { ClientSetupPage } from "./routes/onboarding/client-setup";

// Admin Module Routes (Unified Under Layout)
import { TenantsPage } from "./routes/admin/tenants";
import { CompanyPage } from "./routes/admin/company";
import { PeoplePage } from "./routes/admin/people";
import { RolesPage } from "./routes/admin/roles";
import { SecurityPage } from "./routes/admin/security";
import { FilesPage } from "./routes/admin/files";
import { SessionsPage } from "./routes/admin/sessions";

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

const overviewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  component: OverviewPage,
});

const clientSetupRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/setup",
  component: ClientSetupPage,
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
  component: LegacyTaskImportsPage,
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

// Tasks & Scheduling
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
const schedulingIndexRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/scheduling",
  beforeLoad: () => {
    throw redirect({ to: "/scheduling/calendar" });
  },
});
const calendarRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/scheduling/calendar",
  component: SchedulingCalendarPage,
});
const reviewQueueRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/tasks/review-queue",
  component: ReviewQueuePage,
});

// Administration Routes (Unified in Dashboard)
const adminIndexRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/admin",
  beforeLoad: () => {
    throw redirect({ to: "/admin/company" });
  },
});
const adminTenantsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/admin/tenants",
  component: TenantsPage,
});
const adminCompanyRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/admin/company",
  component: CompanyPage,
});
const adminPeopleRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/admin/people",
  component: PeoplePage,
});
const adminRolesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/admin/roles",
  component: RolesPage,
});
const adminSecurityRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/admin/security",
  component: SecurityPage,
});
const adminFilesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/admin/files",
  component: FilesPage,
});
const adminSessionsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/admin/sessions",
  component: SessionsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  layoutRoute.addChildren([
    overviewRoute,
    clientSetupRoute,
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
    schedulingIndexRoute,
    calendarRoute,
    reviewQueueRoute,
    adminIndexRoute,
    adminTenantsRoute,
    adminCompanyRoute,
    adminPeopleRoute,
    adminRolesRoute,
    adminSecurityRoute,
    adminFilesRoute,
    adminSessionsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
