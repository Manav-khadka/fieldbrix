import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function DragHandle({
  attributes,
  listeners,
}: {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
}) {
  return (
    <button
      type="button"
      className="fb-drag-handle"
      aria-label="Reorder (drag, or focus and use arrow keys)"
      {...attributes}
      {...listeners}
    >
      ⋮⋮
    </button>
  );
}

export function Sortable({
  id,
  children,
}: {
  id: string;
  children: (args: {
    setNodeRef: (element: HTMLElement | null) => void;
    style: React.CSSProperties;
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
    isDragging: boolean;
  }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : undefined,
    position: "relative",
  };
  return <>{children({ setNodeRef, style, attributes, listeners, isDragging })}</>;
}
