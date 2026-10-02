import { useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { useWorkflowBuilderData } from "../../components/workflow-builder/useWorkflowBuilderData";
import { WorkflowBuilderErrorBoundary } from "../../components/workflow-builder/WorkflowBuilderErrorBoundary";
import { StudioHeader } from "../../components/workflow-builder/StudioHeader";
import { SectionsPanel } from "../../components/workflow-builder/SectionsPanel";
import { FieldPaletteLibrary } from "../../components/workflow-builder/FieldPaletteLibrary";
import { FieldCanvas } from "../../components/workflow-builder/FieldCanvas";
import { PropertyInspector } from "../../components/workflow-builder/PropertyInspector";
import { MobilePreviewSimulator } from "../../components/workflow-builder/MobilePreviewSimulator";
import { PublishModal } from "../../components/workflow-builder/PublishModal";
import { LayersIcon, WorkflowIcon, GripIcon } from "../../components/icons";

function WorkflowBuilderContent() {
  const {
    id,
    workflow,
    schema,
    isLoading,
    error,
    refetch,
    currentSection,
    setSelectedSectionId,
    selectedField,
    selectedFieldId,
    setSelectedFieldId,
    statusMessage,
    activeDragItem,
    dndSensors,
    addSectionMutation,
    removeSectionMutation,
    addFieldMutation,
    updateFieldMutation,
    removeFieldMutation,
    publishMutation,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
    customCollisionDetection,
  } = useWorkflowBuilderData();

  const [activeTab, setActiveTab] = useState<"STUDIO" | "PREVIEW">("STUDIO");
  const [leftTab, setLeftTab] = useState<"PALETTE" | "SECTIONS">("PALETTE");
  const [paletteFloating, setPaletteFloating] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"MOBILE" | "TABLET">("MOBILE");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishNotes, setPublishNotes] = useState("");
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, unknown>>({});

  if (isLoading) {
    return (
      <div className="fb-page" style={{ padding: "2rem" }}>
        <p className="fb-table-loading">Loading visual workflow studio…</p>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="fb-page" style={{ padding: "2rem" }}>
        <div className="fb-error">
          <strong>Couldn't load this workflow.</strong>
          <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
            {error?.message ?? `Workflow ${id} was not found, or you don't have access to it.`}
          </p>
        </div>
        <button
          type="button"
          className="fb-btn fb-btn-primary"
          style={{ marginTop: "0.75rem" }}
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "calc(100vh - 115px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Pinned Studio Header with inline zero-layout-shift status */}
      <StudioHeader
        id={id}
        workflow={workflow}
        ruleCount={schema.rules.length}
        fieldsCount={schema.fields.length}
        activeTab={activeTab}
        statusMessage={statusMessage}
        onTabChange={setActiveTab}
        onOpenPublish={() => setPublishModalOpen(true)}
      />

      {/* Studio Workspace */}
      {activeTab === "STUDIO" ? (
        <DndContext
          sensors={dndSensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          {/* Floating Draggable Palette Portal */}
          {paletteFloating && (
            <FieldPaletteLibrary
              isFloating={true}
              onToggleFloating={() => setPaletteFloating(false)}
              onAddField={(type) => addFieldMutation.mutate(type)}
            />
          )}

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "280px 1fr 340px",
              gap: "1rem",
              overflow: "hidden",
            }}
          >
            {/* Left Column: Navigator & Palette with dedicated scroll */}
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                gap: "8px",
              }}
            >
              {/* Left View Switcher */}
              <div
                style={{
                  display: "flex",
                  background: "var(--fb-slate-100)",
                  borderRadius: "var(--fb-radius-md)",
                  padding: "3px",
                  border: "1px solid var(--fb-border-subtle)",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className={`fb-btn ${leftTab === "PALETTE" ? "fb-btn-primary" : "fb-btn-ghost"}`}
                  style={{ flex: 1, height: "28px", fontSize: "11px", padding: 0 }}
                  onClick={() => setLeftTab("PALETTE")}
                >
                  <WorkflowIcon size={13} />
                  <span>Components</span>
                </button>
                <button
                  type="button"
                  className={`fb-btn ${leftTab === "SECTIONS" ? "fb-btn-primary" : "fb-btn-ghost"}`}
                  style={{ flex: 1, height: "28px", fontSize: "11px", padding: 0 }}
                  onClick={() => setLeftTab("SECTIONS")}
                >
                  <LayersIcon size={13} />
                  <span>Sections ({schema.sections.length})</span>
                </button>
              </div>

              {/* Left Tab Content */}
              <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                {leftTab === "PALETTE" ? (
                  paletteFloating ? (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1.5rem",
                        textAlign: "center",
                        background: "var(--fb-surface-card)",
                        borderRadius: "var(--fb-radius-lg)",
                        border: "1px dashed var(--fb-border-medium)",
                        color: "var(--fb-slate-500)",
                      }}
                    >
                      <p style={{ fontSize: "12px", margin: "0 0 12px" }}>
                        Palette is floating freely on your canvas.
                      </p>
                      <button
                        type="button"
                        className="fb-btn fb-btn-secondary fb-btn-sm"
                        onClick={() => setPaletteFloating(false)}
                      >
                        Dock Palette Here
                      </button>
                    </div>
                  ) : (
                    <FieldPaletteLibrary
                      isFloating={false}
                      onToggleFloating={() => setPaletteFloating(true)}
                      onAddField={(type) => addFieldMutation.mutate(type)}
                    />
                  )
                ) : (
                  <SectionsPanel
                    sections={schema.sections}
                    fields={schema.fields}
                    currentSectionId={currentSection?.id}
                    onSelectSection={setSelectedSectionId}
                    newSectionTitle={newSectionTitle}
                    onNewSectionTitleChange={setNewSectionTitle}
                    onAddSection={() =>
                      addSectionMutation.mutate(newSectionTitle.trim(), {
                        onSuccess: () => setNewSectionTitle(""),
                      })
                    }
                    addSectionPending={addSectionMutation.isPending}
                  />
                )}
              </div>
            </div>

            {/* Center Column: Expansive Canvas with dedicated scroll */}
            <div style={{ height: "100%", overflow: "hidden" }}>
              <FieldCanvas
                currentSection={currentSection}
                sectionCount={schema.sections.length}
                fields={schema.fields}
                selectedFieldId={selectedFieldId}
                activeDragItem={activeDragItem}
                onSelectField={setSelectedFieldId}
                onRemoveField={(fieldId) => removeFieldMutation.mutate(fieldId)}
                onRemoveSection={(sectionId) =>
                  removeSectionMutation.mutate(sectionId)
                }
              />
            </div>

            {/* Right Column: Property Inspector with dedicated scroll */}
            <div style={{ height: "100%", overflow: "hidden" }}>
              <PropertyInspector
                selectedField={selectedField}
                allFields={schema.fields}
                onUpdateField={(payload) => updateFieldMutation.mutate(payload)}
              />
            </div>
          </div>

          {/* Smooth Drag Overlay Preview */}
          <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeDragItem ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  background: "#ffffff",
                  border: "2px solid var(--fb-brand-indigo)",
                  borderRadius: "var(--fb-radius-lg)",
                  boxShadow:
                    "0 20px 25px -5px rgba(79, 70, 229, 0.35), 0 8px 10px -6px rgba(79, 70, 229, 0.2)",
                  cursor: "grabbing",
                  color: "var(--fb-slate-900)",
                  fontWeight: 600,
                  fontSize: "13px",
                  pointerEvents: "none",
                  transform: "scale(1.05)",
                }}
              >
                <GripIcon size={16} color="var(--fb-brand-indigo)" />
                <span>
                  {activeDragItem.source === "palette"
                    ? `Drop to insert ${activeDragItem.label ?? activeDragItem.fieldType}`
                    : `Moving field card`}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <MobilePreviewSimulator
            workflowName={workflow.name}
            schema={schema}
            previewDevice={previewDevice}
            onDeviceChange={setPreviewDevice}
            previewAnswers={previewAnswers}
            onAnswerChange={(key, value) =>
              setPreviewAnswers((prev) => ({ ...prev, [key]: value }))
            }
          />
        </div>
      )}

      {publishModalOpen && (
        <PublishModal
          notes={publishNotes}
          onNotesChange={setPublishNotes}
          onCancel={() => setPublishModalOpen(false)}
          onConfirm={() =>
            publishMutation.mutate(publishNotes, {
              onSuccess: () => {
                setPublishModalOpen(false);
                setPublishNotes("");
              },
            })
          }
          pending={publishMutation.isPending}
        />
      )}
    </div>
  );
}

export function WorkflowBuilderPage() {
  return (
    <WorkflowBuilderErrorBoundary>
      <WorkflowBuilderContent />
    </WorkflowBuilderErrorBoundary>
  );
}
