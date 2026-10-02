import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DragHandle, Sortable } from "./Sortable";
import type { WorkflowField, WorkflowSection } from "./types";
import { PlusIcon } from "../icons";

export function SectionsPanel({
  sections,
  fields,
  currentSectionId,
  onSelectSection,
  newSectionTitle,
  onNewSectionTitleChange,
  onAddSection,
  addSectionPending,
}: {
  sections: WorkflowSection[];
  fields: WorkflowField[];
  currentSectionId: string | undefined;
  onSelectSection: (id: string) => void;
  newSectionTitle: string;
  onNewSectionTitleChange: (value: string) => void;
  onAddSection: () => void;
  addSectionPending: boolean;
}) {
  return (
    <div
      className="fb-builder-panel"
      style={{
        maxHeight: "320px",
        display: "flex",
        flexDirection: "column",
        background: "var(--fb-surface-card)",
        padding: "1rem",
        borderRadius: "var(--fb-radius-lg)",
        border: "1px solid var(--fb-border-subtle)",
        boxShadow: "var(--fb-shadow-xs)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--fb-slate-900)",
          }}
        >
          Workflow Sections
        </h3>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            padding: "1px 6px",
            borderRadius: "10px",
            background: "var(--fb-slate-100)",
            color: "var(--fb-slate-700)",
          }}
        >
          {sections.length}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          paddingRight: "2px",
        }}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((sec, idx) => {
            const isActive = currentSectionId === sec.id;
            const fieldCount = fields.filter((f) => f.sectionId === sec.id).length;
            return (
              <Sortable key={sec.id} id={sec.id}>
                {({ setNodeRef, style, attributes, listeners }) => (
                  <div
                    ref={setNodeRef}
                    style={{
                      ...style,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                      padding: "8px 10px",
                      borderRadius: "var(--fb-radius-md)",
                      background: isActive ? "#eef2ff" : "var(--fb-slate-50)",
                      border: `1px solid ${isActive ? "var(--fb-brand-indigo)" : "var(--fb-border-subtle)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => onSelectSection(sec.id)}
                  >
                    <DragHandle attributes={attributes} listeners={listeners} />
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "var(--fb-brand-indigo)" : "var(--fb-slate-800)",
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {idx + 1}. {sec.title}
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "1px 5px",
                        borderRadius: "8px",
                        background: isActive ? "#ffffff" : "var(--fb-slate-200)",
                        color: isActive ? "var(--fb-brand-indigo)" : "var(--fb-slate-700)",
                      }}
                    >
                      {fieldCount}
                    </span>
                  </div>
                )}
              </Sortable>
            );
          })}
        </SortableContext>
      </div>

      <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
        <input
          type="text"
          className="fb-input"
          style={{ flex: 1, fontSize: "12px", height: "34px", padding: "0 8px" }}
          placeholder="New section name…"
          value={newSectionTitle}
          onChange={(e) => onNewSectionTitleChange(e.target.value)}
        />
        <button
          type="button"
          className="fb-btn fb-btn-secondary fb-btn-sm"
          disabled={!newSectionTitle.trim() || addSectionPending}
          onClick={onAddSection}
          style={{ height: "34px" }}
        >
          <PlusIcon size={13} /> Add
        </button>
      </div>
    </div>
  );
}
