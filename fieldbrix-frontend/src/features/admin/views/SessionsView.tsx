import { Intro, Status, Empty } from "../components/AdminUiAtoms";
import type { AdminSession, RequestFn } from "../types";

export function SessionsView({
  sessions,
  request,
  refresh,
  notify,
}: {
  sessions: AdminSession[];
  request: RequestFn;
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
