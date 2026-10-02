import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import {
  pointerWithin,
  rectIntersection,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { api } from "../../api/client";
import type { ApiError } from "../../api/client";
import type {
  Workflow,
  WorkflowField,
  WorkflowFieldConfig,
  WorkflowSchema,
} from "./types";

export interface ActiveDragItem {
  id: string;
  source: string;
  fieldType?: string;
  label?: string;
}

export const customCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  const cornersCollisions = closestCorners(args);
  if (cornersCollisions.length > 0) {
    return cornersCollisions;
  }
  return rectIntersection(args);
};

export function toBackendFieldType(type: string): string {
  switch (type) {
    case "TEXTAREA":
      return "LONG_TEXT";
    case "YES_NO":
      return "BOOLEAN";
    case "SELECT":
      return "SINGLE_CHOICE";
    case "MULTI_SELECT":
      return "MULTIPLE_CHOICE";
    case "PHOTO":
      return "IMAGE";
    case "BARCODE":
      return "SCANNER";
    case "INSTRUCTION":
      return "SECTION_INSTRUCTION";
    default:
      return type;
  }
}

export function useWorkflowBuilderData() {
  const { id } = useParams({ from: "/layout/workflows/$id/builder" });
  const qc = useQueryClient();

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(
    null,
  );

  const flashStatus = (message: string, timeoutMs = 2500) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), timeoutMs);
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const {
    data: workflow,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["workflow", id],
    queryFn: () => api.get<Workflow>(`/workflows/${id}`),
  });

  const schema: WorkflowSchema = {
    sections: Array.isArray(workflow?.schema?.sections)
      ? workflow.schema.sections
      : [],
    fields: Array.isArray(workflow?.schema?.fields)
      ? workflow.schema.fields
      : [],
    rules: Array.isArray(workflow?.schema?.rules)
      ? workflow.schema.rules
      : [],
  };

  const currentSection =
    schema.sections.find((s) => s.id === selectedSectionId) ??
    schema.sections[0];
  const selectedField = schema.fields.find((f) => f.id === selectedFieldId);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["workflow", id] });

  const addSectionMutation = useMutation({
    mutationFn: (title: string) =>
      api.post<Workflow>(
        `/workflows/${id}/sections`,
        { title },
        crypto.randomUUID(),
      ),
    onSuccess: (updated) => {
      qc.setQueryData(["workflow", id], updated);
      invalidate();
      flashStatus("Section created.");
    },
  });

  const removeSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const freshDraft = await api.get<Workflow>(`/workflows/${id}`);
      return api.delete<Workflow>(`/workflows/${id}/sections/${sectionId}`, {
        revision: freshDraft.revision ?? 1,
      });
    },
    onMutate: async (sectionId) => {
      await qc.cancelQueries({ queryKey: ["workflow", id] });
      const prev = qc.getQueryData<Workflow>(["workflow", id]);
      if (prev?.schema) {
        qc.setQueryData<Workflow>(["workflow", id], {
          ...prev,
          schema: {
            ...prev.schema,
            sections: (prev.schema.sections ?? []).filter(
              (s) => s.id !== sectionId,
            ),
            fields: (prev.schema.fields ?? []).filter(
              (f) => f.sectionId !== sectionId,
            ),
          },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["workflow", id], context.prev);
    },
    onSuccess: (updated) => {
      qc.setQueryData(["workflow", id], updated);
      invalidate();
      setSelectedSectionId(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (payload: {
      sectionOrder?: string[];
      fieldOrder?: Record<string, string[]>;
    }) => {
      const freshDraft = await api.get<Workflow>(`/workflows/${id}`);
      return api.put<Workflow>(
        `/workflows/${id}/order`,
        { ...payload, revision: freshDraft.revision ?? 1 },
        crypto.randomUUID(),
      );
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["workflow", id] });
      const prev = qc.getQueryData<Workflow>(["workflow", id]);
      if (!prev?.schema) return { prev };

      const updated = { ...prev.schema };

      if (payload.sectionOrder && Array.isArray(updated.sections)) {
        const orderMap = new Map(
          payload.sectionOrder.map((sid, idx) => [sid, idx]),
        );
        updated.sections = [...updated.sections].sort(
          (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999),
        );
      }

      if (payload.fieldOrder) {
        const secId = Object.keys(payload.fieldOrder)[0];
        const targetIds = payload.fieldOrder[secId];
        if (secId && targetIds && Array.isArray(updated.fields)) {
          const orderMap = new Map(targetIds.map((fid, idx) => [fid, idx]));
          const currentSecFields = updated.fields
            .filter((f) => f.sectionId === secId)
            .sort(
              (a, b) =>
                (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999),
            );
          const otherSecFields = updated.fields.filter(
            (f) => f.sectionId !== secId,
          );
          updated.fields = [...otherSecFields, ...currentSecFields];
        }
      }

      qc.setQueryData<Workflow>(["workflow", id], {
        ...prev,
        schema: updated,
      });

      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["workflow", id], context.prev);
    },
    onSuccess: (updated) => {
      if (updated) qc.setQueryData(["workflow", id], updated);
    },
    onSettled: () => invalidate(),
  });

  const addFieldMutation = useMutation({
    mutationFn: async (
      payload: { type: string; targetIndex?: number } | string,
    ) => {
      const rawType = typeof payload === "string" ? payload : payload.type;
      const targetIndex =
        typeof payload === "object" ? payload.targetIndex : undefined;
      const secId = currentSection?.id;
      const count = schema.fields.length + 1;
      const backendType = toBackendFieldType(rawType);
      const key = `${backendType.toLowerCase()}_${count}_${Date.now().toString(36).slice(-4)}`;
      const label = `New ${rawType.replace(/_/g, " ").toLowerCase()}`;

      // Choice options matching backend schema validation
      const configPayload: WorkflowFieldConfig = {
        placeholder: "",
      };

      if (
        backendType === "SINGLE_CHOICE" ||
        backendType === "MULTIPLE_CHOICE"
      ) {
        configPayload.options = [
          { value: "Option 1" },
          { value: "Option 2" },
        ] as unknown as string[];
      }

      if (backendType === "IMAGE") {
        configPayload.photoCountMin = 1;
      }

      // 1. Post field creation — returns updated Workflow record
      const postResult = await api.post<Workflow>(
        `/workflows/${id}/fields`,
        {
          key,
          label,
          type: backendType,
          sectionId: secId,
          required: false,
          config: configPayload,
        },
        crypto.randomUUID(),
      );

      // 2. Identify the newly created field from the updated workflow schema
      const createdFields = Array.isArray(postResult?.schema?.fields)
        ? postResult.schema.fields
        : [];
      const createdField =
        createdFields.find((f) => f.key === key) ??
        createdFields[createdFields.length - 1];
      const actualFieldId = createdField?.id;
      const currentRevision = postResult?.revision ?? 1;

      // 3. If targetIndex was specified, perform immediate reordering
      if (
        actualFieldId &&
        secId &&
        typeof targetIndex === "number" &&
        targetIndex >= 0
      ) {
        // Collect current section's fields in their current order without the new one
        const currentSecOtherFields = createdFields
          .filter((f) => f.sectionId === secId && f.id !== actualFieldId)
          .map((f) => f.id);

        const newOrder = [...currentSecOtherFields];
        newOrder.splice(
          Math.min(targetIndex, newOrder.length),
          0,
          actualFieldId,
        );

        const reorderResult = await api.put<Workflow>(
          `/workflows/${id}/order`,
          {
            fieldOrder: { [secId]: newOrder },
            revision: currentRevision,
          },
          crypto.randomUUID(),
        );

        return { field: createdField, workflow: reorderResult };
      }

      return { field: createdField, workflow: postResult };
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["workflow", id] });
      const prev = qc.getQueryData<Workflow>(["workflow", id]);
      const rawType = typeof payload === "string" ? payload : payload.type;
      const targetIndex =
        typeof payload === "object" ? payload.targetIndex : undefined;
      const secId = currentSection?.id;
      const backendType = toBackendFieldType(rawType);

      if (!prev?.schema) return { prev };

      const count = (prev.schema.fields?.length ?? 0) + 1;
      const tempField: WorkflowField = {
        id: `temp-${Date.now()}`,
        key: `${backendType.toLowerCase()}_${count}`,
        label: `New ${rawType.replace(/_/g, " ").toLowerCase()}`,
        type: backendType,
        sectionId: secId,
        required: false,
        config: {},
      };

      const currentSecFields = (prev.schema.fields ?? []).filter(
        (f) => f.sectionId === secId,
      );
      const otherSecFields = (prev.schema.fields ?? []).filter(
        (f) => f.sectionId !== secId,
      );

      const newSecFields = [...currentSecFields];
      if (typeof targetIndex === "number" && targetIndex >= 0) {
        newSecFields.splice(
          Math.min(targetIndex, newSecFields.length),
          0,
          tempField,
        );
      } else {
        newSecFields.push(tempField);
      }

      qc.setQueryData<Workflow>(["workflow", id], {
        ...prev,
        schema: {
          ...prev.schema,
          fields: [...otherSecFields, ...newSecFields],
        },
      });

      setSelectedFieldId(tempField.id);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["workflow", id], context.prev);
    },
    onSuccess: (result) => {
      if (result?.workflow) {
        qc.setQueryData(["workflow", id], result.workflow);
      }
      if (result?.field?.id) {
        setSelectedFieldId(result.field.id);
      }
      invalidate();
      flashStatus("Field placed on canvas.");
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async (payload: {
      fieldId: string;
      label?: string;
      help?: string;
      required?: boolean;
      config?: WorkflowFieldConfig;
    }) => {
      const freshDraft = await api.get<Workflow>(`/workflows/${id}`);
      return api.patch<Workflow>(`/workflows/${id}/fields/${payload.fieldId}`, {
        label: payload.label,
        help: payload.help,
        required: payload.required,
        config: payload.config,
        revision: freshDraft.revision ?? 1,
      });
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["workflow", id] });
      const prev = qc.getQueryData<Workflow>(["workflow", id]);
      if (prev?.schema?.fields) {
        qc.setQueryData<Workflow>(["workflow", id], {
          ...prev,
          schema: {
            ...prev.schema,
            fields: prev.schema.fields.map((f) =>
              f.id === payload.fieldId
                ? {
                    ...f,
                    label: payload.label ?? f.label,
                    help: payload.help ?? f.help,
                    required: payload.required ?? f.required,
                    config: payload.config ?? f.config,
                  }
                : f,
            ),
          },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["workflow", id], context.prev);
    },
    onSuccess: (updated) => {
      if (updated) qc.setQueryData(["workflow", id], updated);
      invalidate();
      flashStatus("Field updated.", 2000);
    },
  });

  const removeFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const freshDraft = await api.get<Workflow>(`/workflows/${id}`);
      return api.delete<Workflow>(`/workflows/${id}/fields/${fieldId}`, {
        revision: freshDraft.revision ?? 1,
      });
    },
    onMutate: async (fieldId) => {
      await qc.cancelQueries({ queryKey: ["workflow", id] });
      const prev = qc.getQueryData<Workflow>(["workflow", id]);
      if (prev?.schema?.fields) {
        qc.setQueryData<Workflow>(["workflow", id], {
          ...prev,
          schema: {
            ...prev.schema,
            fields: prev.schema.fields.filter((f) => f.id !== fieldId),
          },
        });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["workflow", id], context.prev);
    },
    onSuccess: (updated) => {
      if (updated) qc.setQueryData(["workflow", id], updated);
      invalidate();
      setSelectedFieldId(null);
    },
  });

  const moveField = (fieldId: string, direction: -1 | 1) => {
    if (!currentSection) return;
    const sectionFields = schema.fields.filter(
      (f) => f.sectionId === currentSection.id,
    );
    const currentIndex = sectionFields.findIndex((f) => f.id === fieldId);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= sectionFields.length) return;

    const newOrder = arrayMove(sectionFields, currentIndex, nextIndex).map(
      (f) => f.id,
    );
    reorderMutation.mutate({ fieldOrder: { [currentSection.id]: newOrder } });
  };

  const publishMutation = useMutation({
    mutationFn: async (notes: string) => {
      const freshDraft = await api.get<Workflow>(`/workflows/${id}`);
      return api.post<Workflow>(
        `/workflows/${id}/publish`,
        {
          revision: freshDraft.revision ?? 1,
          notes: notes || "Published via visual studio",
        },
        crypto.randomUUID(),
      );
    },
    onSuccess: () => {
      invalidate();
      flashStatus(
        "Workflow successfully published and active for field dispatch.",
      );
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current as
      | { source?: string; fieldType?: string; label?: string }
      | undefined;
    setActiveDragItem({
      id: String(active.id),
      source: activeData?.source ?? "unknown",
      fieldType: activeData?.fieldType,
      label: activeData?.label,
    });
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as
      | { source?: string; fieldType?: string }
      | undefined;

    const overData = over.data.current as
      | { source?: string; targetIndex?: number }
      | undefined;

    // Palette item dropped onto canvas slot or card
    if (activeData?.source === "palette" && activeData.fieldType) {
      let targetIndex: number | undefined = undefined;

      if (typeof overData?.targetIndex === "number") {
        targetIndex = overData.targetIndex;
      } else if (
        currentSection &&
        over.id &&
        over.id !== "field-canvas-dropzone"
      ) {
        const sectionFields = schema.fields.filter(
          (f) => f.sectionId === currentSection.id,
        );
        const dropIndex = sectionFields.findIndex((f) => f.id === over.id);
        if (dropIndex !== -1) {
          targetIndex = dropIndex;
        }
      }
      addFieldMutation.mutate({ type: activeData.fieldType, targetIndex });
      return;
    }

    if (active.id === over.id) return;

    // Section reordering
    if (schema.sections.some((s) => s.id === active.id)) {
      const oldIndex = schema.sections.findIndex((s) => s.id === active.id);
      const newIndex = schema.sections.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(schema.sections, oldIndex, newIndex).map(
        (s) => s.id,
      );
      reorderMutation.mutate({ sectionOrder: newOrder });
      return;
    }

    // Existing Field card reordering
    if (!currentSection) return;
    const sectionFields = schema.fields.filter(
      (f) => f.sectionId === currentSection.id,
    );
    const oldIndex = sectionFields.findIndex((f) => f.id === active.id);
    const newIndex = sectionFields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(sectionFields, oldIndex, newIndex).map(
      (f) => f.id,
    );
    reorderMutation.mutate({ fieldOrder: { [currentSection.id]: newOrder } });
  };

  return {
    id,
    workflow,
    schema,
    isLoading,
    error: error as unknown as ApiError | null,
    refetch,
    currentSection,
    selectedSectionId,
    setSelectedSectionId,
    selectedField,
    selectedFieldId,
    setSelectedFieldId,
    statusMessage,
    activeDragItem,
    dndSensors,
    addSectionMutation,
    removeSectionMutation,
    addFieldMutation,
    updateFieldMutation,
    removeFieldMutation,
    reorderMutation,
    moveField,
    publishMutation,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
    customCollisionDetection,
  };
}
