import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

type RuleOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "greater_or_equal"
  | "less_than"
  | "less_or_equal"
  | "contains"
  | "in"
  | "is_empty";

type RuleActionType =
  | "set_visible"
  | "set_required"
  | "set_enabled"
  | "set_default"
  | "require_evidence"
  | "require_note"
  | "require_photo"
  | "require_signature"
  | "warning"
  | "failure"
  | "safety_stop"
  | "supervisor_alert"
  | "supervisor_review"
  | "recommend_follow_up";

const OPERATORS: RuleOperator[] = [
  "equals",
  "not_equals",
  "greater_than",
  "greater_or_equal",
  "less_than",
  "less_or_equal",
  "contains",
  "in",
  "is_empty",
];

const ACTION_TYPES: RuleActionType[] = [
  "set_visible",
  "set_required",
  "set_enabled",
  "set_default",
  "require_evidence",
  "require_note",
  "require_photo",
  "require_signature",
  "warning",
  "failure",
  "safety_stop",
  "supervisor_alert",
  "supervisor_review",
  "recommend_follow_up",
];

const ACTIONS_NEEDING_FIELD = new Set<RuleActionType>([
  "set_visible",
  "set_required",
  "set_enabled",
  "set_default",
  "require_evidence",
  "require_note",
  "require_photo",
  "require_signature",
]);
const ACTIONS_NEEDING_BOOLEAN_VALUE = new Set<RuleActionType>([
  "set_visible",
  "set_required",
  "set_enabled",
]);
const ACTIONS_NEEDING_TEXT_VALUE = new Set<RuleActionType>(["set_default"]);
const ACTIONS_NEEDING_MESSAGE = new Set<RuleActionType>([
  "warning",
  "failure",
  "supervisor_alert",
  "recommend_follow_up",
]);

type Condition = { fieldKey: string; operator: RuleOperator; value: string };
type Action = {
  type: RuleActionType;
  fieldKey?: string;
  value?: string;
  message?: string;
};
type Rule = {
  id: string;
  priority: number;
  conditions: Condition[];
  actions: Action[];
};
type WorkflowField = { key: string; label: string };
type Workflow = {
  id: string;
  name: string;
  revision: number;
  schema?: { fields: WorkflowField[]; rules: Rule[] };
};
type ValidationError = { path: string; code: string; message: string };

function emptyCondition(): Condition {
  return { fieldKey: "", operator: "equals", value: "" };
}
function emptyAction(): Action {
  return { type: "warning", message: "" };
}

export function WorkflowRulesPage() {
  const { id } = useParams({ from: "/layout/workflows/$id/rules" });
  const qc = useQueryClient();

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", id],
    queryFn: () => api.get<Workflow>(`/workflows/${id}`),
  });

  const fields = workflow?.schema?.fields ?? [];
  const rules = workflow?.schema?.rules ?? [];

  const [priority, setPriority] = useState(0);
  const [conditions, setConditions] = useState<Condition[]>([
    emptyCondition(),
  ]);
  const [actions, setActions] = useState<Action[]>([emptyAction()]);
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: ValidationError[];
  } | null>(null);
  const [answersJson, setAnswersJson] = useState("{}");
  const [previewResult, setPreviewResult] = useState<unknown>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const resetForm = () => {
    setPriority(0);
    setConditions([emptyCondition()]);
    setActions([emptyAction()]);
  };

  const addRuleMutation = useMutation({
    mutationFn: () =>
      api.post(
        `/workflows/${id}/rules`,
        {
          priority,
          conditions: conditions
            .filter((c) => c.fieldKey)
            .map((c) => ({
              fieldKey: c.fieldKey,
              operator: c.operator,
              value: c.operator === "is_empty" ? undefined : c.value,
            })),
          actions: actions.map((a) => ({
            type: a.type,
            fieldKey: ACTIONS_NEEDING_FIELD.has(a.type)
              ? a.fieldKey
              : undefined,
            value: ACTIONS_NEEDING_BOOLEAN_VALUE.has(a.type)
              ? a.value === "true"
              : ACTIONS_NEEDING_TEXT_VALUE.has(a.type)
                ? a.value
                : undefined,
            message: ACTIONS_NEEDING_MESSAGE.has(a.type)
              ? a.message
              : undefined,
          })),
        },
        crypto.randomUUID(),
      ),
    onSuccess: async () => {
      setServerError(null);
      resetForm();
      await qc.invalidateQueries({ queryKey: ["workflow", id] });
    },
    onError: (err) => {
      setServerError(
        (err as { message?: string }).message ?? "Unable to save rule",
      );
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) =>
      api.delete(`/workflows/${id}/rules/${ruleId}`, {
        revision: workflow?.revision,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow", id] }),
  });

  const validateMutation = useMutation({
    mutationFn: () =>
      api.post<{ valid: boolean; errors: ValidationError[] }>(
        `/workflows/${id}/rules/validate`,
      ),
    onSuccess: (result) => setValidation(result),
  });

  const runPreview = async () => {
    setPreviewError(null);
    try {
      const answers = JSON.parse(answersJson) as Record<string, unknown>;
      const result = await api.post(`/workflows/${id}/evaluate`, { answers });
      setPreviewResult(result);
    } catch (err) {
      setPreviewError(
        err instanceof SyntaxError
          ? "Answers must be valid JSON"
          : ((err as { message?: string }).message ?? "Unable to evaluate"),
      );
    }
  };

  if (isLoading)
    return (
      <div className="fb-page">
        <p className="fb-table-loading">Loading workflow…</p>
      </div>
    );

  return (
    <div className="fb-page">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">{workflow?.name} — Rules</h1>
          <p className="fb-page-subtitle">
            {rules.length} rule{rules.length === 1 ? "" : "s"} · condition
            groups, actions, and priority for this workflow's draft
          </p>
        </div>
        <div className="fb-page-actions">
          <Link
            to="/workflows/$id/builder"
            params={{ id: id }}
            className="fb-btn fb-btn--ghost"
          >
            ← Builder
          </Link>
          <button
            id="rules-validate"
            className="fb-btn fb-btn--ghost"
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
          >
            {validateMutation.isPending ? "Validating…" : "Validate rules"}
          </button>
        </div>
      </div>

      {validation && (
        <div className={validation.valid ? "fb-success" : "fb-error"}>
          {validation.valid
            ? "All rules are structurally valid."
            : validation.errors.map((e) => (
                <div key={`${e.path}-${e.code}`}>
                  {e.path}: {e.message}
                </div>
              ))}
        </div>
      )}

      <div className="fb-table-container">
        <table className="fb-table" role="grid">
          <thead>
            <tr>
              <th scope="col">Priority</th>
              <th scope="col">Conditions</th>
              <th scope="col">Actions</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan={4} className="fb-table-empty">
                  No rules yet — add one below.
                </td>
              </tr>
            )}
            {[...rules]
              .sort((a, b) => b.priority - a.priority)
              .map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.priority}</td>
                  <td>
                    {rule.conditions
                      .map((c) => `${c.fieldKey} ${c.operator} ${c.value ?? ""}`)
                      .join(" AND ") || "—"}
                  </td>
                  <td>
                    {rule.actions
                      .map((a) => a.fieldKey ? `${a.type}(${a.fieldKey})` : a.type)
                      .join(", ")}
                  </td>
                  <td>
                    <button
                      className="fb-btn fb-btn--ghost"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                      disabled={deleteRuleMutation.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="fb-card">
        <h2 className="fb-card-title">Add rule</h2>

        <div className="fb-form-row">
          <label htmlFor="rule-priority" className="fb-label">
            Priority (higher wins conflicts)
          </label>
          <input
            id="rule-priority"
            type="number"
            className="fb-input"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />
        </div>

        <h3 className="fb-panel-title">Conditions (all must match)</h3>
        {conditions.map((condition, index) => (
          <div className="fb-form-row fb-inline-fields" key={index}>
            <select
              className="fb-select"
              value={condition.fieldKey}
              onChange={(e) =>
                setConditions((prev) =>
                  prev.map((c, i) =>
                    i === index ? { ...c, fieldKey: e.target.value } : c,
                  ),
                )
              }
            >
              <option value="">Field…</option>
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label} ({f.key})
                </option>
              ))}
            </select>
            <select
              className="fb-select"
              value={condition.operator}
              onChange={(e) =>
                setConditions((prev) =>
                  prev.map((c, i) =>
                    i === index
                      ? { ...c, operator: e.target.value as RuleOperator }
                      : c,
                  ),
                )
              }
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            {condition.operator !== "is_empty" && (
              <input
                className="fb-input"
                placeholder="value"
                value={condition.value}
                onChange={(e) =>
                  setConditions((prev) =>
                    prev.map((c, i) =>
                      i === index ? { ...c, value: e.target.value } : c,
                    ),
                  )
                }
              />
            )}
            <button
              type="button"
              className="fb-btn fb-btn--ghost"
              onClick={() =>
                setConditions((prev) => prev.filter((_, i) => i !== index))
              }
              disabled={conditions.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="fb-btn fb-btn--ghost"
          onClick={() => setConditions((prev) => [...prev, emptyCondition()])}
        >
          + Condition
        </button>

        <h3 className="fb-panel-title">Actions (fire when conditions match)</h3>
        {actions.map((action, index) => (
          <div className="fb-form-row fb-inline-fields" key={index}>
            <select
              className="fb-select"
              value={action.type}
              onChange={(e) =>
                setActions((prev) =>
                  prev.map((a, i) =>
                    i === index
                      ? { type: e.target.value as RuleActionType }
                      : a,
                  ),
                )
              }
            >
              {ACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {ACTIONS_NEEDING_FIELD.has(action.type) && (
              <select
                className="fb-select"
                value={action.fieldKey ?? ""}
                onChange={(e) =>
                  setActions((prev) =>
                    prev.map((a, i) =>
                      i === index ? { ...a, fieldKey: e.target.value } : a,
                    ),
                  )
                }
              >
                <option value="">Field…</option>
                {fields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label} ({f.key})
                  </option>
                ))}
              </select>
            )}
            {ACTIONS_NEEDING_BOOLEAN_VALUE.has(action.type) && (
              <select
                className="fb-select"
                value={action.value ?? "true"}
                onChange={(e) =>
                  setActions((prev) =>
                    prev.map((a, i) =>
                      i === index ? { ...a, value: e.target.value } : a,
                    ),
                  )
                }
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            )}
            {ACTIONS_NEEDING_TEXT_VALUE.has(action.type) && (
              <input
                className="fb-input"
                placeholder="default value"
                value={action.value ?? ""}
                onChange={(e) =>
                  setActions((prev) =>
                    prev.map((a, i) =>
                      i === index ? { ...a, value: e.target.value } : a,
                    ),
                  )
                }
              />
            )}
            {ACTIONS_NEEDING_MESSAGE.has(action.type) && (
              <input
                className="fb-input"
                placeholder="message"
                value={action.message ?? ""}
                onChange={(e) =>
                  setActions((prev) =>
                    prev.map((a, i) =>
                      i === index ? { ...a, message: e.target.value } : a,
                    ),
                  )
                }
              />
            )}
            <button
              type="button"
              className="fb-btn fb-btn--ghost"
              onClick={() =>
                setActions((prev) => prev.filter((_, i) => i !== index))
              }
              disabled={actions.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="fb-btn fb-btn--ghost"
          onClick={() => setActions((prev) => [...prev, emptyAction()])}
        >
          + Action
        </button>

        {serverError && <div className="fb-error">{serverError}</div>}

        <button
          id="rule-save"
          className="fb-btn fb-btn--primary"
          onClick={() => addRuleMutation.mutate()}
          disabled={addRuleMutation.isPending}
        >
          {addRuleMutation.isPending ? "Saving…" : "Add rule"}
        </button>
      </div>

      <div className="fb-card">
        <h2 className="fb-card-title">Live preview</h2>
        <p className="fb-hint">
          Enter sample answers as JSON and evaluate the current rule set
          against them.
        </p>
        <div className="fb-form-row">
          <label htmlFor="preview-answers" className="fb-label">
            Answers (JSON)
          </label>
          <textarea
            id="preview-answers"
            className="fb-textarea"
            rows={4}
            value={answersJson}
            onChange={(e) => setAnswersJson(e.target.value)}
          />
        </div>
        {previewError && <div className="fb-error">{previewError}</div>}
        <button
          id="rules-preview"
          className="fb-btn fb-btn--ghost"
          onClick={() => void runPreview()}
        >
          Evaluate
        </button>
        {previewResult != null && (
          <pre className="fb-code-block">
            {JSON.stringify(previewResult, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
