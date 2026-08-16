import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

const partSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  unit: z.string().min(1, "Unit is required"),
  compatibility: z.string().optional(),
  active: z.boolean(),
});

type PartFormValues = z.infer<typeof partSchema>;

interface PartDetail {
  id: string;
  name: string;
  code: string;
  unit: string;
  compatibility?: string[];
  active: boolean;
  revision: number;
  archived: boolean;
}

export function PartForm({
  partId,
  onDone,
}: {
  partId?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const prefilled = useRef(false);

  const { data: existing } = useQuery({
    queryKey: ["part", partId],
    queryFn: () => api.get<PartDetail>(`/parts/${partId}`),
    enabled: Boolean(partId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: { active: true },
  });

  useEffect(() => {
    if (!partId || prefilled.current || !existing) return;
    prefilled.current = true;
    reset({
      name: existing.name,
      code: existing.code,
      unit: existing.unit,
      compatibility: (existing.compatibility ?? []).join(", "),
      active: existing.active,
    });
  }, [existing, partId, reset]);

  const saveMutation = useMutation({
    mutationFn: (form: PartFormValues) => {
      const payload = {
        name: form.name,
        code: form.code,
        unit: form.unit,
        compatibility: form.compatibility
          ? form.compatibility
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : undefined,
        active: form.active,
      };
      return partId
        ? api.patch(`/parts/${partId}`, {
            ...payload,
            revision: existing?.revision,
          })
        : api.post("/parts", payload, crypto.randomUUID());
    },
    onSuccess: async () => {
      setServerError(null);
      await qc.invalidateQueries({ queryKey: ["parts"] });
      if (partId) await qc.invalidateQueries({ queryKey: ["part", partId] });
      onDone();
    },
    onError: (err) => {
      setServerError(
        (err as { message?: string }).message ?? "Unable to save part",
      );
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/parts/${partId}`, {
        archived: !existing?.archived,
        revision: existing?.revision,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["parts"] });
      onDone();
    },
  });

  return (
    <form
      className="fb-card"
      role="dialog"
      aria-label={partId ? "Edit part" : "New part"}
      onSubmit={(e) =>
        void handleSubmit((form) => saveMutation.mutate(form))(e)
      }
    >
      <h2 className="fb-card-title">{partId ? "Edit part" : "New part"}</h2>

      <div className="fb-form-row">
        <label htmlFor="part-name" className="fb-label">
          Name
        </label>
        <input id="part-name" className="fb-input" {...register("name")} />
        {errors.name && (
          <span className="fb-field-error">{errors.name.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="part-code" className="fb-label">
          Code
        </label>
        <input id="part-code" className="fb-input" {...register("code")} />
        {errors.code && (
          <span className="fb-field-error">{errors.code.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="part-unit" className="fb-label">
          Unit
        </label>
        <input id="part-unit" className="fb-input" {...register("unit")} />
        {errors.unit && (
          <span className="fb-field-error">{errors.unit.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="part-compatibility" className="fb-label">
          Compatibility (comma-separated, optional)
        </label>
        <input
          id="part-compatibility"
          className="fb-input"
          placeholder="HVAC-100, HVAC-200"
          {...register("compatibility")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="part-active" className="fb-checkbox-row">
          <input
            id="part-active"
            type="checkbox"
            {...register("active")}
          />
          Active
        </label>
      </div>

      {serverError && <div className="fb-error">{serverError}</div>}

      <div className="fb-page-actions">
        <button
          id="part-save"
          type="submit"
          className="fb-btn fb-btn--primary"
          disabled={isSubmitting || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? "Saving…"
            : partId
              ? "Save changes"
              : "Create part"}
        </button>
        <button type="button" className="fb-btn fb-btn--ghost" onClick={onDone}>
          Cancel
        </button>
        {partId && (
          <button
            type="button"
            className="fb-btn fb-btn--ghost"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
          >
            {existing?.archived ? "Restore" : "Archive"}
          </button>
        )}
      </div>
    </form>
  );
}
