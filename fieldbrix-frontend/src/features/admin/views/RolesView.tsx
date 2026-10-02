import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Intro, PanelTitle, Empty } from "../components/AdminUiAtoms";
import type { AdminRole, RequestFn } from "../types";

export function RolesView({
  roles,
  request,
  refresh,
  notify,
}: {
  roles: AdminRole[];
  request: RequestFn;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<AdminRole | null>(null);
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
