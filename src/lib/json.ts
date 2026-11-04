// Helpers for JSON-string columns (fieldTags, criterionIds, raw, config) and ISO dates.
export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (s == null || s === "") return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export const toJson = (v: unknown): string => JSON.stringify(v ?? null);

export function parseStringArray(s: string | null | undefined): string[] {
  const v = parseJson<unknown>(s, []);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
export const serializeStringArray = (a: readonly string[]): string => JSON.stringify(a);

export function parseIntArray(s: string | null | undefined): number[] {
  const v = parseJson<unknown>(s, []);
  return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : [];
}
export const serializeIntArray = (a: readonly number[]): string =>
  JSON.stringify([...new Set(a)].sort((x, y) => x - y));

/** Parse an ISO-8601 string (or Date) to Date; null if empty/invalid. */
export function parseDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
export const toIsoDate = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);
