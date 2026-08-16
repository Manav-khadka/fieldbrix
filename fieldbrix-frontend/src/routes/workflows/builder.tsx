import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../../api/client";

interface WorkflowSchema {
  sections: Array<{ id: string; title: string; position: number }>;
  fields: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
    sectionId?: string;
  }>;
  rules: unknown[];
}
interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  revision: number;
  schema?: WorkflowSchema;
}
interface FieldType {
  type: string;
  category: string;
  since: number;
}

export function WorkflowBuilderPage() {
  const { id } = useParams({ from: "/layout/workflows/$id/builder" });
  const qc = useQueryClient();

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", id],
    queryFn: () => api.get<Workflow>(`/workflows/${id}`),
  });
  const { data: fieldTypes } = useQuery({
    queryKey: ["workflow-field-types"],
    queryFn: () => api.get<FieldType[]>("/workflow-field-types"),
  });

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldType, setNewFieldType] = useState("TEXT");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const addSectionMutation = useMutation({
    mutationFn: (title: string) =>
      api.post(`/workflows/${id}/sections`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow", id] }),
  });

  const addFieldMutation = useMutation({
    mutationFn: ({
      key,
      label,
      type,
      sectionId,
    }: {
      key: string;
      label: string;
      type: string;
      sectionId?: string;
    }) => api.post(`/workflows/${id}/fields`, { key, label, type, sectionId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow", id] }),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      api.post(`/workflows/${id}/publish`, {
        revision: workflow?.revision ?? 1,
        notes: "Published from builder",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow", id] }),
  });

  const schema = (workflow?.schema ?? {
    sections: [],
    fields: [],
    rules: [],
  }) as WorkflowSchema;

  if (isLoading)
    return (
      <div className="fb-page">
        <p className="fb-table-loading">Loading workflow…</p>
      </div>
    );

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">
            {workflow?.name ?? "Workflow Builder"}
          </h1>
          <p className="fb-page-subtitle">
            <span
              className={`fb-status fb-status--${(workflow?.status ?? "draft").toLowerCase()}`}
            >
              {workflow?.status}
            </span>{" "}
            · Revision {workflow?.revision}
          </p>
        </div>
        <div className="fb-page-actions">
          <Link
            to="/workflows/$id/rules"
            params={{ id: id }}
            className="fb-btn fb-btn--ghost"
          >
            Rules →
          </Link>
          <button
            id="workflow-publish"
            className="fb-btn fb-btn--primary"
            onClick={() => publishMutation.mutate()}
            disabled={
              publishMutation.isPending || workflow?.status === "PUBLISHED"
            }
          >
            {publishMutation.isPending ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <div className="fb-builder-layout">
        {/* Sections panel */}
        <div className="fb-builder-panel">
          <h2 className="fb-panel-title">Sections</h2>
          {schema.sections.map((s) => (
            <button
              key={s.id}
              id={`section-${s.id}`}
              className={`fb-section-btn ${selectedSection === s.id ? "fb-section-btn--active" : ""}`}
              onClick={() => setSelectedSection(s.id)}
            >
              {s.title}
            </button>
          ))}
          <div className="fb-add-row">
            <input
              id="new-section-title"
              type="text"
              className="fb-input"
              placeholder="Section title…"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
            />
            <button
              id="add-section"
              className="fb-btn fb-btn--ghost"
              onClick={() => {
                if (newSectionTitle.trim()) {
                  addSectionMutation.mutate(newSectionTitle.trim());
                  setNewSectionTitle("");
                }
              }}
              disabled={!newSectionTitle.trim() || addSectionMutation.isPending}
            >
              + Section
            </button>
          </div>
        </div>

        {/* Fields panel */}
        <div className="fb-builder-panel fb-builder-panel--main">
          <h2 className="fb-panel-title">Fields</h2>
          {schema.fields
            .filter((f) => !selectedSection || f.sectionId === selectedSection)
            .map((f) => (
              <div key={f.id} className="fb-field-row">
                <span className="fb-field-key fb-code">{f.key}</span>
                <span className="fb-field-label">{f.label}</span>
                <span className="fb-badge">{f.type}</span>
              </div>
            ))}
          <div className="fb-add-row fb-add-row--fields">
            <input
              id="new-field-key"
              type="text"
              className="fb-input"
              placeholder="field_key"
              value={newFieldKey}
              onChange={(e) =>
                setNewFieldKey(e.target.value.replace(/\s/g, "_").toLowerCase())
              }
            />
            <input
              id="new-field-label"
              type="text"
              className="fb-input"
              placeholder="Field label"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
            />
            <select
              id="new-field-type"
              className="fb-select"
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
            >
              {(fieldTypes ?? []).map((ft) => (
                <option key={ft.type} value={ft.type}>
                  {ft.type}
                </option>
              ))}
            </select>
            <button
              id="add-field"
              className="fb-btn fb-btn--ghost"
              onClick={() => {
                if (newFieldKey && newFieldLabel) {
                  addFieldMutation.mutate({
                    key: newFieldKey,
                    label: newFieldLabel,
                    type: newFieldType,
                    sectionId: selectedSection ?? undefined,
                  });
                  setNewFieldKey("");
                  setNewFieldLabel("");
                }
              }}
              disabled={
                !newFieldKey || !newFieldLabel || addFieldMutation.isPending
              }
            >
              + Field
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
