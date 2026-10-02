import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

const schema = z.object({
  customerId: z.string().uuid("Client is required"),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  siteType: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  latitude: z.coerce.number().min(6).max(38).optional().or(z.literal("")),
  longitude: z.coerce.number().min(68).max(98).optional().or(z.literal("")),
  serviceZone: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  operatingHours: z.string().optional(),
  accessNotes: z.string().optional(),
  parkingNotes: z.string().optional(),
  safetyNotes: z.string().optional(),
});
type Values = z.infer<typeof schema>;
interface Customer {
  id: string;
  name: string;
}
interface Detail
  extends Omit<
    Values,
    "addressLine1" | "addressLine2" | "latitude" | "longitude"
  > {
  id: string;
  address?: { line1?: string; line2?: string };
  gps?: { lat: number; lng: number };
  revision: number;
  archived: boolean;
}
export function SiteForm({
  siteId,
  onDone,
}: {
  siteId?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const prefilled = useRef(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: customers } = useQuery({
    queryKey: ["customers", "for-site-form"],
    queryFn: () => api.get<{ items: Customer[] }>("/customers?limit=100"),
  });
  const { data: existing } = useQuery({
    queryKey: ["site", siteId],
    queryFn: () => api.get<Detail>(`/sites/${siteId}`),
    enabled: Boolean(siteId),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: "India",
      timezone: "Asia/Kolkata",
      siteType: "CUSTOMER_SITE",
    },
  });
  useEffect(() => {
    if (!existing || prefilled.current) return;
    prefilled.current = true;
    reset({
      ...existing,
      addressLine1: existing.address?.line1 ?? "",
      addressLine2: existing.address?.line2 ?? "",
      latitude: existing.gps?.lat ?? "",
      longitude: existing.gps?.lng ?? "",
    });
  }, [existing, reset]);
  const save = useMutation({
    mutationFn: (form: Values) => {
      const { addressLine1, addressLine2, latitude, longitude, ...fields } =
        form;
      const payload = {
        ...fields,
        address: {
          line1: addressLine1 || undefined,
          line2: addressLine2 || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          postalCode: form.postalCode || undefined,
          country: form.country || "India",
        },
        gps:
          latitude !== "" && longitude !== ""
            ? { lat: Number(latitude), lng: Number(longitude) }
            : undefined,
      };
      return siteId
        ? api.patch(`/sites/${siteId}`, {
            ...payload,
            revision: existing?.revision,
          })
        : api.post("/sites", payload, crypto.randomUUID());
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sites"] });
      onDone();
    },
    onError: (error) => setServerError((error as Error).message),
  });
  const archive = useMutation({
    mutationFn: () =>
      api.patch(`/sites/${siteId}`, {
        archived: true,
        revision: existing?.revision,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sites"] });
      onDone();
    },
  });
  return (
    <form
      className="fb-card fb-register-form"
      role="dialog"
      aria-label={siteId ? "Edit location" : "New location"}
      onSubmit={(event) =>
        void handleSubmit((form) => save.mutate(form))(event)
      }
    >
      <div className="fb-register-form__heading">
        <div>
          <span className="fb-register-kicker">Dispatch location</span>
          <h2>{siteId ? "Edit location" : "Add location"}</h2>
        </div>
        <button type="button" className="fb-btn fb-btn--ghost" onClick={onDone}>
          Close
        </button>
      </div>
      <fieldset>
        <legend>Location identity</legend>
        <div className="fb-register-form-grid">
          <label>
            Client *
            <select className="fb-select" {...register("customerId")}>
              <option value="">Select client…</option>
              {customers?.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <small>{errors.customerId?.message}</small>
          </label>
          <label>
            Location name *<input className="fb-input" {...register("name")} />
            <small>{errors.name?.message}</small>
          </label>
          <label>
            Code *<input className="fb-input" {...register("code")} />
            <small>{errors.code?.message}</small>
          </label>
          <label>
            Type
            <select className="fb-select" {...register("siteType")}>
              <option>CUSTOMER_SITE</option>
              <option>BRANCH</option>
              <option>WAREHOUSE</option>
              <option>OFFICE</option>
              <option>PUBLIC_SITE</option>
            </select>
          </label>
          <label>
            Service zone
            <input className="fb-input" {...register("serviceZone")} />
          </label>
          <label>
            Operating hours
            <input
              className="fb-input"
              placeholder="Mon–Sat · 08:00–18:00"
              {...register("operatingHours")}
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Address & map position</legend>
        <div className="fb-register-form-grid">
          <label className="fb-register-form-span">
            Address line 1
            <input className="fb-input" {...register("addressLine1")} />
          </label>
          <label className="fb-register-form-span">
            Address line 2
            <input className="fb-input" {...register("addressLine2")} />
          </label>
          <label>
            City
            <input className="fb-input" {...register("city")} />
          </label>
          <label>
            State
            <input className="fb-input" {...register("state")} />
          </label>
          <label>
            PIN code
            <input className="fb-input" {...register("postalCode")} />
          </label>
          <label>
            Country
            <input className="fb-input" {...register("country")} />
          </label>
          <label>
            Latitude
            <input
              type="number"
              step="any"
              className="fb-input"
              {...register("latitude")}
            />
            <small>{errors.latitude?.message}</small>
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="any"
              className="fb-input"
              {...register("longitude")}
            />
            <small>{errors.longitude?.message}</small>
          </label>
          <label>
            Timezone
            <input className="fb-input" {...register("timezone")} />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>On-site contact & field guidance</legend>
        <div className="fb-register-form-grid">
          <label>
            Contact name
            <input className="fb-input" {...register("contactName")} />
          </label>
          <label>
            Contact phone
            <input className="fb-input" {...register("contactPhone")} />
          </label>
          <label>
            Contact email
            <input
              type="email"
              className="fb-input"
              {...register("contactEmail")}
            />
          </label>
          <label>
            Access notes
            <textarea
              rows={2}
              className="fb-textarea"
              {...register("accessNotes")}
            />
          </label>
          <label>
            Parking notes
            <textarea
              rows={2}
              className="fb-textarea"
              {...register("parkingNotes")}
            />
          </label>
          <label>
            Safety notes
            <textarea
              rows={2}
              className="fb-textarea"
              {...register("safetyNotes")}
            />
          </label>
        </div>
      </fieldset>
      {serverError ? <div className="fb-error">{serverError}</div> : null}
      <div className="fb-page-actions">
        <button className="fb-btn fb-btn--primary" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save location"}
        </button>
        {siteId ? (
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
