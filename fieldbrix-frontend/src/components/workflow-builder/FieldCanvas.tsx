import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Sortable } from "./Sortable";
import { FieldCard } from "./FieldCard";
import type { WorkflowField, WorkflowSection } from "./types";
import type { ActiveDragItem } from "./useWorkflowBuilderData";
import { TrashIcon, PlusIcon } from "../icons";

function InsertionSlot({
  index,
  activeDragItem,
}: {
  index: number;
  activeDragItem?: ActiveDragItem | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `insertion-slot-${index}`,
    data: { source: "canvas-slot", targetIndex: index },
  });

  if (!activeDragItem || activeDragItem.source !== "palette") {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        height: isOver ? "46px" : "18px",
        margin: isOver ? "6px 0" : "0",
        borderRadius: "var(--fb-radius-md)",
        border: isOver
          ? "2px dashed var(--fb-brand-indigo)"
          : "2px dashed rgba(79, 70, 229, 0.35)",
        background: isOver
          ? "rgba(79, 70, 229, 0.12)"
          : "rgba(79, 70, 229, 0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--fb-brand-indigo)",
        fontSize: "12px",
        fontWeight: 700,
        transition: "all 0.15s ease",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {isOver ? (
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <PlusIcon size={14} />
          <span>
            Drop to insert {activeDragItem.label ?? activeDragItem.fieldType} at position #{index + 1}
          </span>
        </span>
      ) : (
        <span style={{ fontSize: "11px", color: "var(--fb-brand-indigo)", opacity: 0.8 }}>
          + Drop here to insert at position #{index + 1}
        </span>
      )}
    </div>
  );
}

export function FieldCanvas({
  currentSection,
  sectionCount,
  fields,
  selectedFieldId,
  activeDragItem,
  onSelectField,
  onRemoveField,
  onRemoveSection,
}: {
  currentSection: WorkflowSection | undefined;
  sectionCount: number;
  fields: WorkflowField[];
  selectedFieldId: string | null;
  activeDragItem?: ActiveDragItem | null;
  onSelectField: (id: string) => void;
  onRemoveField: (id: string) => void;
  onRemoveSection: (id: string) => void;
}) {
  const visibleFields = fields.filter(
    (f) => !currentSection || f.sectionId === currentSection.id,
  );
  const { setNodeRef, isOver } = useDroppable({
    id: "field-canvas-dropzone",
    data: { source: "canvas", targetIndex: visibleFields.length },
  });

  const isDraggingPalette = activeDragItem?.source === "palette";

  return (
    <div
      className="fb-builder-panel fb-builder-panel--main"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--fb-surface-card)",
        borderRadius: "var(--fb-radius-lg)",
        border: "1px solid var(--fb-border-subtle)",
        boxShadow: "var(--fb-shadow-xs)",
        overflow: "hidden",
      }}
    >
      {/* Pinned Sticky Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.6rem 1rem",
          borderBottom: "1px solid var(--fb-border-subtle)",
          background: "#ffffff",
          flexShrink: 0,
          zIndex: 5,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "13px",
              margin: "0 0 1px",
              fontWeight: 700,
              color: "var(--fb-slate-900)",
            }}
          >
            {currentSection?.title ?? "General Checklist"}
          </h2>
          <div style={{ fontSize: "11px", color: "var(--fb-slate-500)" }}>
            {visibleFields.length} {visibleFields.length === 1 ? "field" : "fields"} in this section
          </div>
        </div>

        {currentSection && sectionCount > 1 && (
          <button
            type="button"
            className="fb-btn fb-btn-danger fb-btn-xs"
            onClick={() => {
              if (
                confirm(
                  `Delete section "${currentSection.title}" and its fields?`,
                )
              ) {
                onRemoveSection(currentSection.id);
              }
            }}
          >
            <TrashIcon size={12} />
            <span>Delete Section</span>
          </button>
        )}
      </div>

      {/* Independently Scrollable Drop Area */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          padding: "1.5rem",
          background: isOver ? "#f5f7ff" : "var(--fb-slate-50)",
          outline: isOver
            ? "2px dashed var(--fb-brand-indigo)"
            : "2px dashed transparent",
          outlineOffset: "-4px",
          transition: "all 0.15s ease",
        }}
      >
        <div
          style={{
            maxWidth: "850px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: isDraggingPalette ? "8px" : "12px",
            minHeight: "100%",
          }}
        >
          {/* Top Insertion Slot (Index 0) */}
          {isDraggingPalette && (
            <InsertionSlot index={0} activeDragItem={activeDragItem} />
          )}

          <SortableContext
            items={visibleFields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {visibleFields.map((f, idx) => (
              <React.Fragment key={f.id}>
                <Sortable id={f.id}>
                  {({ setNodeRef: setCardRef, style, attributes, listeners }) => (
                    <FieldCard
                      field={f}
                      index={idx}
                      totalFields={visibleFields.length}
                      isSelected={selectedFieldId === f.id}
                      onSelect={() => onSelectField(f.id)}
                      onRemove={() => onRemoveField(f.id)}
                      setNodeRef={setCardRef}
                      style={style}
                      attributes={attributes}
                      listeners={listeners}
                    />
                  )}
                </Sortable>

                {/* Insertion Slot after this card */}
                {isDraggingPalette && (
                  <InsertionSlot
                    index={idx + 1}
                    activeDragItem={activeDragItem}
                  />
                )}
              </React.Fragment>
            ))}
          </SortableContext>

          {/* Empty Section State */}
          {visibleFields.length === 0 && !isOver && (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 1.5rem",
                color: "var(--fb-slate-500)",
                border: "2px dashed var(--fb-border-medium)",
                borderRadius: "var(--fb-radius-lg)",
                background: "#ffffff",
                marginTop: "1rem",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "var(--fb-slate-100)",
                  border: "1px solid var(--fb-border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  color: "var(--fb-slate-500)",
                }}
              >
                <PlusIcon size={22} />
              </div>
              <h4
                style={{
                  margin: "0 0 6px",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--fb-slate-800)",
                }}
              >
                No fields in this section yet
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  margin: 0,
                  maxWidth: "340px",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                Drag any component from the palette onto this canvas, or click + to add it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
