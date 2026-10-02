import React from "react";
import { DragHandle } from "./Sortable";
import { FieldPreviewMock } from "./FieldPreviewMock";
import type { useSortable } from "@dnd-kit/sortable";
import type { WorkflowField } from "./types";
import { TrashIcon, AdminIcon, LayersIcon } from "../icons";

export function FieldCard({
  field,
  index,
  isSelected,
  onSelect,
  onRemove,
  setNodeRef,
  style,
  attributes,
  listeners,
}: {
  field: WorkflowField;
  index: number;
  totalFields?: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  setNodeRef: (element: HTMLElement | null) => void;
  style: React.CSSProperties;
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
}) {
  const hasCondition = Boolean(field.config?.conditionalRule?.dependsOnFieldId);
  const hasRegex = Boolean(field.config?.regexPattern);
  const hasGeofence = Boolean(field.config?.geofenceRadiusKm);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: "0.65rem 0.85rem",
        background: "#ffffff",
        border: `1.5px solid ${isSelected ? "var(--fb-brand-indigo)" : "var(--fb-border-subtle)"}`,
        borderRadius: "var(--fb-radius-md)",
        boxShadow: isSelected
          ? "0 0 0 3px rgba(79, 70, 229, 0.12), var(--fb-shadow-xs)"
          : "var(--fb-shadow-xs)",
        cursor: "pointer",
        transition: "all 0.12s ease",
      }}
      onClick={onSelect}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <DragHandle attributes={attributes} listeners={listeners} />
          <span
            style={{
              fontSize: "11px",
              color: "var(--fb-slate-500)",
              fontWeight: 700,
              background: "var(--fb-slate-100)",
              padding: "1px 5px",
              borderRadius: "4px",
            }}
          >
            #{index + 1}
          </span>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--fb-slate-900)",
            }}
          >
            {field.label}
          </span>
          {field.required && (
            <span
              style={{
                color: "var(--fb-brand-rose)",
                fontWeight: 700,
                fontSize: "13px",
              }}
              title="Mandatory field"
            >
              *
            </span>
          )}
          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: "8px",
              background: "var(--fb-slate-100)",
              color: "var(--fb-slate-600)",
            }}
          >
            {field.type}
          </span>

          {/* Conditional Logic Badge */}
          {hasCondition && (
            <span
              style={{
                fontSize: "9.5px",
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: "8px",
                background: "#fef3c7",
                color: "#92400e",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
              title="Conditional visibility active"
            >
              <LayersIcon size={10} />
              <span>Conditional</span>
            </span>
          )}

          {/* Validation Badges */}
          {hasRegex && (
            <span
              style={{
                fontSize: "9.5px",
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: "8px",
                background: "#e0e7ff",
                color: "#3730a3",
              }}
              title="Regex pattern validation active"
            >
              Regex
            </span>
          )}

          {hasGeofence && (
            <span
              style={{
                fontSize: "9.5px",
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: "8px",
                background: "#dcfce7",
                color: "#166534",
              }}
              title="Geofence territory radius active"
            >
              {field.config?.geofenceRadiusKm}km Geofence
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            type="button"
            className="fb-btn fb-btn-ghost fb-btn-xs"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            title="Configure properties & validations"
            style={{ padding: "2px 6px", fontSize: "11px" }}
          >
            <AdminIcon size={12} />
            <span>Config</span>
          </button>

          <button
            type="button"
            className="fb-btn fb-btn-danger fb-btn-xs"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Delete field"
            style={{ padding: "2px 6px" }}
          >
            <TrashIcon size={12} />
          </button>
        </div>
      </div>

      <div
        style={{
          background: "var(--fb-slate-50)",
          padding: "0.5rem 0.65rem",
          borderRadius: "var(--fb-radius-sm)",
          border: "1px dashed var(--fb-border-subtle)",
        }}
      >
        <FieldPreviewMock field={field} />
      </div>
    </div>
  );
}
