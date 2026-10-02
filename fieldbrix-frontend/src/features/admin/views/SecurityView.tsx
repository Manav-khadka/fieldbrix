import { Intro, Empty } from "../components/AdminUiAtoms";
import type { AdminAuditEvent, RequestFn } from "../types";

export function SecurityView({
  audit,
  request,
  notify,
}: {
  audit: AdminAuditEvent[];
  request: RequestFn;
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
