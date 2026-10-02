import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
const schema = z.object({
  siteId: z.string().uuid("Location is required"),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  equipmentType: z.string().optional(),
  assetCategory: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
  criticality: z.string().optional(),
  assetStatus: z.string().optional(),
  installationDate: z.string().optional(),
  warrantyEnd: z.string().optional(),
  serviceFrequencyDays: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .or(z.literal("")),
  nextDue: z.string().optional(),
  warrantyProvider: z.string().optional(),
  coverageNotes: z.string().optional(),
});
type Values = z.infer<typeof schema>;
interface Site {
  id: string;
  name: string;
}
interface Detail extends Omit<Values, "warrantyProvider" | "coverageNotes"> {
  id: string;
  warranty?: { provider?: string };
  coverage?: { notes?: string };
  revision: number;
  archived: boolean;
}
export function ServiceTargetForm({
  targetId,
  onDone,
}: {
  targetId?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const prefilled = useRef(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: sites } = useQuery({
    queryKey: ["sites", "for-target-form"],
    queryFn: () => api.get<{ items: Site[] }>("/sites?limit=100"),
  });
  const { data: existing } = useQuery({
    queryKey: ["service-target", targetId],
    queryFn: () => api.get<Detail>(`/service-targets/${targetId}`),
    enabled: Boolean(targetId),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetStatus: "ACTIVE",
      criticality: "MEDIUM",
      condition: "GOOD",
    },
  });
  useEffect(() => {
    if (!existing || prefilled.current) return;
    prefilled.current = true;
    reset({
      ...existing,
      installationDate: existing.installationDate?.slice(0, 10) ?? "",
      warrantyEnd: existing.warrantyEnd?.slice(0, 10) ?? "",
      nextDue: existing.nextDue?.slice(0, 10) ?? "",
      warrantyProvider: existing.warranty?.provider ?? "",
      coverageNotes: existing.coverage?.notes ?? "",
    });
  }, [existing, reset]);
  const save = useMutation({
    mutationFn: (form: Values) => {
      const { warrantyProvider, coverageNotes, ...fields } = form;
      const payload = {
        ...fields,
        serviceFrequencyDays:
          form.serviceFrequencyDays === ""
            ? undefined
            : Number(form.serviceFrequencyDays),
        warranty: warrantyProvider
          ? {
              provider: warrantyProvider,
              expiresOn: form.warrantyEnd || undefined,
            }
          : undefined,
        coverage: coverageNotes ? { notes: coverageNotes } : undefined,
      };
      return targetId
        ? api.patch(`/service-targets/${targetId}`, {
            ...payload,
            revision: existing?.revision,
          })
        : api.post("/service-targets", payload, crypto.randomUUID());
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["service-targets"] });
      onDone();
    },
    onError: (error) => setServerError((error as Error).message),
  });
  const archive = useMutation({
    mutationFn: () =>
      api.patch(`/service-targets/${targetId}`, {
        archived: true,
        revision: existing?.revision,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["service-targets"] });
      onDone();
    },
  });
  return (
    <form
      className="fb-card fb-register-form"
      role="dialog"
      aria-label={targetId ? "Edit asset" : "New asset"}
      onSubmit={(event) =>
        void handleSubmit((form) => save.mutate(form))(event)
      }
    >
      <div className="fb-register-form__heading">
        <div>
          <span className="fb-register-kicker">Maintainable inventory</span>
          <h2>
            {targetId
              ? "Edit asset or service point"
              : "Add asset or service point"}
          </h2>
        </div>
        <button type="button" className="fb-btn fb-btn--ghost" onClick={onDone}>
          Close
        </button>
      </div>
      <fieldset>
        <legend>Asset identity</legend>
        <div className="fb-register-form-grid">
          <label>
            Location *
            <select className="fb-select" {...register("siteId")}>
              <option value="">Select location…</option>
              {sites?.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <small>{errors.siteId?.message}</small>
          </label>
          <label>
            Name *<input className="fb-input" {...register("name")} />
            <small>{errors.name?.message}</small>
          </label>
          <label>
            Asset code *<input className="fb-input" {...register("code")} />
            <small>{errors.code?.message}</small>
          </label>
          <label>
            Equipment type
            <input className="fb-input" {...register("equipmentType")} />
          </label>
          <label>
            Category
            <input className="fb-input" {...register("assetCategory")} />
          </label>
          <label>
            Installed at
            <input
              className="fb-input"
              placeholder="Plant room / Level 4 / Zone B"
              {...register("location")}
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Make, model & lifecycle</legend>
        <div className="fb-register-form-grid">
          <label>
            Manufacturer
            <input className="fb-input" {...register("manufacturer")} />
          </label>
          <label>
            Model
            <input className="fb-input" {...register("model")} />
          </label>
          <label>
            Serial number
            <input className="fb-input" {...register("serialNumber")} />
          </label>
          <label>
            Installation date
            <input
              type="date"
              className="fb-input"
              {...register("installationDate")}
            />
          </label>
          <label>
            Warranty end
            <input
              type="date"
              className="fb-input"
              {...register("warrantyEnd")}
            />
          </label>
          <label>
            Warranty provider
            <input className="fb-input" {...register("warrantyProvider")} />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Service configuration</legend>
        <div className="fb-register-form-grid">
          <label>
            Status
            <select className="fb-select" {...register("assetStatus")}>
              <option>ACTIVE</option>
              <option>OUT_OF_SERVICE</option>
              <option>RETIRED</option>
            </select>
          </label>
          <label>
            Condition
            <select className="fb-select" {...register("condition")}>
              <option>GOOD</option>
              <option>FAIR</option>
              <option>POOR</option>
              <option>CRITICAL</option>
            </select>
          </label>
          <label>
            Criticality
            <select className="fb-select" {...register("criticality")}>
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>CRITICAL</option>
            </select>
          </label>
          <label>
            Service every (days)
            <input
              type="number"
              className="fb-input"
              {...register("serviceFrequencyDays")}
            />
            <small>{errors.serviceFrequencyDays?.message}</small>
          </label>
          <label>
            Next service due
            <input type="date" className="fb-input" {...register("nextDue")} />
          </label>
          <label className="fb-register-form-span">
            Coverage notes
            <textarea
              rows={2}
              className="fb-textarea"
              {...register("coverageNotes")}
            />
          </label>
        </div>
      </fieldset>
      {serverError ? <div className="fb-error">{serverError}</div> : null}
      <div className="fb-page-actions">
        <button className="fb-btn fb-btn--primary" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save asset"}
        </button>
        {targetId ? (
          <button
            type="button"
            className="fb-btn fb-btn--ghost"
            onClick={() => archive.mutate()}
          >
            Archive
          </button>
        ) : null}
      </div>
    </form>
  );
}
