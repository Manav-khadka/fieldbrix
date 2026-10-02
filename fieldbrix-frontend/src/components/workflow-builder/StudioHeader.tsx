import { Link } from "@tanstack/react-router";
import type { Workflow } from "./types";
import { WorkflowIcon, SmartphoneIcon, CheckIcon } from "../icons";

export function StudioHeader({
  id,
  workflow,
  ruleCount,
  fieldsCount,
  activeTab,
  statusMessage,
  onTabChange,
  onOpenPublish,
}: {
  id: string;
  workflow: Workflow | undefined;
  ruleCount: number;
  fieldsCount: number;
  activeTab: "STUDIO" | "PREVIEW";
  statusMessage?: string | null;
  onTabChange: (tab: "STUDIO" | "PREVIEW") => void;
  onOpenPublish: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "var(--fb-surface-card)",
        padding: "0.5rem 1rem",
        borderRadius: "var(--fb-radius-md)",
        border: "1px solid var(--fb-border-subtle)",
        boxShadow: "var(--fb-shadow-xs)",
        marginBottom: "0.5rem",
        flexShrink: 0,
        height: "44px",
        boxSizing: "border-box",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "var(--fb-slate-900)",
              letterSpacing: "-0.01em",
            }}
          >
            {workflow?.name ?? "Workflow Studio"}
          </h1>
          <span
            className={`fb-status fb-status--${(workflow?.status ?? "draft").toLowerCase()}`}
            style={{ fontSize: "10.5px", padding: "1px 6px" }}
          >
            {workflow?.status}
          </span>
          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: "4px",
              background: "var(--fb-slate-100)",
              color: "var(--fb-slate-600)",
            }}
          >
            Rev {workflow?.revision ?? 1}
          </span>

          {/* Non-intrusive inline sync indicator without layout shift */}
          {statusMessage && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>✓</span>
              <span>{statusMessage}</span>
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            display: "inline-flex",
            background: "var(--fb-slate-100)",
            borderRadius: "var(--fb-radius-md)",
            padding: "2px",
            border: "1px solid var(--fb-border-subtle)",
          }}
        >
          <button
            type="button"
            className={`fb-btn ${activeTab === "STUDIO" ? "fb-btn-primary" : "fb-btn-ghost"}`}
            style={{ height: "26px", padding: "0 10px", fontSize: "11px" }}
            onClick={() => onTabChange("STUDIO")}
          >
            <WorkflowIcon size={12} />
            <span>Studio</span>
          </button>
          <button
            type="button"
            className={`fb-btn ${activeTab === "PREVIEW" ? "fb-btn-primary" : "fb-btn-ghost"}`}
            style={{ height: "26px", padding: "0 10px", fontSize: "11px" }}
            onClick={() => onTabChange("PREVIEW")}
          >
            <SmartphoneIcon size={12} />
            <span>Preview</span>
          </button>
        </div>

        <Link
          to="/workflows/$id/rules"
          params={{ id }}
          className="fb-btn fb-btn-secondary fb-btn-xs"
          style={{ fontSize: "11px", height: "26px", padding: "0 8px" }}
        >
          Rules ({ruleCount})
        </Link>

        <Link
          to="/workflows/$id/versions"
          params={{ id }}
          className="fb-btn fb-btn-ghost fb-btn-xs"
          style={{ fontSize: "11px", height: "26px", padding: "0 8px" }}
        >
          Versions
        </Link>

        <button
          id="workflow-publish"
          type="button"
          className="fb-btn fb-btn-success fb-btn-xs"
          onClick={onOpenPublish}
          disabled={workflow?.status === "PUBLISHED" || fieldsCount === 0}
          style={{ fontSize: "11px", height: "26px", padding: "0 10px" }}
        >
          <CheckIcon size={12} />
          <span>
            {workflow?.status === "PUBLISHED" ? "Published" : "Publish"}
          </span>
        </button>
      </div>
    </div>
  );
}
