export function PublishModal({
  notes,
  onNotesChange,
  onCancel,
  onConfirm,
  pending,
}: {
  notes: string;
  onNotesChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
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
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>

        <div className="fb-form-actions" style={{ justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" className="fb-btn fb-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="fb-btn fb-btn--primary" disabled={pending} onClick={onConfirm}>
            {pending ? "Publishing…" : "Confirm & Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
