import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

const UUID = z.string().uuid();

const createTaskSchema = z.object({
  customerId: UUID,
  siteId: UUID,
  targetId: z.union([UUID, z.literal("")]).optional(),
  workflowId: UUID,
  workType: z.string().optional(),
  description: z.string().max(1000).optional(),
  instructions: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  scheduledAt: z.string().optional(),
  dueAt: z.string().optional(),
  signatureRequired: z.boolean().optional(),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

interface Customer {
  id: string;
  name: string;
}
interface Site {
  id: string;
  name: string;
  customerId: string;
}
interface ServiceTarget {
  id: string;
  name: string;
}
interface Workflow {
  id: string;
  name: string;
  status: string;
  currentVersionId?: string;
}

export function CreateTaskForm({ onCreated }: { onCreated: () => void }) {
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { priority: "NORMAL" },
  });

  const customerId = watch("customerId");
  const siteId = watch("siteId");

  const { data: customers } = useQuery({
    queryKey: ["customers", "for-task-form"],
    queryFn: () => api.get<{ items: Customer[] }>("/customers?limit=100"),
  });
  const { data: sites } = useQuery({
    queryKey: ["sites", "for-task-form", customerId],
    queryFn: () =>
      api.get<{ items: Site[] }>(`/sites?customerId=${customerId}&limit=100`),
    enabled: Boolean(customerId),
  });
  const { data: targets } = useQuery({
    queryKey: ["service-targets", "for-task-form", siteId],
    queryFn: () =>
      api.get<{ items: ServiceTarget[] }>(
        `/service-targets?siteId=${siteId}&limit=100`,
      ),
    enabled: Boolean(siteId),
  });
  const { data: workflows } = useQuery({
    queryKey: ["workflows", "published", "for-task-form"],
    queryFn: () =>
      api.get<{ items: Workflow[] }>("/workflows?status=PUBLISHED&limit=100"),
  });

  const createMutation = useMutation({
    mutationFn: (form: CreateTaskForm) => {
      const workflow = workflows?.items.find((w) => w.id === form.workflowId);
      if (!workflow?.currentVersionId)
        throw new Error("Selected workflow has no published version");
      return api.post(
        "/tasks",
        {
          workflowVersionId: workflow.currentVersionId,
          customerId: form.customerId,
          siteId: form.siteId,
          targetId: form.targetId || undefined,
          workType: form.workType || undefined,
          description: form.description,
          instructions: form.instructions,
          priority: form.priority,
          scheduledAt: form.scheduledAt
            ? new Date(form.scheduledAt).toISOString()
            : undefined,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
          signaturePolicy: form.signatureRequired
            ? { required: true }
            : undefined,
        },
        crypto.randomUUID(),
      );
    },
    onSuccess: async () => {
      setServerError(null);
      reset({ priority: "NORMAL" });
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      onCreated();
    },
    onError: (err) => {
      setServerError(
        (err as { message?: string }).message ?? "Failed to create task",
      );
    },
  });

  const publishedWorkflows = (workflows?.items ?? []).filter(
    (w) => w.status === "PUBLISHED" && w.currentVersionId,
  );

  return (
    <form
      className="fb-card"
      onSubmit={(e) =>
        void handleSubmit((form) => createMutation.mutate(form))(e)
      }
    >
      <h2 className="fb-card-title">New task</h2>

      <div className="fb-form-row">
        <label htmlFor="task-customer" className="fb-label">
          Customer
        </label>
        <select
          id="task-customer"
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
          <span className="fb-field-error">Customer is required</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="task-site" className="fb-label">
          Site
        </label>
        <select
          id="task-site"
          className="fb-select"
          disabled={!customerId}
          {...register("siteId")}
        >
          <option value="">
            {customerId ? "Select a site…" : "Select a customer first"}
          </option>
          {sites?.items.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.siteId && (
          <span className="fb-field-error">Site is required</span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="task-target" className="fb-label">
          Service target (optional)
        </label>
        <select
          id="task-target"
          className="fb-select"
          disabled={!siteId}
          {...register("targetId")}
        >
          <option value="">No specific target</option>
          {targets?.items.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="fb-form-row">
        <label htmlFor="task-workflow" className="fb-label">
          Workflow
        </label>
        <select
          id="task-workflow"
          className="fb-select"
          {...register("workflowId")}
        >
          <option value="">Select a published workflow…</option>
          {publishedWorkflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {errors.workflowId && (
          <span className="fb-field-error">
            A published workflow is required — tasks can only pin to a published
            version
          </span>
        )}
        {publishedWorkflows.length === 0 && (
          <span className="fb-hint">
            No published workflows yet — publish one from the Workflows page
            first.
          </span>
        )}
      </div>

      <div className="fb-form-row">
        <label htmlFor="task-work-type" className="fb-label">
          Work type
        </label>
        <select
          id="task-work-type"
          className="fb-select"
          {...register("workType")}
        >
          <option value="">Unspecified</option>
          <option value="PREVENTIVE">Preventive</option>
          <option value="CORRECTIVE">Corrective</option>
          <option value="COMPLAINT">Complaint</option>
          <option value="INSPECTION">Inspection</option>
        </select>
      </div>

      <div className="fb-form-row">
        <label htmlFor="task-description" className="fb-label">
          Description
        </label>
        <input
          id="task-description"
          type="text"
          className="fb-input"
          {...register("description")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="task-instructions" className="fb-label">
          Instructions
        </label>
        <textarea
          id="task-instructions"
          className="fb-textarea"
          rows={3}
          {...register("instructions")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="task-priority" className="fb-label">
          Priority
        </label>
        <select
          id="task-priority"
          className="fb-select"
          {...register("priority")}
        >
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      <div className="fb-form-row">
        <label htmlFor="task-scheduled" className="fb-label">
          Scheduled
        </label>
        <input
          id="task-scheduled"
          type="datetime-local"
          className="fb-input"
          {...register("scheduledAt")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="task-due" className="fb-label">
          Due
        </label>
        <input
          id="task-due"
          type="datetime-local"
          className="fb-input"
          {...register("dueAt")}
        />
      </div>

      <div className="fb-form-row">
        <label htmlFor="task-signature-required" className="fb-checkbox-row">
          <input
            id="task-signature-required"
            type="checkbox"
            {...register("signatureRequired")}
          />
          Require a signature to complete this task
        </label>
      </div>

      {serverError && <div className="fb-error">{serverError}</div>}

      <button
        id="task-create-submit"
        type="submit"
        className="fb-btn fb-btn--primary"
        disabled={isSubmitting || createMutation.isPending}
      >
        {createMutation.isPending ? "Creating…" : "Create task"}
      </button>
    </form>
  );
}
