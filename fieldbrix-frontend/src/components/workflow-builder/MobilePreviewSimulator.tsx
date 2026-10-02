import type { WorkflowField, WorkflowSchema } from "./types";
import {
  SmartphoneIcon,
  TabletIcon,
  PhotoIcon,
  SignatureIcon,
  GpsIcon,
  CheckIcon,
} from "../icons";

function isFieldVisible(
  field: WorkflowField,
  schema: WorkflowSchema,
  previewAnswers: Record<string, unknown>,
): boolean {
  const rule = field.config?.conditionalRule;
  if (!rule || !rule.dependsOnFieldId) return true;

  const parentField = schema.fields.find(
    (f) => f.id === rule.dependsOnFieldId || f.key === rule.dependsOnFieldId,
  );
  if (!parentField) return true;

  const parentAnswer =
    previewAnswers[parentField.key] ?? previewAnswers[parentField.id];

  switch (rule.operator) {
    case "EQUALS":
      return (
        String(parentAnswer ?? "").trim().toLowerCase() ===
        String(rule.value ?? "").trim().toLowerCase()
      );
    case "NOT_EQUALS":
      return (
        String(parentAnswer ?? "").trim().toLowerCase() !==
        String(rule.value ?? "").trim().toLowerCase()
      );
    case "CONTAINS":
      if (Array.isArray(parentAnswer)) {
        return parentAnswer
          .map((x) => String(x).toLowerCase())
          .includes(String(rule.value ?? "").toLowerCase());
      }
      return String(parentAnswer ?? "")
        .toLowerCase()
        .includes(String(rule.value ?? "").toLowerCase());
    case "IS_SET":
      return (
        parentAnswer !== undefined &&
        parentAnswer !== null &&
        parentAnswer !== ""
      );
    case "IS_NOT_SET":
      return (
        parentAnswer === undefined ||
        parentAnswer === null ||
        parentAnswer === ""
      );
    default:
      return true;
  }
}

export function MobilePreviewSimulator({
  workflowName,
  schema,
  previewDevice,
  onDeviceChange,
  previewAnswers,
  onAnswerChange,
}: {
  workflowName: string | undefined;
  schema: WorkflowSchema;
  previewDevice: "MOBILE" | "TABLET";
  onDeviceChange: (device: "MOBILE" | "TABLET") => void;
  previewAnswers: Record<string, unknown>;
  onAnswerChange: (key: string, value: unknown) => void;
}) {
  const isMobile = previewDevice === "MOBILE";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.25rem",
        padding: "1rem 0",
        width: "100%",
      }}
    >
      {/* Device Viewport Selector */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          background: "var(--fb-slate-100)",
          padding: "4px",
          borderRadius: "var(--fb-radius-lg)",
          border: "1px solid var(--fb-border-subtle)",
        }}
      >
        <button
          type="button"
          className={`fb-btn ${isMobile ? "fb-btn-primary" : "fb-btn-ghost"}`}
          style={{ height: "32px", padding: "0 14px", fontSize: "12px" }}
          onClick={() => onDeviceChange("MOBILE")}
        >
          <SmartphoneIcon size={14} />
          <span>Mobile (390px)</span>
        </button>
        <button
          type="button"
          className={`fb-btn ${!isMobile ? "fb-btn-primary" : "fb-btn-ghost"}`}
          style={{ height: "32px", padding: "0 14px", fontSize: "12px" }}
          onClick={() => onDeviceChange("TABLET")}
        >
          <TabletIcon size={14} />
          <span>Tablet (680px)</span>
        </button>
      </div>

      {/* Frame Container */}
      <div
        style={{
          width: isMobile ? "390px" : "680px",
          height: "760px",
          borderRadius: "36px",
          border: "8px solid #1e293b",
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.1)",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Device Notch / Camera */}
        <div
          style={{
            height: "22px",
            background: "#1e293b",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "10px",
              borderRadius: "5px",
              background: "#0f172a",
            }}
          />
        </div>

        {/* Mobile Header */}
        <div
          style={{
            background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
            padding: "12px 18px",
            borderBottom: "1px solid var(--fb-border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--fb-brand-indigo)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Interactive Field Execution
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--fb-slate-900)",
              }}
            >
              {workflowName || "Untitled Workflow"}
            </div>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "12px",
              background: "#dbeafe",
              color: "#1e40af",
            }}
          >
            Interactive
          </span>
        </div>

        {/* Scrollable Form Body with Live Conditional Logic */}
        <div
          style={{
            padding: "16px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background: "#f8fafc",
          }}
        >
          {schema.sections.map((sec, sIdx) => {
            const secFields = schema.fields.filter(
              (f) => f.sectionId === sec.id,
            );
            const visibleSecFields = secFields.filter((f) =>
              isFieldVisible(f, schema, previewAnswers),
            );

            if (visibleSecFields.length === 0) return null;

            return (
              <div
                key={sec.id}
                style={{
                  background: "#ffffff",
                  padding: "14px",
                  borderRadius: "var(--fb-radius-lg)",
                  border: "1px solid var(--fb-border-subtle)",
                  boxShadow: "var(--fb-shadow-xs)",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    marginBottom: "10px",
                    color: "var(--fb-slate-900)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "var(--fb-slate-100)",
                      fontSize: "10px",
                      color: "var(--fb-slate-700)",
                    }}
                  >
                    {sIdx + 1}
                  </span>
                  {sec.title}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {visibleSecFields.map((f) => {
                    const currentVal = previewAnswers[f.key] ?? "";
                    const optionsList = Array.isArray(f.config?.options)
                      ? f.config.options.map((opt: unknown) => {
                          const optObj =
                            typeof opt === "object" && opt !== null
                              ? (opt as { value?: string })
                              : null;
                          return (
                            optObj?.value ??
                            (typeof opt === "string" ? opt : String(opt ?? ""))
                          );
                        })
                      : ["Option 1", "Option 2"];

                    return (
                      <div
                        key={f.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <label
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--fb-slate-700)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>{f.label}</span>
                          {f.required && (
                            <span
                              style={{
                                color: "var(--fb-brand-rose)",
                                fontWeight: 700,
                              }}
                            >
                              *
                            </span>
                          )}
                        </label>

                        {/* Rendering input control by type */}
                        {f.type === "TEXT" && (
                          <input
                            type="text"
                            className="fb-input fb-btn--full"
                            style={{ height: "34px", fontSize: "12px" }}
                            placeholder={
                              f.config?.placeholder || "Enter value…"
                            }
                            value={String(currentVal)}
                            onChange={(e) =>
                              onAnswerChange(f.key, e.target.value)
                            }
                          />
                        )}

                        {(f.type === "LONG_TEXT" ||
                          f.type === "TEXTAREA") && (
                          <textarea
                            className="fb-textarea fb-btn--full"
                            rows={2}
                            style={{ fontSize: "12px" }}
                            placeholder={
                              f.config?.placeholder ||
                              "Enter observation notes…"
                            }
                            value={String(currentVal)}
                            onChange={(e) =>
                              onAnswerChange(f.key, e.target.value)
                            }
                          />
                        )}

                        {f.type === "NUMBER" && (
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="number"
                              className="fb-input"
                              style={{
                                width: "120px",
                                height: "34px",
                                fontSize: "12px",
                              }}
                              placeholder="0.00"
                              value={String(currentVal)}
                              onChange={(e) =>
                                onAnswerChange(f.key, e.target.value)
                              }
                            />
                            {f.config?.unit && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "var(--fb-slate-500)",
                                }}
                              >
                                {f.config.unit}
                              </span>
                            )}
                          </div>
                        )}

                        {(f.type === "BOOLEAN" || f.type === "YES_NO") && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              className={`fb-btn ${currentVal === "YES" ? "fb-btn-primary" : "fb-btn-secondary"} fb-btn-xs`}
                              style={{ padding: "4px 12px", fontSize: "11px" }}
                              onClick={() => onAnswerChange(f.key, "YES")}
                            >
                              ✓ Yes / Pass
                            </button>
                            <button
                              type="button"
                              className={`fb-btn ${currentVal === "NO" ? "fb-btn-danger" : "fb-btn-secondary"} fb-btn-xs`}
                              style={{ padding: "4px 12px", fontSize: "11px" }}
                              onClick={() => onAnswerChange(f.key, "NO")}
                            >
                              ✕ No / Fail
                            </button>
                          </div>
                        )}

                        {(f.type === "SINGLE_CHOICE" ||
                          f.type === "SELECT") && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "5px",
                              marginTop: "2px",
                            }}
                          >
                            {optionsList.map((opt) => (
                              <label
                                key={opt}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontSize: "12px",
                                  color: "var(--fb-slate-800)",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`sim-${f.id}`}
                                  checked={currentVal === opt}
                                  onChange={() => onAnswerChange(f.key, opt)}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {(f.type === "MULTIPLE_CHOICE" ||
                          f.type === "MULTI_SELECT") && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "5px",
                              marginTop: "2px",
                            }}
                          >
                            {optionsList.map((opt) => {
                              const selectedList = Array.isArray(currentVal)
                                ? (currentVal as string[])
                                : [];
                              const isChecked = selectedList.includes(opt);
                              return (
                                <label
                                  key={opt}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "12px",
                                    color: "var(--fb-slate-800)",
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...selectedList, opt]
                                        : selectedList.filter((x) => x !== opt);
                                      onAnswerChange(f.key, next);
                                    }}
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {(f.type === "IMAGE" || f.type === "PHOTO") && (
                          <button
                            type="button"
                            className="fb-btn fb-btn-secondary fb-btn-sm"
                            style={{
                              justifyContent: "center",
                              fontSize: "11px",
                              gap: "6px",
                            }}
                            onClick={() =>
                              onAnswerChange(
                                f.key,
                                `photo_captured_${Date.now()}.jpg`,
                              )
                            }
                          >
                            <PhotoIcon size={14} />
                            <span>
                              {currentVal
                                ? `1 Photo Captured ✓`
                                : `Take Photo (${f.config?.photoCountMin ?? 1} min)`}
                            </span>
                          </button>
                        )}

                        {f.type === "FILE" && (
                          <button
                            type="button"
                            className="fb-btn fb-btn-secondary fb-btn-sm"
                            style={{
                              justifyContent: "center",
                              fontSize: "11px",
                              gap: "6px",
                            }}
                            onClick={() =>
                              onAnswerChange(
                                f.key,
                                `document_${Date.now()}.pdf`,
                              )
                            }
                          >
                            <span>📎</span>
                            <span>
                              {currentVal
                                ? `Document Uploaded ✓`
                                : `Upload File (${f.config?.allowedFileExtensions?.join(", ") || ".pdf, .png"})`}
                            </span>
                          </button>
                        )}

                        {f.type === "SIGNATURE" && (
                          <button
                            type="button"
                            className="fb-btn fb-btn-secondary fb-btn-sm"
                            style={{
                              justifyContent: "center",
                              fontSize: "11px",
                              gap: "6px",
                            }}
                            onClick={() =>
                              onAnswerChange(
                                f.key,
                                `signature_signed_${Date.now()}`,
                              )
                            }
                          >
                            <SignatureIcon size={14} />
                            <span>
                              {currentVal
                                ? `Signature Recorded ✓`
                                : `Sign on Screen`}
                            </span>
                          </button>
                        )}

                        {f.type === "GPS" && (
                          <button
                            type="button"
                            className="fb-btn fb-btn-secondary fb-btn-sm"
                            style={{
                              justifyContent: "center",
                              fontSize: "11px",
                              gap: "6px",
                            }}
                            onClick={() =>
                              onAnswerChange(
                                f.key,
                                "25.2048° N, 55.2708° E (Verified)",
                              )
                            }
                          >
                            <GpsIcon size={14} />
                            <span>
                              {currentVal
                                ? String(currentVal)
                                : `Capture GPS (${f.config?.geofenceRadiusKm ? `${f.config.geofenceRadiusKm}km geofence` : "Geostamp"})`}
                            </span>
                          </button>
                        )}

                        {(f.type === "DATE" ||
                          f.type === "TIME" ||
                          f.type === "DATETIME") && (
                          <input
                            type="text"
                            className="fb-input fb-btn--full"
                            style={{ height: "34px", fontSize: "12px" }}
                            placeholder={`Select ${f.type.toLowerCase()}…`}
                            value={String(currentVal)}
                            onChange={(e) =>
                              onAnswerChange(f.key, e.target.value)
                            }
                          />
                        )}

                        {f.help && (
                          <div
                            style={{
                              fontSize: "10.5px",
                              color: "var(--fb-slate-500)",
                            }}
                          >
                            {f.help}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {schema.sections.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                color: "var(--fb-slate-400)",
              }}
            >
              No sections or questions configured in this workflow.
            </div>
          )}
        </div>

        {/* Mobile Simulator Footer */}
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--fb-border-subtle)",
            background: "#ffffff",
          }}
        >
          <button
            type="button"
            className="fb-btn fb-btn-primary fb-btn--full"
            style={{ height: "38px", fontSize: "13px" }}
            onClick={() => alert("Simulated Form Completed Successfully!")}
          >
            <CheckIcon size={15} />
            <span>Complete & Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
