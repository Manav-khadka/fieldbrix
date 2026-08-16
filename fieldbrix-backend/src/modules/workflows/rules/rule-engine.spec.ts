import { evaluateRules, validateRules } from '../../workflows/rule-engine';
import type { Rule } from '../../workflows/rule-engine';

// ─── evaluateRules ────────────────────────────────────────────────────────────

describe('evaluateRules', () => {
  const rule = (overrides: Partial<Rule> = {}): Rule => ({
    id: 'r1',
    priority: 0,
    conditions: [],
    actions: [],
    ...overrides,
  });

  it('returns empty outcome with no rules', () => {
    const out = evaluateRules([], {});
    expect(out.safetyStop).toBe(false);
    expect(out.warnings).toEqual([]);
    expect(out.failures).toEqual([]);
  });

  describe('operator: equals', () => {
    it('fires when condition matches', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [
              { fieldKey: 'status', operator: 'equals', value: 'bad' },
            ],
            actions: [{ type: 'warning', message: 'Alert!' }],
          }),
        ],
        { status: 'bad' },
      );
      expect(out.warnings).toContain('Alert!');
    });
    it('does not fire when condition does not match', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [
              { fieldKey: 'status', operator: 'equals', value: 'bad' },
            ],
            actions: [{ type: 'warning', message: 'Alert!' }],
          }),
        ],
        { status: 'ok' },
      );
      expect(out.warnings).toEqual([]);
    });
  });

  describe('operator: not_equals', () => {
    it('fires when values differ', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [{ fieldKey: 'x', operator: 'not_equals', value: 'a' }],
            actions: [{ type: 'warning', message: 'diff' }],
          }),
        ],
        { x: 'b' },
      );
      expect(out.warnings).toContain('diff');
    });
  });

  describe('operator: greater_than', () => {
    it('fires when numeric actual > expected', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [
              { fieldKey: 'temp', operator: 'greater_than', value: 100 },
            ],
            actions: [{ type: 'failure', message: 'hot' }],
          }),
        ],
        { temp: 150 },
      );
      expect(out.failures).toContain('hot');
    });
    it('does not fire at equal value', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [
              { fieldKey: 'temp', operator: 'greater_than', value: 100 },
            ],
            actions: [{ type: 'failure', message: 'hot' }],
          }),
        ],
        { temp: 100 },
      );
      expect(out.failures).toEqual([]);
    });
  });

  describe('operator: less_or_equal', () => {
    it('fires at equal value', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [
              { fieldKey: 'x', operator: 'less_or_equal', value: 5 },
            ],
            actions: [{ type: 'warning', message: 'low' }],
          }),
        ],
        { x: 5 },
      );
      expect(out.warnings).toContain('low');
    });
  });

  describe('operator: contains', () => {
    it('fires on array inclusion', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [
              { fieldKey: 'tags', operator: 'contains', value: 'urgent' },
            ],
            actions: [{ type: 'warning', message: 'urg' }],
          }),
        ],
        { tags: ['urgent', 'other'] },
      );
      expect(out.warnings).toContain('urg');
    });
    it('fires on substring match', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [
              { fieldKey: 'note', operator: 'contains', value: 'broken' },
            ],
            actions: [{ type: 'failure', message: 'brk' }],
          }),
        ],
        { note: 'equipment is broken' },
      );
      expect(out.failures).toContain('brk');
    });
  });

  describe('operator: in', () => {
    it('fires when value is in array', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [
              {
                fieldKey: 'code',
                operator: 'in',
                value: ['A', 'B', 'C'],
              },
            ],
            actions: [{ type: 'warning', message: 'in!' }],
          }),
        ],
        { code: 'B' },
      );
      expect(out.warnings).toContain('in!');
    });
  });

  describe('operator: is_empty', () => {
    it('fires for null', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [{ fieldKey: 'x', operator: 'is_empty' }],
            actions: [{ type: 'warning', message: 'empty' }],
          }),
        ],
        { x: null },
      );
      expect(out.warnings).toContain('empty');
    });
    it('fires for empty string', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [{ fieldKey: 'x', operator: 'is_empty' }],
            actions: [{ type: 'warning', message: 'empty' }],
          }),
        ],
        { x: '' },
      );
      expect(out.warnings).toContain('empty');
    });
    it('does not fire for non-empty', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [{ fieldKey: 'x', operator: 'is_empty' }],
            actions: [{ type: 'warning', message: 'empty' }],
          }),
        ],
        { x: 'value' },
      );
      expect(out.warnings).toEqual([]);
    });
  });

  describe('action: safety_stop', () => {
    it('sets safetyStop and appends to failures', () => {
      const out = evaluateRules(
        [rule({ conditions: [], actions: [{ type: 'safety_stop' }] })],
        {},
      );
      expect(out.safetyStop).toBe(true);
      expect(out.failures).toContain('Safety stop requires supervisor review');
    });
  });

  describe('action: set_visible / set_required', () => {
    it('tracks visible state per field key', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [],
            actions: [{ type: 'set_visible', fieldKey: 'photo', value: false }],
          }),
        ],
        {},
      );
      expect(out.visible['photo']).toBe(false);
    });

    it('tracks required state per field key', () => {
      const out = evaluateRules(
        [
          rule({
            conditions: [],
            actions: [{ type: 'set_required', fieldKey: 'sig', value: true }],
          }),
        ],
        {},
      );
      expect(out.required['sig']).toBe(true);
    });
  });

  describe('priority ordering', () => {
    it('higher priority rule fires first (DESC)', () => {
      const fired: string[] = [];
      evaluateRules(
        [
          {
            id: 'low',
            priority: 1,
            conditions: [],
            actions: [{ type: 'warning', message: 'low' }],
          },
          {
            id: 'high',
            priority: 10,
            conditions: [],
            actions: [{ type: 'warning', message: 'high' }],
          },
        ],
        {},
      );
      // Both fire — but we only verify both are present
      const out = evaluateRules(
        [
          {
            id: 'low',
            priority: 1,
            conditions: [],
            actions: [{ type: 'warning', message: 'low' }],
          },
          {
            id: 'high',
            priority: 10,
            conditions: [],
            actions: [{ type: 'warning', message: 'high' }],
          },
        ],
        {},
      );
      expect(out.warnings).toEqual(['high', 'low']);
      void fired;
    });

    it('higher-priority rule wins a set_visible/set_required conflict, not the last one processed', () => {
      const out = evaluateRules(
        [
          {
            id: 'low',
            priority: 1,
            conditions: [],
            actions: [{ type: 'set_visible', fieldKey: 'x', value: false }],
          },
          {
            id: 'high',
            priority: 10,
            conditions: [],
            actions: [{ type: 'set_visible', fieldKey: 'x', value: true }],
          },
        ],
        {},
      );
      // priority 10 beats priority 1 regardless of iteration order.
      expect(out.visible.x).toBe(true);
    });

    it('equal priority resolves by id ASC', () => {
      const out = evaluateRules(
        [
          {
            id: 'z',
            priority: 5,
            conditions: [],
            actions: [{ type: 'warning', message: 'z-fires' }],
          },
          {
            id: 'a',
            priority: 5,
            conditions: [],
            actions: [{ type: 'warning', message: 'a-fires' }],
          },
        ],
        {},
      );
      expect(out.warnings[0]).toBe('a-fires');
    });
  });

  describe('action: require_evidence deduplication', () => {
    it('does not duplicate evidence entries', () => {
      const out = evaluateRules(
        [
          {
            id: 'r1',
            priority: 0,
            conditions: [],
            actions: [{ type: 'require_evidence', fieldKey: 'photo' }],
          },
          {
            id: 'r2',
            priority: 0,
            conditions: [],
            actions: [{ type: 'require_evidence', fieldKey: 'photo' }],
          },
        ],
        {},
      );
      expect(out.evidence.filter((e) => e === 'photo').length).toBe(1);
    });
  });
});

// ─── validateRules ────────────────────────────────────────────────────────────

describe('validateRules', () => {
  const fieldKeys = new Set(['temperature', 'photo', 'note']);

  it('returns valid=true for a well-formed rule', () => {
    const result = validateRules(
      [
        {
          id: 'r1',
          priority: 1,
          conditions: [
            { fieldKey: 'temperature', operator: 'greater_than', value: 100 },
          ],
          actions: [{ type: 'warning', message: 'hot' }],
        },
      ],
      fieldKeys,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('flags duplicate rule IDs', () => {
    const result = validateRules(
      [
        { id: 'dup', priority: 0, conditions: [], actions: [] },
        { id: 'dup', priority: 0, conditions: [], actions: [] },
      ],
      fieldKeys,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_RULE_ID')).toBe(
      true,
    );
  });

  it('flags invalid priority (negative)', () => {
    const result = validateRules(
      [{ id: 'r1', priority: -1, conditions: [], actions: [] }],
      fieldKeys,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_PRIORITY')).toBe(true);
  });

  it('flags unknown field key in conditions', () => {
    const result = validateRules(
      [
        {
          id: 'r1',
          priority: 0,
          conditions: [
            { fieldKey: 'nonexistent', operator: 'equals', value: 1 },
          ],
          actions: [],
        },
      ],
      fieldKeys,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNKNOWN_FIELD')).toBe(true);
  });

  it('flags unknown field key in actions', () => {
    const result = validateRules(
      [
        {
          id: 'r1',
          priority: 0,
          conditions: [],
          actions: [{ type: 'set_visible', fieldKey: 'ghost' }],
        },
      ],
      fieldKeys,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNKNOWN_FIELD')).toBe(true);
  });

  it('returns valid=true for empty rule set', () => {
    expect(validateRules([], fieldKeys).valid).toBe(true);
  });

  it('flags a rule that both shows and hides the same field', () => {
    const result = validateRules(
      [
        {
          id: 'r1',
          priority: 0,
          conditions: [],
          actions: [
            { type: 'set_visible', fieldKey: 'photo', value: true },
            { type: 'set_visible', fieldKey: 'photo', value: false },
          ],
        },
      ],
      fieldKeys,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'CONTRADICTORY_ACTION')).toBe(
      true,
    );
  });

  it('flags a rule that both requires and un-requires the same field', () => {
    const result = validateRules(
      [
        {
          id: 'r1',
          priority: 0,
          conditions: [],
          actions: [
            { type: 'set_required', fieldKey: 'note', value: true },
            { type: 'set_required', fieldKey: 'note', value: false },
          ],
        },
      ],
      fieldKeys,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'CONTRADICTORY_ACTION')).toBe(
      true,
    );
  });

  it('does not flag two set_visible actions on different fields, or two agreeing actions on the same field', () => {
    const result = validateRules(
      [
        {
          id: 'r1',
          priority: 0,
          conditions: [],
          actions: [
            { type: 'set_visible', fieldKey: 'photo', value: true },
            { type: 'set_visible', fieldKey: 'note', value: false },
            { type: 'set_visible', fieldKey: 'photo', value: true },
          ],
        },
      ],
      fieldKeys,
    );
    expect(result.valid).toBe(true);
  });

  it('does not flag conflicting set_visible actions across two different rules — that is resolved by priority at evaluation time, not a structural error', () => {
    const result = validateRules(
      [
        {
          id: 'low',
          priority: 1,
          conditions: [],
          actions: [{ type: 'set_visible', fieldKey: 'photo', value: false }],
        },
        {
          id: 'high',
          priority: 10,
          conditions: [],
          actions: [{ type: 'set_visible', fieldKey: 'photo', value: true }],
        },
      ],
      fieldKeys,
    );
    expect(result.valid).toBe(true);
  });
});
