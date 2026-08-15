/**
 * Typed field-type registry for Sprint 07/08.
 * Adding a new field type: add an entry here and it automatically appears
 * in GET /workflow-field-types — no switch/case required.
 */

export type FieldTypeCategory = 'foundational' | 'advanced';

export type FieldTypeEntry = {
  type: string;
  category: FieldTypeCategory;
  /** Sprints where this type becomes available (for phased roll-out). */
  since: 7 | 8;
  supportsOptions?: boolean;
  supportsEvidence?: boolean;
  supportsCalculation?: boolean;
};

export const FIELD_TYPE_REGISTRY: readonly FieldTypeEntry[] = [
  // Sprint 07 — foundational
  { type: 'TEXT', category: 'foundational', since: 7 },
  { type: 'LONG_TEXT', category: 'foundational', since: 7 },
  { type: 'NUMBER', category: 'foundational', since: 7 },
  { type: 'BOOLEAN', category: 'foundational', since: 7 },
  { type: 'SINGLE_CHOICE', category: 'foundational', since: 7, supportsOptions: true },
  { type: 'MULTIPLE_CHOICE', category: 'foundational', since: 7, supportsOptions: true },
  { type: 'DATE', category: 'foundational', since: 7 },
  { type: 'TIME', category: 'foundational', since: 7 },
  { type: 'DATETIME', category: 'foundational', since: 7 },
  { type: 'SECTION_INSTRUCTION', category: 'foundational', since: 7 },
  // Sprint 08 — advanced
  { type: 'GPS', category: 'advanced', since: 8, supportsEvidence: true },
  { type: 'IMAGE', category: 'advanced', since: 8, supportsEvidence: true },
  { type: 'FILE', category: 'advanced', since: 8, supportsEvidence: true },
  { type: 'SIGNATURE', category: 'advanced', since: 8, supportsEvidence: true },
  { type: 'SCANNER', category: 'advanced', since: 8, supportsEvidence: true },
  { type: 'CALCULATION', category: 'advanced', since: 8, supportsCalculation: true },
  { type: 'LOOKUP', category: 'advanced', since: 8 },
  { type: 'REPEATABLE_GROUP', category: 'advanced', since: 8 },
] as const;

export type FieldType = (typeof FIELD_TYPE_REGISTRY)[number]['type'];

export function getFieldTypeRegistry(): readonly FieldTypeEntry[] {
  return FIELD_TYPE_REGISTRY;
}

export function isKnownFieldType(type: string): type is FieldType {
  return FIELD_TYPE_REGISTRY.some((entry) => entry.type === type);
}
