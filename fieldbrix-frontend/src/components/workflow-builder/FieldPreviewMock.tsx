import type { WorkflowField } from "./types";

/** Disabled, non-interactive mock of how a field type renders — used on the studio canvas card. */
export function FieldPreviewMock({ field }: { field: WorkflowField }) {
  const optionsList = Array.isArray(field.config?.options)
    ? field.config.options.map((opt: unknown) => {
        const optObj =
          typeof opt === "object" && opt !== null
            ? (opt as { value?: string })
            : null;
        return optObj?.value ?? (typeof opt === "string" ? opt : String(opt ?? ""));
      })
    : ["Option 1", "Option 2"];

  switch (field.type) {
    case "TEXT":
      return (
        <div>
          <input
            type="text"
            className="fb-input fb-btn--full"
            style={{ height: "30px", fontSize: "12px" }}
            placeholder={field.config?.placeholder || "Enter text value…"}
            disabled
          />
          {field.config?.regexPattern && (
            <div style={{ fontSize: "10px", color: "var(--fb-brand-indigo)", marginTop: "3px" }}>
              Pattern: <code>{field.config.regexPattern}</code>
            </div>
          )}
        </div>
      );

    case "LONG_TEXT":
    case "TEXTAREA":
      return (
        <textarea
          className="fb-textarea fb-btn--full"
          rows={2}
          style={{ fontSize: "12px", minHeight: "44px" }}
          placeholder={field.config?.placeholder || "Enter notes or observation details…"}
          disabled
        />
      );

    case "NUMBER":
      return (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="number"
            className="fb-input"
            style={{ width: "130px", height: "30px", fontSize: "12px" }}
            placeholder="0.00"
            disabled
          />
          {field.config?.unit && (
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--fb-slate-600)" }}>
              {field.config.unit}
            </span>
          )}
          {(field.config?.min !== undefined || field.config?.max !== undefined) && (
            <span style={{ fontSize: "10px", color: "var(--fb-slate-400)" }}>
              (Range: {field.config.min ?? "-∞"} to {field.config.max ?? "+∞"})
            </span>
          )}
        </div>
      );

    case "BOOLEAN":
    case "YES_NO":
      return (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className="fb-btn fb-btn-secondary fb-btn-xs"
            style={{ padding: "3px 10px", fontSize: "11px" }}
            disabled
          >
            ✓ Yes / Pass
          </button>
          <button
            type="button"
            className="fb-btn fb-btn-secondary fb-btn-xs"
            style={{ padding: "3px 10px", fontSize: "11px" }}
            disabled
          >
            ✕ No / Fail
          </button>
        </div>
      );

    case "SINGLE_CHOICE":
    case "SELECT":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {optionsList.map((opt, idx) => (
            <label
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--fb-slate-700)",
                cursor: "default",
              }}
            >
              <input type="radio" name={`preview-${field.id}`} disabled defaultChecked={idx === 0} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );

    case "MULTIPLE_CHOICE":
    case "MULTI_SELECT":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {optionsList.map((opt, idx) => (
            <label
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--fb-slate-700)",
                cursor: "default",
              }}
            >
              <input type="checkbox" disabled />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );

    case "IMAGE":
    case "PHOTO":
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 8px",
            background: "#eff6ff",
            borderRadius: "4px",
            fontSize: "11px",
            color: "#1e40af",
          }}
        >
          <span>
            📷 Camera Capture ({field.config?.photoCountMin ?? 1} min photo{field.config?.aspectRatio && field.config.aspectRatio !== "ANY" ? ` • ${field.config.aspectRatio}` : ""})
          </span>
          {field.config?.maxFileSizeMb && (
            <span style={{ fontSize: "10px", color: "#60a5fa" }}>Max {field.config.maxFileSizeMb}MB</span>
          )}
        </div>
      );

    case "FILE":
      return (
        <div
          style={{
            padding: "4px 8px",
            border: "1px dashed var(--fb-border-medium)",
            borderRadius: "4px",
            color: "var(--fb-slate-600)",
            fontSize: "11px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>📎 Document Upload</span>
          <span style={{ fontSize: "10px", color: "var(--fb-slate-400)" }}>
            {field.config?.allowedFileExtensions?.join(", ") || ".pdf, .png, .jpg, .docx"}
          </span>
        </div>
      );

    case "SIGNATURE":
      return (
        <div
          style={{
            height: "40px",
            border: "1px dashed #cbd5e1",
            borderRadius: "4px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            color: "#64748b",
          }}
        >
          ✍️ Signature Pad Canvas
        </div>
      );

    case "SCANNER":
    case "BARCODE":
      return (
        <div
          style={{
            display: "flex",
            gap: "6px",
            alignItems: "center",
            fontSize: "11px",
            color: "#0284c7",
          }}
        >
          <span>🔍 Barcode / QR Identity Scan Trigger</span>
        </div>
      );

    case "GPS":
      return (
        <div style={{ fontSize: "11px", color: "#16a34a", display: "flex", justifyContent: "space-between" }}>
          <span>📍 GPS Coordinates Capture</span>
          {field.config?.geofenceRadiusKm && (
            <span style={{ fontWeight: 600 }}>Territory: {field.config.geofenceRadiusKm} km</span>
          )}
        </div>
      );

    case "SECTION_INSTRUCTION":
    case "INSTRUCTION":
      return (
        <div
          style={{
            fontSize: "11px",
            color: "#334155",
            background: "#e0f2fe",
            padding: "6px 8px",
            borderRadius: "4px",
            borderLeft: "3px solid #0284c7",
          }}
        >
          Guidance / Safety instruction notice.
        </div>
      );

    case "DATE":
    case "TIME":
    case "DATETIME":
      return (
        <input
          type="text"
          className="fb-input"
          style={{ maxWidth: "200px", height: "30px", fontSize: "12px" }}
          placeholder={`Select ${field.type.toLowerCase()}…`}
          disabled
        />
      );

    default:
      return (
        <div style={{ fontSize: "11px", color: "var(--fb-slate-500)" }}>
          Custom Field: <code>{field.type}</code>
        </div>
      );
  }
}
