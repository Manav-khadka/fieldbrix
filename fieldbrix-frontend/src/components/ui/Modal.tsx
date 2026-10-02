import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnEsc?: boolean;
  closeOnOverlayClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnEsc = true,
  closeOnOverlayClick = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEsc) {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fb-modal-overlay" role="dialog" aria-modal="true">
      <div
        className="fb-modal-backdrop"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div className={`fb-modal-container fb-modal-${size}`}>
        <div className="fb-modal-header">
          <div>
            {title && <h3 className="fb-modal-title">{title}</h3>}
            {description && (
              <p className="fb-modal-description">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            className="fb-modal-close-btn"
          >
            ✕
          </Button>
        </div>

        <div className="fb-modal-body">{children}</div>

        {footer && <div className="fb-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};
