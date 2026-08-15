export const toSnakeCase = (key: string): string =>
  key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const toCamelCase = (key: string): string =>
  key.replace(/_([a-z0-9])/g, (_match, letter: string) => letter.toUpperCase());

/** Shallow snake_case -> camelCase key mapping for a single raw DB row. */
export function rowToCamelCase<T>(row: Record<string, unknown>): T {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row))
    mapped[toCamelCase(key)] = value;
  return mapped as T;
}

/** Drops the given keys before an object is used as a column patch. */
export function omit<T extends object, K extends keyof T>(
  value: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...value };
  for (const key of keys) delete result[key];
  return result;
}
