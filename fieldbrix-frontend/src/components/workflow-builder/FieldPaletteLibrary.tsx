import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { FIELD_PALETTE } from "./field-palette";
import type { FieldPaletteItem } from "./field-palette";
import {
  TextIcon,
  TextAreaIcon,
  NumberIcon,
  ToggleIcon,
  SelectIcon,
  MultiSelectIcon,
  DateIcon,
  TimeIcon,
  PhotoIcon,
  SignatureIcon,
  BarcodeIcon,
  GpsIcon,
  InfoIcon,
  PlusIcon,
  GripIcon,
} from "../icons";

const ICON_MAP: Record<string, React.ReactNode> = {
  TEXT: <TextIcon size={15} />,
  LONG_TEXT: <TextAreaIcon size={15} />,
  TEXTAREA: <TextAreaIcon size={15} />,
  NUMBER: <NumberIcon size={15} />,
  BOOLEAN: <ToggleIcon size={15} />,
  YES_NO: <ToggleIcon size={15} />,
  SINGLE_CHOICE: <SelectIcon size={15} />,
  SELECT: <SelectIcon size={15} />,
  MULTIPLE_CHOICE: <MultiSelectIcon size={15} />,
  MULTI_SELECT: <MultiSelectIcon size={15} />,
  DATE: <DateIcon size={15} />,
  TIME: <TimeIcon size={15} />,
  DATETIME: <DateIcon size={15} />,
  IMAGE: <PhotoIcon size={15} />,
  PHOTO: <PhotoIcon size={15} />,
  FILE: <InfoIcon size={15} />,
  SIGNATURE: <SignatureIcon size={15} />,
  SCANNER: <BarcodeIcon size={15} />,
  BARCODE: <BarcodeIcon size={15} />,
  GPS: <GpsIcon size={15} />,
  SECTION_INSTRUCTION: <InfoIcon size={15} />,
  INSTRUCTION: <InfoIcon size={15} />,
};

function PaletteButton({
  item,
  onAddField,
}: {
  item: FieldPaletteItem;
  onAddField: (type: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.type}`,
    data: { source: "palette", fieldType: item.type, label: item.label },
  });

  const iconComponent = ICON_MAP[item.type] ?? <TextIcon size={15} />;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="fb-palette-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 10px",
        background: isDragging ? "var(--fb-slate-100)" : "#ffffff",
        border: `1px solid ${isDragging ? "var(--fb-brand-indigo)" : "var(--fb-border-subtle)"}`,
        borderRadius: "var(--fb-radius-md)",
        cursor: isDragging ? "grabbing" : "grab",
        textAlign: "left",
        transition: "all 0.15s ease",
        opacity: isDragging ? 0.35 : 1,
        width: "100%",
        boxSizing: "border-box",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "26px",
          height: "26px",
          borderRadius: "6px",
          background: "var(--fb-slate-100)",
          color: "var(--fb-slate-700)",
          flexShrink: 0,
        }}
      >
        {iconComponent}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--fb-slate-900)",
          }}
        >
          {item.label}
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "var(--fb-slate-500)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.desc}
        </div>
      </div>
      <button
        type="button"
        className="fb-btn fb-btn-ghost fb-btn-xs"
        style={{
          color: "var(--fb-brand-indigo)",
          padding: "3px 5px",
          display: "flex",
          alignItems: "center",
          borderRadius: "4px",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onAddField(item.type);
        }}
        title={`Add ${item.label} to canvas`}
      >
        <PlusIcon size={12} />
      </button>
    </div>
  );
}

export function FieldPaletteLibrary({
  onAddField,
  isFloating = false,
  onToggleFloating,
}: {
  onAddField: (type: string) => void;
  isFloating?: boolean;
  onToggleFloating?: () => void;
}) {
  const [position, setPosition] = useState({ x: 100, y: 150 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (!isFloating) return;
    // Don't drag if clicking buttons
    if ((e.target as HTMLElement).closest("button")) return;

    setIsDraggingPanel(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingPanel) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: Math.max(
          20,
          Math.min(window.innerWidth - 300, dragStartRef.current.startX + dx),
        ),
        y: Math.max(
          60,
          Math.min(window.innerHeight - 100, dragStartRef.current.startY + dy),
        ),
      });
    },
    [isDraggingPanel],
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingPanel(false);
  }, []);

  useEffect(() => {
    if (isDraggingPanel) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPanel, handleMouseMove, handleMouseUp]);

  const containerStyle: React.CSSProperties = isFloating
    ? {
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "280px",
        height: isMinimized ? "auto" : "480px",
        maxHeight: "80vh",
        zIndex: 2000,
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(79, 70, 229, 0.2)",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRadius: "var(--fb-radius-lg)",
        overflow: "hidden",
        userSelect: isDraggingPanel ? "none" : "auto",
        transition: isDraggingPanel ? "none" : "box-shadow 0.2s ease",
      }
    : {
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--fb-surface-card)",
        borderRadius: "var(--fb-radius-lg)",
        border: "1px solid var(--fb-border-subtle)",
        boxShadow: "var(--fb-shadow-xs)",
        overflow: "hidden",
      };

  return (
    <div style={containerStyle}>
      {/* Draggable Header */}
      <div
        onMouseDown={handleMouseDownHeader}
        style={{
          padding: "0.75rem 1rem",
          borderBottom: isMinimized
            ? "none"
            : "1px solid var(--fb-border-subtle)",
          background: isFloating
            ? "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)"
            : "#ffffff",
          flexShrink: 0,
          cursor: isFloating ? "move" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isFloating && (
            <span
              style={{
                color: "var(--fb-slate-400)",
                display: "flex",
                cursor: "grab",
              }}
            >
              <GripIcon size={14} />
            </span>
          )}
          <div>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--fb-slate-900)",
                margin: 0,
              }}
            >
              Component Palette{" "}
              {isFloating && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--fb-brand-indigo)",
                  }}
                >
                  (Floating)
                </span>
              )}
            </h3>
            {!isMinimized && (
              <p
                style={{
                  fontSize: "10px",
                  color: "var(--fb-slate-500)",
                  margin: 0,
                }}
              >
                Drag item into canvas or tap +
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {isFloating && (
            <button
              type="button"
              className="fb-btn fb-btn-ghost fb-btn-xs"
              onClick={() => setIsMinimized((v) => !v)}
              title={isMinimized ? "Expand palette" : "Minimize palette"}
              style={{ padding: "2px 6px", fontSize: "11px" }}
            >
              {isMinimized ? "▲" : "▼"}
            </button>
          )}

          {onToggleFloating && (
            <button
              type="button"
              className={`fb-btn ${isFloating ? "fb-btn-primary" : "fb-btn-ghost"} fb-btn-xs`}
              onClick={onToggleFloating}
              title={isFloating ? "Dock to sidebar" : "Undock & float anywhere"}
              style={{ fontSize: "11px", padding: "2px 6px" }}
            >
              {isFloating ? "Dock" : "Float"}
            </button>
          )}
        </div>
      </div>

      {/* Independently Scrollable Component List */}
      {!isMinimized && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "0.875rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background: "#ffffff",
          }}
        >
          {FIELD_PALETTE.map((cat) => (
            <div key={cat.category}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--fb-slate-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "6px",
                }}
              >
                {cat.category}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                }}
              >
                {cat.items.map((item) => (
                  <PaletteButton
                    key={item.type}
                    item={item}
                    onAddField={onAddField}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
