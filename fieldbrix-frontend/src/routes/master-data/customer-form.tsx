import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  contactName: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  instructions: z.string().optional(),
  address: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerDetail {
  id: string;
  name: string;
  code: string;
  contactName?: string;
  email?: string;
  phone?: string;
  instructions?: string;
  address?: Record<string, unknown>;
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
    queryFn: () => api.get<CustomerDetail>(`/customers/${customerId}`),
    enabled: Boolean(customerId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    if (!customerId || prefilled.current || !existing) return;
    prefilled.current = true;
    reset({
      name: existing.name,
      code: existing.code,
      contactName: existing.contactName ?? "",
      email: existing.email ?? "",
      phone: existing.phone ?? "",
      instructions: existing.instructions ?? "",
      address: existing.address ? JSON.stringify(existing.address) : "",
    });
  }, [existing, customerId, reset]);

  const saveMutation = useMutation({
    mutationFn: (form: CustomerFormValues) => {
      let address: unknown;
      if (form.address?.trim()) {
        try {
          address = JSON.parse(form.address);
        } catch {
          throw new Error("Address must be valid JSON");
        }
      }
      const payload = {
        name: form.name,
        code: form.code,
        contactName: form.contactName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        instructions: form.instructions || undefined,
        address,
      };
      return customerId
        ? api.patch(`/customers/${customerId}`, {
            ...payload,
            revision: existing?.revision,
          })
        : api.post("/customers", payload, crypto.randomUUID());
    },
    onSuccess: async () => {
      setServerError(null);
      await qc.invalidateQueries({ queryKey: ["customers"] });
      if (customerId)
        await qc.invalidateQueries({ queryKey: ["customer", customerId] });
      onDone();
    },
    onError: (err) => {
      setServerError(
        (err as { message?: string }).message ?? "Unable to save customer",
      );
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/customers/${customerId}`, {
        archived: !existing?.archived,
        revision: existing?.revision,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["customers"] });
      onDone();
    },
  });

  return (
    <form
      className="fb-card"
      role="dialog"
      aria-label={customerId ? "Edit customer" : "New customer"}
      onSubmit={(e) =>
        void handleSubmit((form) => saveMutation.mutate(form))(e)
      }
    >
      <h2 className="fb-card-title">
        {customerId ? "Edit customer" : "New customer"}
      </h2>

      <div className="fb-form-row">
        <label htmlFor="customer-name" className="fb-label">
          Name
        </label>
        <input id="customer-name" className="fb-input" {...register("name")} />
        {errors.name && (
          <span className="fb-field-error">{errors.name.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="customer-code" className="fb-label">
          Code
        </label>
        <input id="customer-code" className="fb-input" {...register("code")} />
        {errors.code && (
          <span className="fb-field-error">{errors.code.message}</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="customer-contact" className="fb-label">
          Contact name
        </label>
        <input
          id="customer-contact"
          className="fb-input"
          {...register("contactName")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="customer-email" className="fb-label">
          Email
        </label>
        <input
          id="customer-email"
          type="email"
          className="fb-input"
          {...register("email")}
        />
        {errors.email && (
          <span className="fb-field-error">Enter a valid email</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="customer-phone" className="fb-label">
          Phone
        </label>
        <input id="customer-phone" className="fb-input" {...register("phone")} />
      </div>

      <div className="fb-form-row">
        <label htmlFor="customer-instructions" className="fb-label">
          Instructions
        </label>
        <textarea
          id="customer-instructions"
          className="fb-textarea"
          rows={3}
          {...register("instructions")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="customer-address" className="fb-label">
          Address (JSON, optional)
        </label>
        <textarea
          id="customer-address"
          className="fb-textarea"
          rows={2}
          placeholder='{"line1":"...","city":"..."}'
          {...register("address")}
        />
      </div>

      {serverError && <div className="fb-error">{serverError}</div>}

      <div className="fb-page-actions">
        <button
          id="customer-save"
          type="submit"
          className="fb-btn fb-btn--primary"
          disabled={isSubmitting || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? "Saving…"
            : customerId
              ? "Save changes"
              : "Create customer"}
        </button>
        <button
          type="button"
          className="fb-btn fb-btn--ghost"
          onClick={onDone}
        >
          Cancel
        </button>
        {customerId && (
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
