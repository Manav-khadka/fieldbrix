import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

const siteSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  accessNotes: z.string().optional(),
  parkingNotes: z.string().optional(),
  safetyNotes: z.string().optional(),
  address: z.string().optional(),
  hours: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type SiteFormValues = z.infer<typeof siteSchema>;

interface Customer {
  id: string;
  name: string;
}

interface SiteDetail {
  id: string;
  customerId: string;
  name: string;
  code: string;
  accessNotes?: string;
  parkingNotes?: string;
  safetyNotes?: string;
  address?: Record<string, unknown>;
  hours?: Record<string, unknown>;
  gps?: { lat: number; lng: number };
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

export function SiteForm({
  siteId,
  onDone,
}: {
  siteId?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const prefilled = useRef(false);

  const { data: customers } = useQuery({
    queryKey: ["customers", "for-site-form"],
    queryFn: () => api.get<{ items: Customer[] }>("/customers?limit=100"),
  });

  const { data: existing } = useQuery({
    queryKey: ["site", siteId],
    queryFn: () => api.get<SiteDetail>(`/sites/${siteId}`),
    enabled: Boolean(siteId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SiteFormValues>({ resolver: zodResolver(siteSchema) });

  useEffect(() => {
    if (!siteId || prefilled.current || !existing) return;
    prefilled.current = true;
    reset({
      customerId: existing.customerId,
      name: existing.name,
      code: existing.code,
      accessNotes: existing.accessNotes ?? "",
      parkingNotes: existing.parkingNotes ?? "",
      safetyNotes: existing.safetyNotes ?? "",
      address: existing.address ? JSON.stringify(existing.address) : "",
      hours: existing.hours ? JSON.stringify(existing.hours) : "",
      latitude: existing.gps ? String(existing.gps.lat) : "",
      longitude: existing.gps ? String(existing.gps.lng) : "",
    });
  }, [existing, siteId, reset]);

  const saveMutation = useMutation({
    mutationFn: (form: SiteFormValues) => {
      const address = parseJsonField("Address", form.address);
      const hours = parseJsonField("Hours", form.hours);
      const gps =
        form.latitude && form.longitude
          ? { lat: Number(form.latitude), lng: Number(form.longitude) }
          : undefined;
      const payload = {
        customerId: form.customerId,
        name: form.name,
        code: form.code,
        accessNotes: form.accessNotes || undefined,
        parkingNotes: form.parkingNotes || undefined,
        safetyNotes: form.safetyNotes || undefined,
        address,
        hours,
        gps,
      };
      return siteId
        ? api.patch(`/sites/${siteId}`, {
            ...payload,
            revision: existing?.revision,
          })
        : api.post("/sites", payload, crypto.randomUUID());
    },
    onSuccess: async () => {
      setServerError(null);
      await qc.invalidateQueries({ queryKey: ["sites"] });
      if (siteId) await qc.invalidateQueries({ queryKey: ["site", siteId] });
      onDone();
    },
    onError: (err) => {
      setServerError(
        (err as { message?: string }).message ?? "Unable to save site",
      );
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/sites/${siteId}`, {
        archived: !existing?.archived,
        revision: existing?.revision,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sites"] });
      onDone();
    },
  });

  return (
    <form
      className="fb-card"
      role="dialog"
      aria-label={siteId ? "Edit site" : "New site"}
      onSubmit={(e) =>
        void handleSubmit((form) => saveMutation.mutate(form))(e)
      }
    >
      <h2 className="fb-card-title">{siteId ? "Edit site" : "New site"}</h2>

      <div className="fb-form-row">
        <label htmlFor="site-customer" className="fb-label">
          Customer
        </label>
        <select
          id="site-customer"
          className="fb-select"
          {...register("customerId")}
        >
          <option value="">Select a customer…</option>
          {customers?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.customerId && (
          <span className="fb-field-error">{errors.customerId.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="site-name" className="fb-label">
          Name
        </label>
        <input id="site-name" className="fb-input" {...register("name")} />
        {errors.name && (
          <span className="fb-field-error">{errors.name.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="site-code" className="fb-label">
          Code
        </label>
        <input id="site-code" className="fb-input" {...register("code")} />
        {errors.code && (
          <span className="fb-field-error">{errors.code.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="site-lat" className="fb-label">
          GPS latitude
        </label>
        <input id="site-lat" className="fb-input" {...register("latitude")} />
      </div>
      <div className="fb-form-row">
        <label htmlFor="site-lng" className="fb-label">
          GPS longitude
        </label>
        <input id="site-lng" className="fb-input" {...register("longitude")} />
      </div>

      <div className="fb-form-row">
        <label htmlFor="site-access" className="fb-label">
          Access notes
        </label>
        <textarea
          id="site-access"
          className="fb-textarea"
          rows={2}
          {...register("accessNotes")}
        />
      </div>
      <div className="fb-form-row">
        <label htmlFor="site-parking" className="fb-label">
          Parking notes
        </label>
        <textarea
          id="site-parking"
          className="fb-textarea"
          rows={2}
          {...register("parkingNotes")}
        />
      </div>
      <div className="fb-form-row">
        <label htmlFor="site-safety" className="fb-label">
          Safety notes
        </label>
        <textarea
          id="site-safety"
          className="fb-textarea"
          rows={2}
          {...register("safetyNotes")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="site-address" className="fb-label">
          Address (JSON, optional)
        </label>
        <textarea
          id="site-address"
          className="fb-textarea"
          rows={2}
          placeholder='{"line1":"...","city":"..."}'
          {...register("address")}
        />
      </div>
      <div className="fb-form-row">
        <label htmlFor="site-hours" className="fb-label">
          Working hours (JSON, optional)
        </label>
        <textarea
          id="site-hours"
          className="fb-textarea"
          rows={2}
          placeholder='{"sun":"08:00-17:00"}'
          {...register("hours")}
        />
      </div>

      {serverError && <div className="fb-error">{serverError}</div>}

      <div className="fb-page-actions">
        <button
          id="site-save"
          type="submit"
          className="fb-btn fb-btn--primary"
          disabled={isSubmitting || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? "Saving…"
            : siteId
              ? "Save changes"
              : "Create site"}
        </button>
        <button type="button" className="fb-btn fb-btn--ghost" onClick={onDone}>
          Cancel
        </button>
        {siteId && (
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
