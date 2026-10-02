import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Intro, PanelTitle, Status, Empty } from "../components/AdminUiAtoms";
import type { AdminItem, RequestFn } from "../types";

const localObjectBucket =
  import.meta.env.VITE_S3_BUCKET ?? "fieldbrix-local-uploads";

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

type Terminology = {
  task: string;
  taskPlural: string;
  customer: string;
  customerPlural: string;
  site: string;
  sitePlural: string;
  agent: string;
  agentPlural: string;
  supervisor: string;
  supervisorPlural: string;
  administrator: string;
  administratorPlural: string;
};

const DEFAULT_TERMINOLOGY: Terminology = {
  task: "Task",
  taskPlural: "Tasks",
  customer: "Client",
  customerPlural: "Clients",
  site: "Location",
  sitePlural: "Locations",
  agent: "Field agent",
  agentPlural: "Field agents",
  supervisor: "Supervisor",
  supervisorPlural: "Supervisors",
  administrator: "Company admin",
  administratorPlural: "Company admins",
};

const TERMINOLOGY_ROWS = [
  { key: "task", pluralKey: "taskPlural", label: "Work item" },
  { key: "customer", pluralKey: "customerPlural", label: "Customer record" },
  { key: "site", pluralKey: "sitePlural", label: "Place of work" },
  { key: "agent", pluralKey: "agentPlural", label: "Field worker" },
  {
    key: "supervisor",
    pluralKey: "supervisorPlural",
    label: "Task assigner",
  },
  {
    key: "administrator",
    pluralKey: "administratorPlural",
    label: "Company login administrator",
  },
] as const;

const TERMINOLOGY_PRESETS: Array<{
  label: string;
  values: Terminology;
}> = [
  {
    label: "Field service",
    values: {
      ...DEFAULT_TERMINOLOGY,
      task: "Work order",
      taskPlural: "Work orders",
      customer: "Customer",
      customerPlural: "Customers",
      site: "Site",
      sitePlural: "Sites",
      agent: "Technician",
      agentPlural: "Technicians",
      supervisor: "Dispatcher",
      supervisorPlural: "Dispatchers",
    },
  },
  {
    label: "Facilities",
    values: {
      ...DEFAULT_TERMINOLOGY,
      task: "Job",
      taskPlural: "Jobs",
      site: "Building",
      sitePlural: "Buildings",
      agent: "Engineer",
      agentPlural: "Engineers",
      administrator: "Workspace admin",
      administratorPlural: "Workspace admins",
    },
  },
  {
    label: "Cleaning",
    values: {
      ...DEFAULT_TERMINOLOGY,
      task: "Visit",
      taskPlural: "Visits",
      customer: "Account",
      customerPlural: "Accounts",
      site: "Site",
      sitePlural: "Sites",
      agent: "Cleaner",
      agentPlural: "Cleaners",
      supervisor: "Area supervisor",
      supervisorPlural: "Area supervisors",
    },
  },
];

export function CompanyView({
  branches,
  teams,
  request,
  refresh,
  notify,
}: {
  branches: AdminItem[];
  teams: AdminItem[];
  request: RequestFn;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState("settings");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("FieldBrix Demo Company");
  const [timezone, setTimezone] = useState("Asia/Muscat");
  const [locale, setLocale] = useState("en-GB");
  const [terminology, setTerminology] =
    useState<Terminology>(DEFAULT_TERMINOLOGY);
  const [colorTheme, setColorTheme] = useState("#2C6E8C");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [numberFormat, setNumberFormat] = useState("1,234.56");
  const [logoObjectKey, setLogoObjectKey] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);

  useEffect(() => {
    void request("/company")
      .then((settings) => {
        if (typeof settings?.name === "string") setCompanyName(settings.name);
        if (typeof settings?.timezone === "string")
          setTimezone(settings.timezone);
        if (typeof settings?.locale === "string") setLocale(settings.locale);
        if (settings?.terminology && typeof settings.terminology === "object") {
          const incoming = settings.terminology as Record<string, unknown>;
          setTerminology((current) => {
            const next = { ...current };
            for (const key of Object.keys(next) as Array<keyof Terminology>) {
              if (typeof incoming[key] === "string" && incoming[key].trim())
                next[key] = incoming[key].trim();
            }
            return next;
          });
        }
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
      if (Object.values(terminology).some((value) => !value.trim()))
        throw new Error("Every terminology label needs a value");
      await request("/company", {
        method: "PATCH",
        body: JSON.stringify({
          name: companyName,
          timezone,
          locale,
          terminology,
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
                <option value="en-GB">en-GB · English</option>
                <option value="ar-OM">ar-OM · العربية</option>
              </select>
            </label>
            <fieldset className="terminology-editor">
              <legend>Company terminology</legend>
              <p className="form-copy">
                Choose the words your team already uses. These labels appear in
                onboarding, imports, task tables, and company logins.
              </p>
              <div
                className="terminology-presets"
                aria-label="Terminology presets"
              >
                {TERMINOLOGY_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => setTerminology(preset.values)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div
                className="terminology-grid"
                role="group"
                aria-label="Custom terminology"
              >
                <span className="terminology-grid__heading">Meaning</span>
                <span className="terminology-grid__heading">Singular</span>
                <span className="terminology-grid__heading">Plural</span>
                {TERMINOLOGY_ROWS.map((row) => (
                  <div className="terminology-row" key={row.key}>
                    <span>{row.label}</span>
                    <label>
                      <span className="sr-only">{row.label} singular</span>
                      <input
                        aria-label={`${row.label} singular`}
                        value={terminology[row.key]}
                        onChange={(event) =>
                          setTerminology((current) => ({
                            ...current,
                            [row.key]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span className="sr-only">{row.label} plural</span>
                      <input
                        aria-label={`${row.label} plural`}
                        value={terminology[row.pluralKey]}
                        onChange={(event) =>
                          setTerminology((current) => ({
                            ...current,
                            [row.pluralKey]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
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
            <div className="terminology-preview">
              <small>YOUR OPERATING LANGUAGE</small>
              <p>
                A <b>{terminology.customer.toLowerCase()}</b> creates a{" "}
                <b>{terminology.task.toLowerCase()}</b> at a{" "}
                <b>{terminology.site.toLowerCase()}</b>. The{" "}
                <b>{terminology.supervisor.toLowerCase()}</b> assigns it to a{" "}
                <b>{terminology.agent.toLowerCase()}</b>.
              </p>
              <span>
                Admin login label <b>{terminology.administrator}</b>
              </span>
            </div>
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
