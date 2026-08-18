import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { api } from "../../api/client";

interface WorkflowSection {
  id: string;
  title: string;
  description?: string;
  position: number;
}

interface WorkflowField {
  id: string;
  key: string;
  label: string;
  type: string;
  sectionId?: string;
  help?: string;
  required?: boolean;
  position?: number;
  config?: {
    placeholder?: string;
    options?: string[];
    min?: number;
    max?: number;
    unit?: string;
    photoCountMin?: number;
    supervisorOnly?: boolean;
    workerEditable?: boolean;
  };
}

interface WorkflowSchema {
  sections: WorkflowSection[];
  fields: WorkflowField[];
  rules: unknown[];
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  revision: number;
  industry?: string;
  category?: string;
  schema?: WorkflowSchema;
}

const FIELD_PALETTE = [
  {
    category: "Basic Inputs",
    items: [
      { type: "TEXT", label: "Short Text", icon: "🔤", desc: "Single line text input" },
      { type: "TEXTAREA", label: "Multiline Notes", icon: "📝", desc: "Long description or observations" },
      { type: "NUMBER", label: "Measurement / Number", icon: "🔢", desc: "Numeric value with units & limits" },
      { type: "YES_NO", label: "Yes / No Toggle", icon: "🔘", desc: "Binary toggle switch" },
      { type: "SELECT", label: "Single Choice", icon: "🔽", desc: "Dropdown selection" },
      { type: "MULTI_SELECT", label: "Multi-Select", icon: "☑️", desc: "Multiple choice pills" },
    ],
  },
  {
    category: "Date & Time",
    items: [
      { type: "DATE", label: "Date Picker", icon: "📅", desc: "Calendar date selection" },
      { type: "TIME", label: "Time Picker", icon: "⏰", desc: "Time of day selector" },
      { type: "DATETIME", label: "Date & Time", icon: "📆", desc: "Full timestamp selection" },
    ],
  },
  {
    category: "Field Verification & Proof",
    items: [
      { type: "PHOTO", label: "Photo Evidence", icon: "📷", desc: "Mandatory photo capture with GPS" },
      { type: "SIGNATURE", label: "Signature Pad", icon: "✍️", desc: "Customer or tech sign-off" },
      { type: "BARCODE", label: "Barcode / QR Scanner", icon: "🏷️", desc: "Scan equipment serial or tag" },
      { type: "GPS", label: "GPS Location Stamp", icon: "📍", desc: "Current geocoordinates check" },
      { type: "INSTRUCTION", label: "Instruction Card", icon: "ℹ️", desc: "Read-only safety guidance" },
    ],
  },
];

export function WorkflowBuilderPage() {
  const { id } = useParams({ from: "/layout/workflows/$id/builder" });
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"STUDIO" | "PREVIEW">("STUDIO");
  const [previewDevice, setPreviewDevice] = useState<"MOBILE" | "TABLET">("MOBILE");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishNotes, setPublishNotes] = useState("");
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", id],
    queryFn: () => api.get<Workflow>(`/workflows/${id}`),
  });

  const schema: WorkflowSchema = {
    sections: Array.isArray(workflow?.schema?.sections) ? workflow.schema.sections : [],
    fields: Array.isArray(workflow?.schema?.fields) ? workflow.schema.fields : [],
    rules: Array.isArray(workflow?.schema?.rules) ? workflow.schema.rules : [],
  };

  const currentSection =
    schema.sections.find((s) => s.id === selectedSectionId) ?? schema.sections[0];
  const selectedField = schema.fields.find((f) => f.id === selectedFieldId);

  // Mutations
  const addSectionMutation = useMutation({
    mutationFn: (title: string) =>
      api.post(`/workflows/${id}/sections`, { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow", id] });
      setNewSectionTitle("");
      setStatusMessage("Section created successfully.");
      setTimeout(() => setStatusMessage(null), 3000);
    },
  });

  const removeSectionMutation = useMutation({
    mutationFn: (sectionId: string) =>
      api.delete(`/workflows/${id}/sections/${sectionId}`, {
        revision: workflow?.revision ?? 1,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow", id] });
      setSelectedSectionId(null);
    },
  });

  const addFieldMutation = useMutation({
    mutationFn: (type: string) => {
      const secId = currentSection?.id;
      const count = schema.fields.length + 1;
      const key = `${type.toLowerCase()}_${count}`;
      const label = `New ${type.replace(/_/g, " ").toLowerCase()}`;
      return api.post(`/workflows/${id}/fields`, {
        key,
        label,
        type,
        sectionId: secId,
        required: false,
        config: {
          placeholder: "",
          options: type === "SELECT" || type === "MULTI_SELECT" ? ["Option 1", "Option 2"] : undefined,
          photoCountMin: type === "PHOTO" ? 1 : undefined,
        },
      });
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["workflow", id] });
      if (res?.data?.id) setSelectedFieldId(res.data.id);
      setStatusMessage("Field added to canvas.");
      setTimeout(() => setStatusMessage(null), 3000);
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: (payload: { fieldId: string; label?: string; help?: string; required?: boolean; config?: any }) =>
      api.patch(`/workflows/${id}/fields/${payload.fieldId}`, {
        label: payload.label,
        help: payload.help,
        required: payload.required,
        config: payload.config,
        revision: workflow?.revision ?? 1,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow", id] });
      setStatusMessage("Field properties updated.");
      setTimeout(() => setStatusMessage(null), 2500);
    },
  });

  const removeFieldMutation = useMutation({
    mutationFn: (fieldId: string) =>
      api.delete(`/workflows/${id}/fields/${fieldId}`, {
        revision: workflow?.revision ?? 1,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow", id] });
      setSelectedFieldId(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      api.post(`/workflows/${id}/publish`, {
        revision: workflow?.revision ?? 1,
        notes: publishNotes || "Published via visual studio",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow", id] });
      setPublishModalOpen(false);
      setPublishNotes("");
      setStatusMessage("Workflow successfully published and active for field dispatch.");
    },
  });

  if (isLoading) {
    return (
      <div className="fb-page">
        <p className="fb-table-loading">Loading visual workflow studio…</p>
      </div>
    );
  }

  return (
    <div className="fb-page" style={{ maxWidth: "1600px", padding: "1.5rem" }}>
      {/* Studio Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
          background: "#fff",
          padding: "1rem 1.5rem",
          borderRadius: "10px",
          border: "1px solid var(--c-border)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {workflow?.name ?? "Workflow Studio"}
            </h1>
            <span
              className={`fb-status fb-status--${(workflow?.status ?? "draft").toLowerCase()}`}
              style={{ fontSize: "12px" }}
            >
              {workflow?.status}
            </span>
            <span className="fb-badge" style={{ fontSize: "11px" }}>
              Rev {workflow?.revision ?? 1}
            </span>
            {workflow?.industry && (
              <span className="fb-badge" style={{ fontSize: "11px", background: "#f0fdf4", color: "#166534" }}>
                {workflow.industry}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--c-text-muted)" }}>
            {workflow?.description || "Visual multi-section form and checklist builder for field technicians."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Mode Switcher */}
          <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
            <button
              className={`fb-btn ${activeTab === "STUDIO" ? "fb-btn--primary" : "fb-btn--ghost"}`}
              style={{ padding: "6px 14px", fontSize: "13px" }}
              onClick={() => setActiveTab("STUDIO")}
            >
              🏗️ Studio Canvas
            </button>
            <button
              className={`fb-btn ${activeTab === "PREVIEW" ? "fb-btn--primary" : "fb-btn--ghost"}`}
              style={{ padding: "6px 14px", fontSize: "13px" }}
              onClick={() => setActiveTab("PREVIEW")}
            >
              📱 Mobile Preview
            </button>
          </div>

          <Link
            to="/workflows/$id/rules"
            params={{ id: id }}
            className="fb-btn fb-btn--ghost"
            style={{ fontSize: "13px" }}
          >
            ⚡ Rules & Logic ({schema.rules.length})
          </Link>

          <Link
            to="/workflows/$id/versions"
            params={{ id: id }}
            className="fb-btn fb-btn--ghost"
            style={{ fontSize: "13px" }}
          >
            📜 Versions
          </Link>

          <button
            id="workflow-publish"
            className="fb-btn fb-btn--primary"
            onClick={() => setPublishModalOpen(true)}
            disabled={workflow?.status === "PUBLISHED" || schema.fields.length === 0}
            style={{ background: "#16a34a", borderColor: "#16a34a", fontSize: "13px" }}
          >
            {workflow?.status === "PUBLISHED" ? "✓ Published" : "🚀 Publish Version"}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {statusMessage}
        </div>
      )}

      {activeTab === "STUDIO" ? (
        /* 3-Column Studio Workspace */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr 340px",
            gap: "1.25rem",
            alignItems: "start",
          }}
        >
          {/* Column 1: Sections & Field Palette */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Sections Box */}
            <div className="fb-builder-panel" style={{ maxHeight: "380px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h3 className="fb-panel-title" style={{ margin: 0 }}>Workflow Sections</h3>
                <span className="fb-badge" style={{ fontSize: "11px" }}>{schema.sections.length}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", flex: 1 }}>
                {schema.sections.map((sec, idx) => {
                  const isActive = (currentSection?.id === sec.id);
                  const fieldCount = schema.fields.filter((f) => f.sectionId === sec.id).length;
                  return (
                    <div
                      key={sec.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        background: isActive ? "#eff6ff" : "#f8fafc",
                        border: `1px solid ${isActive ? "#3b82f6" : "var(--c-border)"}`,
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedSectionId(sec.id)}
                    >
                      <div style={{ fontSize: "13px", fontWeight: isActive ? 600 : 500 }}>
                        {idx + 1}. {sec.title}
                      </div>
                      <span className="fb-badge" style={{ fontSize: "10px" }}>{fieldCount}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                <input
                  type="text"
                  className="fb-input"
                  style={{ flex: 1, fontSize: "12px", padding: "4px 8px" }}
                  placeholder="New section name…"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                />
                <button
                  type="button"
                  className="fb-btn fb-btn--ghost"
                  style={{ padding: "4px 10px", fontSize: "12px" }}
                  disabled={!newSectionTitle.trim() || addSectionMutation.isPending}
                  onClick={() => addSectionMutation.mutate(newSectionTitle.trim())}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Field Palette Library */}
            <div className="fb-builder-panel" style={{ maxHeight: "calc(100vh - 460px)", overflowY: "auto" }}>
              <h3 className="fb-panel-title" style={{ margin: "0 0 10px" }}>Field Component Library</h3>
              <p style={{ fontSize: "11px", color: "var(--c-text-muted)", margin: "0 0 10px" }}>
                Click any component below to insert into the active section:
              </p>

              {FIELD_PALETTE.map((cat) => (
                <div key={cat.category} style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                    {cat.category}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {cat.items.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          background: "#fff",
                          border: "1px solid var(--c-border)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--c-border)")}
                        onClick={() => addFieldMutation.mutate(item.type)}
                      >
                        <span style={{ fontSize: "16px" }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "12px", fontWeight: 600 }}>{item.label}</div>
                          <div style={{ fontSize: "10px", color: "var(--c-text-muted)" }}>{item.desc}</div>
                        </div>
                        <span style={{ fontSize: "12px", color: "#3b82f6" }}>+</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Visual Canvas (Center) */}
          <div className="fb-builder-panel fb-builder-panel--main" style={{ minHeight: "650px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.125rem", margin: 0, fontWeight: 700 }}>
                  {currentSection?.title ?? "General Checklist"}
                </h2>
                <div style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
                  {schema.fields.filter((f) => !currentSection || f.sectionId === currentSection.id).length} fields configured in this section
                </div>
              </div>

              {currentSection && schema.sections.length > 1 && (
                <button
                  type="button"
                  className="fb-btn fb-btn--danger"
                  style={{ padding: "4px 8px", fontSize: "11px" }}
                  onClick={() => {
                    if (confirm(`Delete section "${currentSection.title}" and its fields?`)) {
                      removeSectionMutation.mutate(currentSection.id);
                    }
                  }}
                >
                  Delete Section
                </button>
              )}
            </div>

            {/* Field Cards on Canvas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {schema.fields
                .filter((f) => !currentSection || f.sectionId === currentSection.id)
                .map((f, idx) => {
                  const isSelected = selectedFieldId === f.id;
                  return (
                    <div
                      key={f.id}
                      style={{
                        padding: "1rem",
                        background: isSelected ? "#f8fafc" : "#fff",
                        border: `1.5px solid ${isSelected ? "#3b82f6" : "var(--c-border)"}`,
                        borderRadius: "8px",
                        boxShadow: isSelected ? "0 2px 4px rgba(59,130,246,0.1)" : "0 1px 2px rgba(0,0,0,0.03)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onClick={() => setSelectedFieldId(f.id)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "12px", color: "var(--c-text-muted)", fontWeight: 600 }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: 700 }}>
                              {f.label}
                            </span>
                            {f.required && (
                              <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "14px" }} title="Required field">*</span>
                            )}
                            <span className="fb-badge" style={{ fontSize: "10px" }}>{f.type}</span>
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--c-text-muted)", marginTop: "2px" }}>
                            key: <code>{f.key}</code>
                            {f.help && <span> • hint: <em>{f.help}</em></span>}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            className="fb-btn fb-btn--ghost"
                            style={{ padding: "2px 6px", fontSize: "11px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFieldId(f.id);
                            }}
                          >
                            ⚙ Config
                          </button>
                          <button
                            type="button"
                            className="fb-btn fb-btn--danger"
                            style={{ padding: "2px 6px", fontSize: "11px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFieldMutation.mutate(f.id);
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      {/* Live Mock Representation of Field */}
                      <div style={{ background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px dashed var(--c-border)" }}>
                        {f.type === "TEXT" && (
                          <input type="text" className="fb-input fb-btn--full" placeholder={f.config?.placeholder || "Technician enters text here…"} disabled />
                        )}
                        {f.type === "TEXTAREA" && (
                          <textarea className="fb-textarea fb-btn--full" rows={2} placeholder={f.config?.placeholder || "Technician enters notes…"} disabled />
                        )}
                        {f.type === "NUMBER" && (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input type="number" className="fb-input" style={{ width: "160px" }} placeholder="0.00" disabled />
                            {f.config?.unit && <span style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>{f.config.unit}</span>}
                          </div>
                        )}
                        {f.type === "YES_NO" && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button type="button" className="fb-btn fb-btn--ghost" style={{ padding: "4px 12px" }} disabled>✓ Yes / Pass</button>
                            <button type="button" className="fb-btn fb-btn--ghost" style={{ padding: "4px 12px" }} disabled>✕ No / Fail</button>
                          </div>
                        )}
                        {(f.type === "SELECT" || f.type === "MULTI_SELECT") && (
                          <select className="fb-select fb-btn--full" disabled>
                            {(f.config?.options ?? ["Option 1", "Option 2"]).map((opt) => (
                              <option key={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {f.type === "PHOTO" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#0369a1", fontSize: "12px" }}>
                            <span style={{ fontSize: "20px" }}>📷</span>
                            <span>Mandatory Camera Capture (Minimum {f.config?.photoCountMin ?? 1} photo required with GPS watermark)</span>
                          </div>
                        )}
                        {f.type === "SIGNATURE" && (
                          <div style={{ height: "60px", border: "1px dashed #cbd5e1", borderRadius: "4px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#64748b" }}>
                            ✍️ Customer Signature Canvas
                          </div>
                        )}
                        {f.type === "BARCODE" && (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "12px", color: "#0284c7" }}>
                            <span>🏷️ Barcode / QR Identity Scan Trigger</span>
                          </div>
                        )}
                        {f.type === "GPS" && (
                          <div style={{ fontSize: "12px", color: "#16a34a" }}>
                            📍 Auto-Capture GPS Coordinates & Geofence Confidence
                          </div>
                        )}
                        {f.type === "INSTRUCTION" && (
                          <div style={{ fontSize: "12px", color: "#334155", background: "#e0f2fe", padding: "6px 10px", borderRadius: "4px" }}>
                            ℹ️ Safety notice or standard operating procedure banner shown to technician.
                          </div>
                        )}
                        {(f.type === "DATE" || f.type === "TIME" || f.type === "DATETIME") && (
                          <input type="text" className="fb-input" placeholder={`Select ${f.type.toLowerCase()}…`} disabled />
                        )}
                      </div>
                    </div>
                  );
                })}

              {schema.fields.filter((f) => !currentSection || f.sectionId === currentSection.id).length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--c-text-muted)", border: "2px dashed var(--c-border)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📋</div>
                  <h4 style={{ margin: "0 0 4px" }}>No fields in this section yet</h4>
                  <p style={{ fontSize: "12px", margin: "0 0 12px" }}>Choose a component from the left palette to add form controls.</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Property Inspector (Right) */}
          <div className="fb-builder-panel" style={{ minHeight: "650px" }}>
            <h3 className="fb-panel-title" style={{ margin: "0 0 12px" }}>
              {selectedField ? "Field Property Inspector" : "Inspector"}
            </h3>

            {selectedField ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label className="fb-label" style={{ fontSize: "11px" }}>Field Label *</label>
                  <input
                    type="text"
                    className="fb-input fb-btn--full"
                    value={selectedField.label}
                    onChange={(e) =>
                      updateFieldMutation.mutate({
                        fieldId: selectedField.id,
                        label: e.target.value,
                        help: selectedField.help,
                        required: selectedField.required,
                        config: selectedField.config,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="fb-label" style={{ fontSize: "11px" }}>System Identifier Key</label>
                  <input
                    type="text"
                    className="fb-input fb-btn--full fb-code"
                    value={selectedField.key}
                    disabled
                    style={{ background: "#f8fafc" }}
                  />
                </div>

                <div>
                  <label className="fb-label" style={{ fontSize: "11px" }}>Help Text / Technician Hint</label>
                  <input
                    type="text"
                    className="fb-input fb-btn--full"
                    placeholder="e.g. Check for water leakage around valve"
                    value={selectedField.help ?? ""}
                    onChange={(e) =>
                      updateFieldMutation.mutate({
                        fieldId: selectedField.id,
                        label: selectedField.label,
                        help: e.target.value,
                        required: selectedField.required,
                        config: selectedField.config,
                      })
                    }
                  />
                </div>

                <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedField.required)}
                      onChange={(e) =>
                        updateFieldMutation.mutate({
                          fieldId: selectedField.id,
                          label: selectedField.label,
                          help: selectedField.help,
                          required: e.target.checked,
                          config: selectedField.config,
                        })
                      }
                    />
                    <strong>Mandatory Field</strong> (Blocks submission if blank)
                  </label>
                </div>

                {/* Options Builder for Select / Multi-Select */}
                {(selectedField.type === "SELECT" || selectedField.type === "MULTI_SELECT") && (
                  <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: "10px" }}>
                    <label className="fb-label" style={{ fontSize: "11px" }}>Choice Options</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {(selectedField.config?.options ?? []).map((opt, oIdx) => (
                        <div key={oIdx} style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="text"
                            className="fb-input"
                            style={{ flex: 1, padding: "4px 8px", fontSize: "12px" }}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(selectedField.config?.options ?? [])];
                              newOpts[oIdx] = e.target.value;
                              updateFieldMutation.mutate({
                                fieldId: selectedField.id,
                                config: { ...selectedField.config, options: newOpts },
                              });
                            }}
                          />
                          <button
                            type="button"
                            className="fb-btn fb-btn--ghost"
                            style={{ padding: "2px 8px" }}
                            onClick={() => {
                              const newOpts = (selectedField.config?.options ?? []).filter((_, i) => i !== oIdx);
                              updateFieldMutation.mutate({
                                fieldId: selectedField.id,
                                config: { ...selectedField.config, options: newOpts },
                              });
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="fb-btn fb-btn--ghost"
                        style={{ fontSize: "11px", padding: "4px 8px" }}
                        onClick={() => {
                          const newOpts = [...(selectedField.config?.options ?? []), `Option ${(selectedField.config?.options?.length ?? 0) + 1}`];
                          updateFieldMutation.mutate({
                            fieldId: selectedField.id,
                            config: { ...selectedField.config, options: newOpts },
                          });
                        }}
                      >
                        + Add Choice Option
                      </button>
                    </div>
                  </div>
                )}

                {/* Number specific properties */}
                {selectedField.type === "NUMBER" && (
                  <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: "10px" }}>
                    <label className="fb-label" style={{ fontSize: "11px" }}>Unit Label</label>
                    <input
                      type="text"
                      className="fb-input fb-btn--full"
                      placeholder="e.g. PSI, °C, Bar, RPM, kW"
                      value={selectedField.config?.unit ?? ""}
                      onChange={(e) =>
                        updateFieldMutation.mutate({
                          fieldId: selectedField.id,
                          config: { ...selectedField.config, unit: e.target.value },
                        })
                      }
                    />
                  </div>
                )}

                {/* Photo specific properties */}
                {selectedField.type === "PHOTO" && (
                  <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: "10px" }}>
                    <label className="fb-label" style={{ fontSize: "11px" }}>Minimum Required Photos</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="fb-input fb-btn--full"
                      value={selectedField.config?.photoCountMin ?? 1}
                      onChange={(e) =>
                        updateFieldMutation.mutate({
                          fieldId: selectedField.id,
                          config: { ...selectedField.config, photoCountMin: parseInt(e.target.value, 10) || 1 },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "var(--c-text-muted)", padding: "2rem 1rem", fontSize: "12px" }}>
                Select any field on the canvas to configure its validation rules, options, and properties.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mobile / Tablet Interactive Preview Simulator */
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Device Viewport:</span>
            <button
              className={`fb-btn ${previewDevice === "MOBILE" ? "fb-btn--primary" : "fb-btn--ghost"}`}
              style={{ padding: "4px 12px", fontSize: "12px" }}
              onClick={() => setPreviewDevice("MOBILE")}
            >
              📱 Mobile Phone (375px)
            </button>
            <button
              className={`fb-btn ${previewDevice === "TABLET" ? "fb-btn--primary" : "fb-btn--ghost"}`}
              style={{ padding: "4px 12px", fontSize: "12px" }}
              onClick={() => setPreviewDevice("TABLET")}
            >
              💻 Tablet / Desktop (680px)
            </button>
          </div>

          <div
            style={{
              width: previewDevice === "MOBILE" ? "390px" : "700px",
              minHeight: "700px",
              background: "#ffffff",
              border: "12px solid #0f172a",
              borderRadius: "36px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Mobile Status Bar */}
            <div style={{ background: "#0f172a", color: "#fff", padding: "6px 20px", display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600 }}>
              <span>09:41</span>
              <span>FieldBrix Mobile • 5G</span>
            </div>

            {/* Mobile Header */}
            <div style={{ background: "#f8fafc", padding: "12px 16px", borderBottom: "1px solid var(--c-border)" }}>
              <div style={{ fontSize: "10px", color: "var(--c-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Task Execution Preview</div>
              <div style={{ fontSize: "16px", fontWeight: 700 }}>{workflow?.name}</div>
            </div>

            {/* Mobile Form Body */}
            <div style={{ padding: "16px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              {schema.sections.map((sec, sIdx) => {
                const secFields = schema.fields.filter((f) => f.sectionId === sec.id);
                return (
                  <div key={sec.id} style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid var(--c-border)" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px", color: "#0f172a" }}>
                      {sIdx + 1}. {sec.title}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {secFields.map((f) => (
                        <div key={f.id}>
                          <label className="fb-label" style={{ fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                            <span>
                              {f.label} {f.required && <span style={{ color: "#dc2626" }}>*</span>}
                            </span>
                            {f.config?.unit && <span style={{ color: "var(--c-text-muted)", fontSize: "11px" }}>({f.config.unit})</span>}
                          </label>

                          {f.type === "TEXT" && (
                            <input
                              type="text"
                              className="fb-input fb-btn--full"
                              value={previewAnswers[f.key] ?? ""}
                              onChange={(e) => setPreviewAnswers({ ...previewAnswers, [f.key]: e.target.value })}
                              placeholder={f.config?.placeholder || "Enter value…"}
                            />
                          )}

                          {f.type === "TEXTAREA" && (
                            <textarea
                              className="fb-textarea fb-btn--full"
                              rows={2}
                              value={previewAnswers[f.key] ?? ""}
                              onChange={(e) => setPreviewAnswers({ ...previewAnswers, [f.key]: e.target.value })}
                              placeholder="Enter notes…"
                            />
                          )}

                          {f.type === "NUMBER" && (
                            <input
                              type="number"
                              className="fb-input fb-btn--full"
                              value={previewAnswers[f.key] ?? ""}
                              onChange={(e) => setPreviewAnswers({ ...previewAnswers, [f.key]: e.target.value })}
                              placeholder="0.00"
                            />
                          )}

                          {f.type === "YES_NO" && (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                className={`fb-btn ${previewAnswers[f.key] === "YES" ? "fb-btn--primary" : "fb-btn--ghost"}`}
                                style={{ flex: 1, padding: "6px" }}
                                onClick={() => setPreviewAnswers({ ...previewAnswers, [f.key]: "YES" })}
                              >
                                ✓ Pass
                              </button>
                              <button
                                type="button"
                                className={`fb-btn ${previewAnswers[f.key] === "NO" ? "fb-btn--danger" : "fb-btn--ghost"}`}
                                style={{ flex: 1, padding: "6px" }}
                                onClick={() => setPreviewAnswers({ ...previewAnswers, [f.key]: "NO" })}
                              >
                                ✕ Fail
                              </button>
                            </div>
                          )}

                          {(f.type === "SELECT" || f.type === "MULTI_SELECT") && (
                            <select
                              className="fb-select fb-btn--full"
                              value={previewAnswers[f.key] ?? ""}
                              onChange={(e) => setPreviewAnswers({ ...previewAnswers, [f.key]: e.target.value })}
                            >
                              <option value="">Select an option…</option>
                              {(f.config?.options ?? []).map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {f.type === "PHOTO" && (
                            <div style={{ border: "2px dashed #93c5fd", borderRadius: "8px", padding: "12px", textAlign: "center", background: "#f0f9ff" }}>
                              <span style={{ fontSize: "24px" }}>📷</span>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "#0369a1" }}>Tap to take photo</div>
                              <div style={{ fontSize: "10px", color: "#0284c7" }}>GPS geotagging enabled</div>
                            </div>
                          )}

                          {f.type === "SIGNATURE" && (
                            <div style={{ border: "1px dashed #cbd5e1", borderRadius: "6px", height: "80px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#94a3b8" }}>
                              ✍️ Customer Signature Touchpad
                            </div>
                          )}

                          {f.help && <div style={{ fontSize: "10px", color: "var(--c-text-muted)", marginTop: "3px" }}>{f.help}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <button type="button" className="fb-btn fb-btn--primary fb-btn--full" style={{ padding: "12px", marginTop: "8px" }}>
                ✓ Complete & Submit Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {publishModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div className="fb-form-card" style={{ width: "480px", margin: 0, background: "#fff" }}>
            <h3 className="fb-card-title">Publish Immutable Workflow Version</h3>
            <p className="fb-card-subtitle" style={{ margin: "0 0 16px" }}>
              Publishing will create an immutable, content-hashed release version ready for live task scheduling.
            </p>

            <div className="fb-form-row">
              <label className="fb-label">Release Notes / Changelog</label>
              <textarea
                className="fb-textarea"
                rows={3}
                placeholder="e.g. Added mandatory refrigerant leak check and customer signature policy"
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
              />
            </div>

            <div className="fb-form-actions" style={{ justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" className="fb-btn fb-btn--ghost" onClick={() => setPublishModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="fb-btn fb-btn--primary"
                disabled={publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
              >
                {publishMutation.isPending ? "Publishing…" : "Confirm & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
