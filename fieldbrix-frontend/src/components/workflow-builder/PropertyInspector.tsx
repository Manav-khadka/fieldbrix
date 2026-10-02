import type {
  WorkflowField,
  WorkflowFieldConfig,
  ConditionalRule,
} from "./types";
import { PlusIcon, TrashIcon, LayersIcon } from "../icons";

const REGEX_PRESETS = [
  { label: "Email", pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message: "Must be a valid email address" },
  { label: "Phone (Intl)", pattern: "^\\+?[1-9]\\d{1,14}$", message: "Must be a valid international phone number" },
  { label: "US Zip Code", pattern: "^\\d{5}(-\\d{4})?$", message: "Must be a valid 5 or 9 digit zip code" },
  { label: "AlphaNumeric Only", pattern: "^[a-zA-Z0-9_-]+$", message: "Only letters, numbers, and dashes allowed" },
  { label: "URL", pattern: "^https?:\\/\\/.+$", message: "Must be a valid web URL starting with http:// or https://" },
];

const EXTENSION_PRESETS = [".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx", ".csv", ".zip"];

export function PropertyInspector({
  selectedField,
  allFields = [],
  onUpdateField,
}: {
  selectedField: WorkflowField | undefined;
  allFields?: WorkflowField[];
  onUpdateField: (payload: {
    fieldId: string;
    label?: string;
    help?: string;
    required?: boolean;
    config?: WorkflowFieldConfig;
  }) => void;
}) {
  const currentConfig: WorkflowFieldConfig = selectedField?.config ?? {};
  const currentCondition: ConditionalRule | undefined = currentConfig.conditionalRule;

  // Potential parent fields that come before or can trigger this field
  const eligibleParentFields = allFields.filter((f) => f.id !== selectedField?.id);

  const updateConfig = (patch: Partial<WorkflowFieldConfig>) => {
    if (!selectedField) return;
    onUpdateField({
      fieldId: selectedField.id,
      label: selectedField.label,
      help: selectedField.help,
      required: selectedField.required,
      config: { ...currentConfig, ...patch },
    });
  };

  return (
    <div
      className="fb-builder-panel fb-builder-panel--inspector"
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
          padding: "0.875rem 1.25rem",
          borderBottom: "1px solid var(--fb-border-subtle)",
          background: "#ffffff",
          flexShrink: 0,
        }}
      >
        <h3
          style={{
            margin: "0 0 2px",
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--fb-slate-900)",
          }}
        >
          {selectedField ? "Field Property Inspector" : "Inspector"}
        </h3>
        <p style={{ margin: 0, fontSize: "11px", color: "var(--fb-slate-500)" }}>
          {selectedField
            ? `${selectedField.label} (${selectedField.type})`
            : "Select a component on canvas to configure"}
        </p>
      </div>

      {/* Independently Scrollable Form Body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          padding: "1.25rem",
        }}
      >
        {!selectedField ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              color: "var(--fb-slate-400)",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚙️</div>
            <p style={{ fontSize: "13px", margin: "0 0 4px", fontWeight: 600 }}>
              No Component Selected
            </p>
            <p style={{ fontSize: "11px", margin: 0 }}>
              Click any field on the canvas or drag one in to customize validations, conditional logic, and properties.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* General Properties */}
            <div>
              <label className="fb-form-label" style={{ fontSize: "11px" }}>
                Field Title / Question
              </label>
              <input
                type="text"
                className="fb-input fb-btn--full"
                style={{ fontSize: "12px", height: "34px" }}
                value={selectedField.label}
                onChange={(e) =>
                  onUpdateField({
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
              <label className="fb-form-label" style={{ fontSize: "11px" }}>
                Placeholder / Guidance Hint
              </label>
              <input
                type="text"
                className="fb-input fb-btn--full"
                style={{ fontSize: "12px", height: "34px" }}
                placeholder="e.g. Enter serial number..."
                value={currentConfig.placeholder ?? ""}
                onChange={(e) => updateConfig({ placeholder: e.target.value })}
              />
            </div>

            <div>
              <label className="fb-form-label" style={{ fontSize: "11px" }}>
                Help Text
              </label>
              <input
                type="text"
                className="fb-input fb-btn--full"
                style={{ fontSize: "12px", height: "34px" }}
                placeholder="Optional explanation shown below input"
                value={selectedField.help ?? ""}
                onChange={(e) =>
                  onUpdateField({
                    fieldId: selectedField.id,
                    label: selectedField.label,
                    help: e.target.value,
                    required: selectedField.required,
                    config: selectedField.config,
                  })
                }
              />
            </div>

            {/* Mandatory Toggle */}
            <div style={{ borderTop: "1px solid var(--fb-border-subtle)", paddingTop: "12px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(selectedField.required)}
                  onChange={(e) =>
                    onUpdateField({
                      fieldId: selectedField.id,
                      label: selectedField.label,
                      help: selectedField.help,
                      required: e.target.checked,
                      config: selectedField.config,
                    })
                  }
                />
                <span style={{ fontWeight: 600, color: "var(--fb-slate-900)" }}>
                  Mandatory Question
                </span>
                <span style={{ fontSize: "11px", color: "var(--fb-slate-500)" }}>
                  (Required to submit)
                </span>
              </label>
            </div>

            {/* Choice Options for SINGLE_CHOICE / MULTIPLE_CHOICE */}
            {(selectedField.type === "SINGLE_CHOICE" ||
              selectedField.type === "MULTIPLE_CHOICE" ||
              selectedField.type === "SELECT" ||
              selectedField.type === "MULTI_SELECT") && (
              <div
                style={{
                  borderTop: "1px solid var(--fb-border-subtle)",
                  paddingTop: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="fb-form-label" style={{ fontSize: "11px", margin: 0 }}>
                    Choice Options ({currentConfig.options?.length ?? 0})
                  </label>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {(currentConfig.options ?? []).map((opt, oIdx) => {
                    const optObj = typeof opt === "object" && opt !== null ? (opt as { value?: string }) : null;
                    const optValue = optObj?.value ?? (typeof opt === "string" ? opt : "");
                    return (
                      <div key={oIdx} style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          className="fb-input"
                          style={{
                            flex: 1,
                            height: "32px",
                            padding: "0 8px",
                            fontSize: "12px",
                          }}
                          value={optValue}
                          onChange={(e) => {
                            const newOpts = [...(currentConfig.options ?? [])];
                            newOpts[oIdx] = { value: e.target.value };
                            updateConfig({ options: newOpts });
                          }}
                        />
                        <button
                          type="button"
                          className="fb-btn fb-btn-ghost fb-btn-xs"
                          onClick={() => {
                            const newOpts = (currentConfig.options ?? []).filter((_, i) => i !== oIdx);
                            updateConfig({ options: newOpts });
                          }}
                          title="Delete option"
                        >
                          <TrashIcon size={12} />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="fb-btn fb-btn-secondary fb-btn-sm"
                    style={{ fontSize: "11px", marginTop: "4px" }}
                    onClick={() => {
                      const count = (currentConfig.options?.length ?? 0) + 1;
                      const newOpts = [
                        ...(currentConfig.options ?? []),
                        { value: `Option ${count}` },
                      ];
                      updateConfig({ options: newOpts });
                    }}
                  >
                    <PlusIcon size={12} />
                    <span>Add Choice Option</span>
                  </button>
                </div>
              </div>
            )}

            {/* Validation: Regex & Text Patterns */}
            {(selectedField.type === "TEXT" || selectedField.type === "LONG_TEXT" || selectedField.type === "TEXTAREA") && (
              <div style={{ borderTop: "1px solid var(--fb-border-subtle)", paddingTop: "12px" }}>
                <label className="fb-form-label" style={{ fontSize: "11px" }}>
                  Regex Validation Pattern
                </label>
                <input
                  type="text"
                  className="fb-input fb-btn--full"
                  style={{ fontSize: "12px", height: "32px", fontFamily: "var(--fb-font-mono)" }}
                  placeholder="e.g. ^[0-9]{5}$"
                  value={currentConfig.regexPattern ?? ""}
                  onChange={(e) => updateConfig({ regexPattern: e.target.value })}
                />

                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                  {REGEX_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="fb-btn fb-btn-ghost fb-btn-xs"
                      style={{ fontSize: "10px", padding: "2px 6px", background: "var(--fb-slate-100)" }}
                      onClick={() => updateConfig({ regexPattern: p.pattern, regexErrorMessage: p.message })}
                    >
                      +{p.label}
                    </button>
                  ))}
                </div>

                {currentConfig.regexPattern && (
                  <div style={{ marginTop: "8px" }}>
                    <label className="fb-form-label" style={{ fontSize: "11px" }}>
                      Custom Regex Error Message
                    </label>
                    <input
                      type="text"
                      className="fb-input fb-btn--full"
                      style={{ fontSize: "12px", height: "30px" }}
                      placeholder="Please enter a valid value..."
                      value={currentConfig.regexErrorMessage ?? ""}
                      onChange={(e) => updateConfig({ regexErrorMessage: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Validation: Number Ranges & Units */}
            {selectedField.type === "NUMBER" && (
              <div style={{ borderTop: "1px solid var(--fb-border-subtle)", paddingTop: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label className="fb-form-label" style={{ fontSize: "11px" }}>
                      Min Value
                    </label>
                    <input
                      type="number"
                      className="fb-input fb-btn--full"
                      style={{ fontSize: "12px", height: "32px" }}
                      value={currentConfig.min ?? ""}
                      onChange={(e) => updateConfig({ min: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="fb-form-label" style={{ fontSize: "11px" }}>
                      Max Value
                    </label>
                    <input
                      type="number"
                      className="fb-input fb-btn--full"
                      style={{ fontSize: "12px", height: "32px" }}
                      value={currentConfig.max ?? ""}
                      onChange={(e) => updateConfig({ max: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                </div>
                <div style={{ marginTop: "8px" }}>
                  <label className="fb-form-label" style={{ fontSize: "11px" }}>
                    Unit Label
                  </label>
                  <input
                    type="text"
                    className="fb-input fb-btn--full"
                    style={{ fontSize: "12px", height: "32px" }}
                    placeholder="e.g. PSI, °C, Bar, RPM, kW, kg"
                    value={currentConfig.unit ?? ""}
                    onChange={(e) => updateConfig({ unit: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Validation: Image & Photo Rules */}
            {(selectedField.type === "IMAGE" || selectedField.type === "PHOTO") && (
              <div style={{ borderTop: "1px solid var(--fb-border-subtle)", paddingTop: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label className="fb-form-label" style={{ fontSize: "11px" }}>
                      Min Photos
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="fb-input fb-btn--full"
                      style={{ fontSize: "12px", height: "32px" }}
                      value={currentConfig.photoCountMin ?? 1}
                      onChange={(e) => updateConfig({ photoCountMin: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="fb-form-label" style={{ fontSize: "11px" }}>
                      Max Size (MB)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className="fb-input fb-btn--full"
                      style={{ fontSize: "12px", height: "32px" }}
                      value={currentConfig.maxFileSizeMb ?? 10}
                      onChange={(e) => updateConfig({ maxFileSizeMb: parseInt(e.target.value, 10) || 10 })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "8px" }}>
                  <label className="fb-form-label" style={{ fontSize: "11px" }}>
                    Aspect Ratio
                  </label>
                  <select
                    className="fb-select fb-btn--full"
                    style={{ fontSize: "12px", height: "32px" }}
                    value={currentConfig.aspectRatio ?? "ANY"}
                    onChange={(e) => updateConfig({ aspectRatio: e.target.value as "ANY" | "1:1" | "4:3" | "16:9" })}
                  >
                    <option value="ANY">Any Aspect Ratio</option>
                    <option value="1:1">1:1 Square</option>
                    <option value="4:3">4:3 Standard</option>
                    <option value="16:9">16:9 Widescreen</option>
                  </select>
                </div>
              </div>
            )}

            {/* Validation: File & Document Rules */}
            {selectedField.type === "FILE" && (
              <div style={{ borderTop: "1px solid var(--fb-border-subtle)", paddingTop: "12px" }}>
                <label className="fb-form-label" style={{ fontSize: "11px" }}>
                  Allowed File Extensions
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                  {EXTENSION_PRESETS.map((ext) => {
                    const currentExts = currentConfig.allowedFileExtensions ?? [".pdf", ".png", ".jpg", ".docx"];
                    const isChecked = currentExts.includes(ext);
                    return (
                      <button
                        key={ext}
                        type="button"
                        className={`fb-btn ${isChecked ? "fb-btn-primary" : "fb-btn-ghost"} fb-btn-xs`}
                        style={{ fontSize: "10px", padding: "2px 6px" }}
                        onClick={() => {
                          const next = isChecked ? currentExts.filter((e) => e !== ext) : [...currentExts, ext];
                          updateConfig({ allowedFileExtensions: next });
                        }}
                      >
                        {ext}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label className="fb-form-label" style={{ fontSize: "11px" }}>
                    Max Upload File Size (MB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="fb-input fb-btn--full"
                    style={{ fontSize: "12px", height: "32px" }}
                    value={currentConfig.maxFileSizeMb ?? 25}
                    onChange={(e) => updateConfig({ maxFileSizeMb: parseInt(e.target.value, 10) || 25 })}
                  />
                </div>
              </div>
            )}

            {/* Validation: GPS & Geofence Territory */}
            {selectedField.type === "GPS" && (
              <div style={{ borderTop: "1px solid var(--fb-border-subtle)", paddingTop: "12px" }}>
                <label className="fb-form-label" style={{ fontSize: "11px" }}>
                  Geofence Territory Radius (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="fb-input fb-btn--full"
                  style={{ fontSize: "12px", height: "32px" }}
                  placeholder="e.g. 5 (Within 5 km of target location)"
                  value={currentConfig.geofenceRadiusKm ?? ""}
                  onChange={(e) => updateConfig({ geofenceRadiusKm: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
                <p style={{ fontSize: "10px", color: "var(--fb-slate-500)", margin: "4px 0 8px" }}>
                  Mobile app will verify that device GPS falls within this radius during submission.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div>
                    <label className="fb-form-label" style={{ fontSize: "10px" }}>Center Lat</label>
                    <input
                      type="number"
                      step="any"
                      className="fb-input fb-btn--full"
                      style={{ fontSize: "11px", height: "30px" }}
                      placeholder="e.g. 25.2048"
                      value={currentConfig.centerLatitude ?? ""}
                      onChange={(e) => updateConfig({ centerLatitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <label className="fb-form-label" style={{ fontSize: "10px" }}>Center Lng</label>
                    <input
                      type="number"
                      step="any"
                      className="fb-input fb-btn--full"
                      style={{ fontSize: "11px", height: "30px" }}
                      placeholder="e.g. 55.2708"
                      value={currentConfig.centerLongitude ?? ""}
                      onChange={(e) => updateConfig({ centerLongitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Visibility Logic */}
            <div
              style={{
                borderTop: "1px solid var(--fb-border-subtle)",
                paddingTop: "14px",
                background: currentCondition?.dependsOnFieldId ? "#fefce8" : "transparent",
                padding: "10px",
                borderRadius: "var(--fb-radius-md)",
                border: currentCondition?.dependsOnFieldId ? "1px solid #fde047" : "1px solid transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <LayersIcon size={14} color="#ca8a04" />
                <h4 style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--fb-slate-900)" }}>
                  Conditional Visibility
                </h4>
              </div>

              <p style={{ fontSize: "11px", color: "var(--fb-slate-500)", margin: "0 0 10px" }}>
                Show this component only when another question matches a selected answer.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div>
                  <label className="fb-form-label" style={{ fontSize: "10px" }}>
                    Trigger Question
                  </label>
                  <select
                    className="fb-select fb-btn--full"
                    style={{ fontSize: "12px", height: "32px" }}
                    value={currentCondition?.dependsOnFieldId ?? ""}
                    onChange={(e) => {
                      if (!e.target.value) {
                        updateConfig({ conditionalRule: undefined });
                      } else {
                        updateConfig({
                          conditionalRule: {
                            dependsOnFieldId: e.target.value,
                            operator: currentCondition?.operator ?? "EQUALS",
                            value: currentCondition?.value ?? "Option 1",
                          },
                        });
                      }
                    }}
                  >
                    <option value="">-- Always Visible (No Condition) --</option>
                    {eligibleParentFields.map((f, idx) => (
                      <option key={f.id} value={f.id}>
                        #{idx + 1}: {f.label} ({f.type})
                      </option>
                    ))}
                  </select>
                </div>

                {currentCondition?.dependsOnFieldId && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                      <div>
                        <label className="fb-form-label" style={{ fontSize: "10px" }}>Operator</label>
                        <select
                          className="fb-select fb-btn--full"
                          style={{ fontSize: "11px", height: "30px" }}
                          value={currentCondition.operator}
                          onChange={(e) =>
                            updateConfig({
                              conditionalRule: {
                                ...currentCondition,
                                operator: e.target.value as ConditionalRule["operator"],
                              },
                            })
                          }
                        >
                          <option value="EQUALS">Equals</option>
                          <option value="NOT_EQUALS">Not Equals</option>
                          <option value="CONTAINS">Contains</option>
                          <option value="IS_SET">Is Answered</option>
                        </select>
                      </div>

                      {currentCondition.operator !== "IS_SET" && (
                        <div>
                          <label className="fb-form-label" style={{ fontSize: "10px" }}>Target Value</label>
                          <input
                            type="text"
                            className="fb-input fb-btn--full"
                            style={{ fontSize: "11px", height: "30px" }}
                            placeholder="e.g. Option 3"
                            value={currentCondition.value ?? ""}
                            onChange={(e) =>
                              updateConfig({
                                conditionalRule: {
                                  ...currentCondition,
                                  value: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="fb-btn fb-btn-ghost fb-btn-xs"
                      style={{ color: "var(--fb-brand-rose)", marginTop: "4px", fontSize: "11px" }}
                      onClick={() => updateConfig({ conditionalRule: undefined })}
                    >
                      Remove Conditional Rule
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
