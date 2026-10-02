import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  legalName: z.string().optional(),
  industry: z.string().optional(),
  taxId: z.string().optional(),
  serviceTier: z.string().optional(),
  contactName: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  accountManager: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  instructions: z.string().optional(),
});
type Values = z.infer<typeof schema>;
interface Detail extends Omit<Values, "addressLine1" | "addressLine2"> {
  id: string;
  address?: { line1?: string; line2?: string };
  revision: number;
  archived: boolean;
}

export function CustomerForm({
  customerId,
  onDone,
}: {
  customerId?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const prefilled = useRef(false);
  const { data: existing } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => api.get<Detail>(`/customers/${customerId}`),
    enabled: Boolean(customerId),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { country: "India", serviceTier: "STANDARD" },
  });
  useEffect(() => {
    if (!existing || prefilled.current) return;
    prefilled.current = true;
    reset({
      ...existing,
      addressLine1: existing.address?.line1 ?? "",
      addressLine2: existing.address?.line2 ?? "",
      contractStart: existing.contractStart?.slice(0, 10) ?? "",
      contractEnd: existing.contractEnd?.slice(0, 10) ?? "",
    });
  }, [existing, reset]);
  const save = useMutation({
    mutationFn: (form: Values) => {
      const { addressLine1, addressLine2, ...fields } = form;
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
      };
      return customerId
        ? api.patch(`/customers/${customerId}`, {
            ...payload,
            revision: existing?.revision,
          })
        : api.post("/customers", payload, crypto.randomUUID());
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["customers"] });
      onDone();
    },
    onError: (error) => setServerError((error as Error).message),
  });
  const archive = useMutation({
    mutationFn: () =>
      api.patch(`/customers/${customerId}`, {
        archived: true,
        revision: existing?.revision,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["customers"] });
      onDone();
    },
  });
  return (
    <form
      className="fb-card fb-register-form"
      role="dialog"
      aria-label={customerId ? "Edit client" : "New client"}
      onSubmit={(event) =>
        void handleSubmit((form) => save.mutate(form))(event)
      }
    >
      <div className="fb-register-form__heading">
        <div>
          <span className="fb-register-kicker">Client profile</span>
          <h2>{customerId ? "Edit client" : "Add client"}</h2>
        </div>
        <button type="button" className="fb-btn fb-btn--ghost" onClick={onDone}>
          Close
        </button>
      </div>
      <fieldset>
        <legend>Account identity</legend>
        <div className="fb-register-form-grid">
          <label>
            Display name *<input className="fb-input" {...register("name")} />
            <small>{errors.name?.message}</small>
          </label>
          <label>
            Client code *<input className="fb-input" {...register("code")} />
            <small>{errors.code?.message}</small>
          </label>
          <label>
            Legal name
            <input className="fb-input" {...register("legalName")} />
          </label>
          <label>
            Industry
            <input
              className="fb-input"
              placeholder="Facilities, telecom, utilities…"
              {...register("industry")}
            />
          </label>
          <label>
            GST / Tax ID
            <input className="fb-input" {...register("taxId")} />
          </label>
          <label>
            Service tier
            <select className="fb-select" {...register("serviceTier")}>
              <option>STANDARD</option>
              <option>PREMIUM</option>
              <option>ENTERPRISE</option>
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Contacts & ownership</legend>
        <div className="fb-register-form-grid">
          <label>
            Primary contact
            <input className="fb-input" {...register("contactName")} />
          </label>
          <label>
            Email
            <input className="fb-input" type="email" {...register("email")} />
            <small>{errors.email?.message}</small>
          </label>
          <label>
            Phone
            <input className="fb-input" {...register("phone")} />
          </label>
          <label>
            Alternate phone
            <input className="fb-input" {...register("alternatePhone")} />
          </label>
          <label>
            Account manager
            <input className="fb-input" {...register("accountManager")} />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Registered address</legend>
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
        </div>
      </fieldset>
      <fieldset>
        <legend>Contract & field instructions</legend>
        <div className="fb-register-form-grid">
          <label>
            Contract start
            <input
              type="date"
              className="fb-input"
              {...register("contractStart")}
            />
          </label>
          <label>
            Contract end
            <input
              type="date"
              className="fb-input"
              {...register("contractEnd")}
            />
          </label>
          <label className="fb-register-form-span">
            Instructions
            <textarea
              rows={3}
              className="fb-textarea"
              {...register("instructions")}
            />
          </label>
        </div>
      </fieldset>
      {serverError ? <div className="fb-error">{serverError}</div> : null}
      <div className="fb-page-actions">
        <button className="fb-btn fb-btn--primary" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save client"}
        </button>
        {customerId ? (
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
