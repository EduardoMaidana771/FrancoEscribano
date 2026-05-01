const ORIENTAL_VARIANTS = new Set([
  "uruguaya",
  "uruguayo",
  "uruguayo/a",
  "uruguaya/o",
  "oriental",
  "orientales",
]);

export function normalizeNationalityValue(value: unknown, fallback = "oriental"): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (ORIENTAL_VARIANTS.has(normalized)) return "oriental";
  return normalized;
}

export function normalizeNationalityFields<T extends Record<string, unknown>>(
  data: T,
  keys: readonly string[]
): T {
  return keys.reduce<T>((next, key) => {
    if (!(key in next)) return next;
    return {
      ...next,
      [key]: normalizeNationalityValue(next[key]),
    };
  }, { ...data });
}