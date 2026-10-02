import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../../api/client";
import {
  CustomersIcon,
  ImportIcon,
  ServiceTargetIcon,
  SitesIcon,
  WorkflowIcon,
} from "../../components/icons";
import "./client-setup.css";

type CountResponse = { total: number };
type WorkflowResponse = {
  items: Array<{ id: string; status: string }>;
  total: number;
};

const SETUP_STEPS = [
  {
    number: "01",
    eyebrow: "Company",
    title: "Create the client",
    copy: "Capture the company once. Sites, workflows and imported tasks all stay scoped to this client.",
    action: "Manage clients",
    to: "/master-data/customers" as const,
    icon: CustomersIcon,
    metric: "clients" as const,
  },
  {
    number: "02",
    eyebrow: "Operations map",
    title: "Add only what work needs",
    copy: "Add locations first. Assets or service points are optional and only needed when work targets a specific item.",
    action: "Add locations",
    to: "/master-data/sites" as const,
    icon: SitesIcon,
    metric: "sites" as const,
  },
  {
    number: "03",
    eyebrow: "Ways of working",
    title: "Build 3–4 workflows",
    copy: "Turn each discovery-session process into a reusable checklist with its own fields, evidence and rules.",
    action: "Build workflows",
    to: "/workflows" as const,
    icon: WorkflowIcon,
    metric: "workflows" as const,
  },
  {
    number: "04",
    eyebrow: "Go live",
    title: "Import the first task batch",
    copy: "Choose the client and workflow once, upload the operational file, validate rows and release the batch.",
    action: "Import tasks",
    to: "/master-data/imports" as const,
    icon: ImportIcon,
    metric: "imports" as const,
  },
];

export function ClientSetupPage() {
  const { data: customers } = useQuery({
    queryKey: ["customers", "setup-count"],
    queryFn: () => api.get<CountResponse>("/customers?limit=1"),
  });
  const { data: sites } = useQuery({
    queryKey: ["sites", "setup-count"],
    queryFn: () => api.get<CountResponse>("/sites?limit=1"),
  });
  const { data: workflows } = useQuery({
    queryKey: ["workflows", "setup-count"],
    queryFn: () => api.get<WorkflowResponse>("/workflows?limit=100"),
  });
  const { data: imports } = useQuery({
    queryKey: ["imports", "setup-count"],
    queryFn: () =>
      api
        .get<{ items: unknown[] }>("/imports?limit=100")
        .catch(() => ({ items: [] })),
  });

  const publishedWorkflows =
    workflows?.items.filter((workflow) => workflow.status === "PUBLISHED")
      .length ?? 0;
  const metrics = {
    clients: customers?.total ?? 0,
    sites: sites?.total ?? 0,
    workflows: publishedWorkflows,
    imports: imports?.items.length ?? 0,
  };

  return (
    <div className="fb-page fb-client-setup">
      <section className="fb-setup-hero">
        <div className="fb-setup-hero__copy">
          <span className="fb-setup-kicker">Client onboarding</span>
          <h1>From discovery call to live field work.</h1>
          <p>
            Model the client’s real operation, attach each task to the right
            workflow, then dispatch at scale. No client-specific backend work
            required.
          </p>
          <div className="fb-setup-hero__actions">
            <Link
              to="/master-data/customers"
              className="fb-btn fb-btn--primary"
            >
              Start with a client
            </Link>
            <Link to="/master-data/imports" className="fb-btn fb-btn--ghost">
              Import a task batch
            </Link>
          </div>
        </div>
        <div className="fb-setup-flow" aria-label="Operational data flow">
          <span>Client</span>
          <b aria-hidden="true">→</b>
          <span>Workflow</span>
          <b aria-hidden="true">→</b>
          <span>Tasks</span>
          <b aria-hidden="true">→</b>
          <span>Assignment</span>
          <b aria-hidden="true">→</b>
          <span>Field app</span>
        </div>
      </section>

      <div className="fb-setup-section-heading">
        <div>
          <span className="fb-setup-kicker">Recommended sequence</span>
          <h2>One clear path, four decisions</h2>
        </div>
        <p>Complete each step once, then reuse it for every incoming batch.</p>
      </div>

      <section className="fb-setup-grid" aria-label="Client setup steps">
        {SETUP_STEPS.map((step) => {
          const Icon = step.icon;
          const count = metrics[step.metric];
          return (
            <article className="fb-setup-card" key={step.number}>
              <div className="fb-setup-card__topline">
                <span className="fb-setup-card__number">{step.number}</span>
                <span className="fb-setup-card__icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
              </div>
              <span className="fb-setup-card__eyebrow">{step.eyebrow}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
              <div className="fb-setup-card__footer">
                <Link to={step.to}>{step.action} →</Link>
                <span>
                  <strong>{count}</strong>{" "}
                  {step.metric === "workflows" ? "published" : "ready"}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="fb-setup-clarity">
        <div className="fb-setup-clarity__intro">
          <span className="fb-setup-kicker">Keep the model simple</span>
          <h2>Not every client needs every record type.</h2>
          <p>
            Start with the minimum that makes dispatch possible. Add deeper
            master data only when the workflow genuinely uses it.
          </p>
        </div>
        <div className="fb-setup-clarity__items">
          <div>
            <CustomersIcon size={20} />
            <span>
              <strong>Client</strong>
              Required · the company receiving the service
            </span>
          </div>
          <div>
            <SitesIcon size={20} />
            <span>
              <strong>Location</strong>
              Optional for imported tasks with latitude and longitude
            </span>
          </div>
          <div>
            <ServiceTargetIcon size={20} />
            <span>
              <strong>Asset or service point</strong>
              Optional · equipment, room, meter, unit or other exact target
            </span>
          </div>
          <div>
            <WorkflowIcon size={20} />
            <span>
              <strong>Workflow</strong>
              Required · the steps the field worker will execute
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
