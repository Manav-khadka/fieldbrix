import React from "react";
import { useUiStore } from "../../store/ui.store";

export const ToastContainer: React.FC = () => {
  const toasts = useUiStore((state) => state.toasts);
  const removeToast = useUiStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fb-toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`fb-toast fb-toast-${toast.type}`}
          role="alert"
        >
          <div className="fb-toast-icon">
            {toast.type === "success" && "✓"}
            {toast.type === "error" && "✕"}
            {toast.type === "warning" && "!"}
            {toast.type === "info" && "ℹ"}
          </div>
          <div className="fb-toast-content">
            {toast.title && <div className="fb-toast-title">{toast.title}</div>}
            <div className="fb-toast-message">{toast.message}</div>
          </div>
          <button
            type="button"
            className="fb-toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
