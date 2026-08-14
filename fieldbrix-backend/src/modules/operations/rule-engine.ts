export type RuleValue = string | number | boolean | null | string[];
export type RuleOperator = 'equals' | 'not_equals' | 'greater_than' | 'greater_or_equal' | 'less_than' | 'less_or_equal' | 'contains' | 'in' | 'is_empty';
export type RuleAction = { type: 'set_visible' | 'set_required' | 'require_evidence' | 'warning' | 'failure' | 'safety_stop' | 'recommend_follow_up'; fieldKey?: string; value?: RuleValue; message?: string };
export type Rule = { id: string; priority: number; conditions: Array<{ fieldKey: string; operator: RuleOperator; value?: RuleValue }>; actions: RuleAction[] };
export type RuleOutcome = { visible: Record<string, boolean>; required: Record<string, boolean>; evidence: string[]; warnings: string[]; failures: string[]; safetyStop: boolean; followUps: string[] };

const empty = (value: RuleValue) => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
const compare = (actual: RuleValue, operator: RuleOperator, expected?: RuleValue) => {
  if (operator === 'is_empty') return empty(actual);
  if (operator === 'contains') return Array.isArray(actual) ? actual.includes(String(expected)) : String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
  if (operator === 'in') return Array.isArray(expected) && expected.map(String).includes(String(actual));
  if (operator === 'equals') return actual === expected;
  if (operator === 'not_equals') return actual !== expected;
  const left = Number(actual); const right = Number(expected);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  if (operator === 'greater_than') return left > right;
  if (operator === 'greater_or_equal') return left >= right;
  if (operator === 'less_than') return left < right;
  return left <= right;
};

export function evaluateRules(rules: Rule[], answers: Record<string, RuleValue>): RuleOutcome {
  const outcome: RuleOutcome = { visible: {}, required: {}, evidence: [], warnings: [], failures: [], safetyStop: false, followUps: [] };
  [...rules].sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id)).forEach((rule) => {
    if (!rule.conditions.every((condition) => compare(answers[condition.fieldKey], condition.operator, condition.value))) return;
    rule.actions.forEach((action) => {
      if (action.type === 'safety_stop') outcome.safetyStop = true;
      if (action.type === 'set_visible' && action.fieldKey) outcome.visible[action.fieldKey] = action.value !== false;
      if (action.type === 'set_required' && action.fieldKey) outcome.required[action.fieldKey] = action.value === true;
      if (action.type === 'require_evidence' && action.fieldKey && !outcome.evidence.includes(action.fieldKey)) outcome.evidence.push(action.fieldKey);
      if (action.type === 'warning' && action.message) outcome.warnings.push(action.message);
      if (action.type === 'failure' && action.message) outcome.failures.push(action.message);
      if (action.type === 'recommend_follow_up' && action.message) outcome.followUps.push(action.message);
    });
  });
  if (outcome.safetyStop) outcome.failures = [...new Set([...outcome.failures, 'Safety stop requires supervisor review'])];
  return outcome;
}

export function validateRules(rules: Rule[], fieldKeys: Set<string>) {
  const errors: Array<{ path: string; code: string; message: string }> = [];
  const seen = new Set<string>();
  rules.forEach((rule, index) => {
    if (!rule.id || seen.has(rule.id)) errors.push({ path: `rules.${index}.id`, code: 'DUPLICATE_RULE_ID', message: 'Rule IDs must be unique' });
    seen.add(rule.id);
    if (!Number.isInteger(rule.priority) || rule.priority < 0) errors.push({ path: `rules.${index}.priority`, code: 'INVALID_PRIORITY', message: 'Priority must be a non-negative integer' });
    rule.conditions.forEach((condition, conditionIndex) => { if (!fieldKeys.has(condition.fieldKey)) errors.push({ path: `rules.${index}.conditions.${conditionIndex}`, code: 'UNKNOWN_FIELD', message: `Unknown field ${condition.fieldKey}` }); });
    rule.actions.forEach((action, actionIndex) => { if (action.fieldKey && !fieldKeys.has(action.fieldKey)) errors.push({ path: `rules.${index}.actions.${actionIndex}`, code: 'UNKNOWN_FIELD', message: `Unknown field ${action.fieldKey}` }); });
  });
  return { valid: errors.length === 0, errors, warnings: [] };
}
