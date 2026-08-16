export type RuleValue = string | number | boolean | null | string[];

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_or_equal'
  | 'less_than'
  | 'less_or_equal'
  | 'contains'
  | 'in'
  | 'is_empty';

export type RuleActionType =
  | 'set_visible'
  | 'set_required'
  | 'set_enabled'
  | 'set_default'
  | 'require_evidence'
  | 'require_note'
  | 'require_photo'
  | 'require_signature'
  | 'warning'
  | 'failure'
  | 'safety_stop'
  | 'supervisor_alert'
  | 'supervisor_review'
  | 'recommend_follow_up';

export type RuleAction = {
  type: RuleActionType;
  fieldKey?: string;
  value?: RuleValue;
  message?: string;
};

export type RuleCondition = {
  fieldKey: string;
  operator: RuleOperator;
  value?: RuleValue;
};

export type Rule = {
  id: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
};

export type RuleOutcome = {
  visible: Record<string, boolean>;
  required: Record<string, boolean>;
  enabled: Record<string, boolean>;
  defaults: Record<string, RuleValue>;
  evidence: string[];
  requiredNotes: string[];
  requiredPhotos: string[];
  requiredSignatures: string[];
  warnings: string[];
  failures: string[];
  safetyStop: boolean;
  supervisorAlerts: string[];
  supervisorReviewRequired: boolean;
  followUps: string[];
};

const empty = (value: RuleValue): boolean =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const compare = (
  actual: RuleValue,
  operator: RuleOperator,
  expected?: RuleValue,
): boolean => {
  if (operator === 'is_empty') return empty(actual);
  if (operator === 'contains')
    return Array.isArray(actual)
      ? actual.includes(String(expected))
      : String(actual ?? '')
          .toLowerCase()
          .includes(String(expected ?? '').toLowerCase());
  if (operator === 'in')
    return (
      Array.isArray(expected) && expected.map(String).includes(String(actual))
    );
  if (operator === 'equals') return actual === expected;
  if (operator === 'not_equals') return actual !== expected;
  const left = Number(actual);
  const right = Number(expected);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  if (operator === 'greater_than') return left > right;
  if (operator === 'greater_or_equal') return left >= right;
  if (operator === 'less_than') return left < right;
  return left <= right; // less_or_equal
};

/**
 * Pure, side-effect-free rule evaluator.
 * Shared between API validation, workflow preview and the runtime app.
 * Rules are sorted deterministically by priority DESC then id ASC so equal
 * priorities always resolve in the same order.
 */
export function evaluateRules(
  rules: Rule[],
  answers: Record<string, RuleValue>,
): RuleOutcome {
  const outcome: RuleOutcome = {
    visible: {},
    required: {},
    enabled: {},
    defaults: {},
    evidence: [],
    requiredNotes: [],
    requiredPhotos: [],
    requiredSignatures: [],
    warnings: [],
    failures: [],
    safetyStop: false,
    supervisorAlerts: [],
    supervisorReviewRequired: false,
    followUps: [],
  };

  [...rules]
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .forEach((rule) => {
      const allMatch = rule.conditions.every((cond) =>
        compare(answers[cond.fieldKey], cond.operator, cond.value),
      );
      if (!allMatch) return;

      rule.actions.forEach((action) => {
        switch (action.type) {
          case 'safety_stop':
            outcome.safetyStop = true;
            break;
          case 'set_visible':
            // Rules are iterated highest-priority-first; the first rule to
            // set a given field wins a conflict. Assigning unconditionally
            // here would let whichever conflicting rule happens to be
            // processed *last* (i.e. the lowest priority one) silently win
            // instead, defeating the entire purpose of `priority`.
            if (action.fieldKey && !(action.fieldKey in outcome.visible))
              outcome.visible[action.fieldKey] = action.value !== false;
            break;
          case 'set_required':
            if (action.fieldKey && !(action.fieldKey in outcome.required))
              outcome.required[action.fieldKey] = action.value === true;
            break;
          case 'set_enabled':
            // Same first-rule-wins conflict resolution as set_visible/
            // set_required — priority-sorted, so the highest-priority rule
            // to touch a field wins.
            if (action.fieldKey && !(action.fieldKey in outcome.enabled))
              outcome.enabled[action.fieldKey] = action.value !== false;
            break;
          case 'set_default':
            if (action.fieldKey && !(action.fieldKey in outcome.defaults))
              outcome.defaults[action.fieldKey] = action.value ?? null;
            break;
          case 'require_evidence':
            if (action.fieldKey && !outcome.evidence.includes(action.fieldKey))
              outcome.evidence.push(action.fieldKey);
            break;
          case 'require_note':
            if (
              action.fieldKey &&
              !outcome.requiredNotes.includes(action.fieldKey)
            )
              outcome.requiredNotes.push(action.fieldKey);
            break;
          case 'require_photo':
            if (
              action.fieldKey &&
              !outcome.requiredPhotos.includes(action.fieldKey)
            )
              outcome.requiredPhotos.push(action.fieldKey);
            break;
          case 'require_signature':
            if (
              action.fieldKey &&
              !outcome.requiredSignatures.includes(action.fieldKey)
            )
              outcome.requiredSignatures.push(action.fieldKey);
            break;
          case 'warning':
            if (action.message) outcome.warnings.push(action.message);
            break;
          case 'failure':
            if (action.message) outcome.failures.push(action.message);
            break;
          case 'supervisor_alert':
            if (action.message) outcome.supervisorAlerts.push(action.message);
            break;
          case 'supervisor_review':
            outcome.supervisorReviewRequired = true;
            break;
          case 'recommend_follow_up':
            if (action.message) outcome.followUps.push(action.message);
            break;
        }
      });
    });

  if (outcome.safetyStop)
    outcome.failures = [
      ...new Set([
        ...outcome.failures,
        'Safety stop requires supervisor review',
      ]),
    ];

  return outcome;
}

/** Structural validation — called before persisting rules. */
export function validateRules(
  rules: Rule[],
  fieldKeys: Set<string>,
): {
  valid: boolean;
  errors: Array<{ path: string; code: string; message: string }>;
  warnings: [];
} {
  const errors: Array<{ path: string; code: string; message: string }> = [];
  const seen = new Set<string>();

  rules.forEach((rule, i) => {
    if (!rule.id || seen.has(rule.id))
      errors.push({
        path: `rules.${i}.id`,
        code: 'DUPLICATE_RULE_ID',
        message: 'Rule IDs must be unique',
      });
    seen.add(rule.id);

    if (!Number.isInteger(rule.priority) || rule.priority < 0)
      errors.push({
        path: `rules.${i}.priority`,
        code: 'INVALID_PRIORITY',
        message: 'Priority must be a non-negative integer',
      });

    rule.conditions.forEach((cond, j) => {
      if (!fieldKeys.has(cond.fieldKey))
        errors.push({
          path: `rules.${i}.conditions.${j}`,
          code: 'UNKNOWN_FIELD',
          message: `Unknown field "${cond.fieldKey}"`,
        });
    });

    rule.actions.forEach((action, j) => {
      if (action.fieldKey && !fieldKeys.has(action.fieldKey))
        errors.push({
          path: `rules.${i}.actions.${j}`,
          code: 'UNKNOWN_FIELD',
          message: `Unknown field "${action.fieldKey}"`,
        });
    });

    // A single rule contradicting itself is always a configuration error,
    // independent of any other rule or evaluation order — unlike a cross-
    // rule conflict, there's no priority to resolve it by.
    const contradictionVerb: Record<string, string> = {
      set_visible: 'show',
      set_required: 'require',
      set_enabled: 'enable',
    };
    for (const type of [
      'set_visible',
      'set_required',
      'set_enabled',
    ] as const) {
      const seenValues = new Map<string, boolean>();
      rule.actions.forEach((action, j) => {
        if (action.type !== type || !action.fieldKey) return;
        const resolved =
          type === 'set_required'
            ? action.value === true
            : action.value !== false;
        const previous = seenValues.get(action.fieldKey);
        if (previous !== undefined && previous !== resolved)
          errors.push({
            path: `rules.${i}.actions.${j}`,
            code: 'CONTRADICTORY_ACTION',
            message: `Rule "${rule.id}" both does and does not ${contradictionVerb[type]} field "${action.fieldKey}"`,
          });
        seenValues.set(action.fieldKey, resolved);
      });
    }
  });

  return { valid: errors.length === 0, errors, warnings: [] };
}
