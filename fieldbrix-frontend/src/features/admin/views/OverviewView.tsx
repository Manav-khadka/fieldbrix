import { Metric, PanelTitle, Empty } from "../components/AdminUiAtoms";
import type {
  AdminAuditEvent,
  AdminItem,
  AdminRole,
  AdminTenant,
  AdminUser,
  AdminView,
} from "../types";

export function OverviewView({
  tenants,
  roles,
  users,
  branches,
  audit,
  go,
}: {
  tenants: AdminTenant[];
  roles: AdminRole[];
  users: AdminUser[];
  branches: AdminItem[];
  audit: AdminAuditEvent[];
  go: (view: AdminView) => void;
}) {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow accent">OPERATIONS PULSE</span>
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
