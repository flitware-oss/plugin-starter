export function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildCaseInsensitiveContainsFilter(fields: string[], query: string) {
  const safeQuery = escapeFilterValue(String(query ?? "").trim());
  const upperQuery = safeQuery.toUpperCase();

  return fields
    .map((field) => `${field} ~ "${safeQuery}" || ${field} ~ "${upperQuery}"`)
    .join(" || ");
}

export function joinFilterParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .map((part) => `(${part})`)
    .join(" && ");
}
