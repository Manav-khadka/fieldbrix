import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

const targetSchema = z.object({
  siteId: z.string().uuid("Site is required"),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  equipmentType: z.string().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
  nextDue: z.string().optional(),
  warranty: z.string().optional(),
  coverage: z.string().optional(),
});

type TargetFormValues = z.infer<typeof targetSchema>;

interface Site {
  id: string;
  name: string;
}

interface ServiceTargetDetail {
  id: string;
  siteId: string;
  name: string;
  code: string;
  equipmentType?: string;
  location?: string;
  condition?: string;
  nextDue?: string;
  warranty?: Record<string, unknown>;
  coverage?: Record<string, unknown>;
  revision: number;
  archived: boolean;
}

function parseJsonField(label: string, value?: string): unknown {
  if (!value?.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

export function ServiceTargetForm({
  targetId,
  onDone,
}: {
  targetId?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const prefilled = useRef(false);

  const { data: sites } = useQuery({
    queryKey: ["sites", "for-target-form"],
    queryFn: () => api.get<{ items: Site[] }>("/sites?limit=100"),
  });

  const { data: existing } = useQuery({
    queryKey: ["service-target", targetId],
    queryFn: () => api.get<ServiceTargetDetail>(`/service-targets/${targetId}`),
    enabled: Boolean(targetId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TargetFormValues>({ resolver: zodResolver(targetSchema) });

  useEffect(() => {
    if (!targetId || prefilled.current || !existing) return;
    prefilled.current = true;
    reset({
      siteId: existing.siteId,
      name: existing.name,
      code: existing.code,
      equipmentType: existing.equipmentType ?? "",
      location: existing.location ?? "",
      condition: existing.condition ?? "",
      nextDue: existing.nextDue ? existing.nextDue.slice(0, 10) : "",
      warranty: existing.warranty ? JSON.stringify(existing.warranty) : "",
      coverage: existing.coverage ? JSON.stringify(existing.coverage) : "",
    });
  }, [existing, targetId, reset]);

  const saveMutation = useMutation({
    mutationFn: (form: TargetFormValues) => {
      const warranty = parseJsonField("Warranty", form.warranty);
      const coverage = parseJsonField("Coverage", form.coverage);
      const payload = {
        siteId: form.siteId,
        name: form.name,
        code: form.code,
        equipmentType: form.equipmentType || undefined,
        location: form.location || undefined,
        condition: form.condition || undefined,
        nextDue: form.nextDue
          ? new Date(form.nextDue).toISOString()
          : undefined,
        warranty,
        coverage,
      };
      return targetId
        ? api.patch(`/service-targets/${targetId}`, {
            ...payload,
            revision: existing?.revision,
          })
        : api.post("/service-targets", payload, crypto.randomUUID());
    },
    onSuccess: async () => {
      setServerError(null);
      await qc.invalidateQueries({ queryKey: ["service-targets"] });
      if (targetId)
        await qc.invalidateQueries({ queryKey: ["service-target", targetId] });
      onDone();
    },
    onError: (err) => {
      setServerError(
        (err as { message?: string }).message ??
          "Unable to save service target",
      );
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/service-targets/${targetId}`, {
        archived: !existing?.archived,
        revision: existing?.revision,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["service-targets"] });
      onDone();
    },
  });

  return (
    <form
      className="fb-card"
      role="dialog"
      aria-label={targetId ? "Edit service target" : "New service target"}
      onSubmit={(e) =>
        void handleSubmit((form) => saveMutation.mutate(form))(e)
      }
    >
      <h2 className="fb-card-title">
        {targetId ? "Edit service target" : "New service target"}
      </h2>

      <div className="fb-form-row">
        <label htmlFor="target-site" className="fb-label">
          Site
        </label>
        <select id="target-site" className="fb-select" {...register("siteId")}>
          <option value="">Select a site…</option>
          {sites?.items.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.siteId && (
          <span className="fb-field-error">{errors.siteId.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="target-name" className="fb-label">
          Name
        </label>
        <input id="target-name" className="fb-input" {...register("name")} />
        {errors.name && (
          <span className="fb-field-error">{errors.name.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="target-code" className="fb-label">
          Code
        </label>
        <input id="target-code" className="fb-input" {...register("code")} />
        {errors.code && (
          <span className="fb-field-error">{errors.code.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="target-equipment" className="fb-label">
          Equipment type
        </label>
        <input
          id="target-equipment"
          className="fb-input"
          {...register("equipmentType")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="target-location" className="fb-label">
          Location
        </label>
        <input
          id="target-location"
          className="fb-input"
          {...register("location")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="target-condition" className="fb-label">
          Condition
        </label>
        <input
          id="target-condition"
          className="fb-input"
          {...register("condition")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="target-next-due" className="fb-label">
          Next due
        </label>
        <input
          id="target-next-due"
          type="date"
          className="fb-input"
          {...register("nextDue")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="target-warranty" className="fb-label">
          Warranty (JSON, optional)
        </label>
        <textarea
          id="target-warranty"
          className="fb-textarea"
          rows={2}
          {...register("warranty")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="target-coverage" className="fb-label">
          Coverage (JSON, optional)
        </label>
        <textarea
          id="target-coverage"
          className="fb-textarea"
          rows={2}
          {...register("coverage")}
        />
      </div>

      {serverError && <div className="fb-error">{serverError}</div>}

      <div className="fb-page-actions">
        <button
          id="target-save"
          type="submit"
          className="fb-btn fb-btn--primary"
          disabled={isSubmitting || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? "Saving…"
            : targetId
              ? "Save changes"
              : "Create service target"}
        </button>
        <button type="button" className="fb-btn fb-btn--ghost" onClick={onDone}>
          Cancel
        </button>
        {targetId && (
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
