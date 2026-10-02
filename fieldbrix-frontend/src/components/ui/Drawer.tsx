import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: "right" | "left";
  size?: "sm" | "md" | "lg" | "xl";
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  position = "right",
  size = "md",
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fb-drawer-overlay" role="dialog" aria-modal="true">
      <div className="fb-drawer-backdrop" onClick={onClose} />
      <div
        className={`fb-drawer-panel fb-drawer-${position} fb-drawer-${size}`}
      >
        <div className="fb-drawer-header">
          <div>
            {title && <h3 className="fb-drawer-title">{title}</h3>}
            {description && (
              <p className="fb-drawer-description">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close drawer"
            className="fb-drawer-close-btn"
          >
            ✕
          </Button>
        </div>

        <div className="fb-drawer-body">{children}</div>

        {footer && <div className="fb-drawer-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};
