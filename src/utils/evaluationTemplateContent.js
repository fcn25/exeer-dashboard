function parseJsonValue(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Resolve template JSON from whichever column exists in Supabase.
 * Supports: questions_jsonb, criteria, questions, content.
 */
export function resolveTemplateContentPayload(row) {
  if (!row) return null;

  const raw =
    row.questions_jsonb ??
    row.criteria ??
    row.questions ??
    row.content ??
    null;

  const parsed = parseJsonValue(raw) ?? raw;
  if (!parsed) return null;

  if (Array.isArray(parsed)) {
    return { version: 3, categories: parsed };
  }

  if (typeof parsed === "object") {
    if (Array.isArray(parsed.categories)) return parsed;
    if (Array.isArray(parsed.criteria)) {
      return { version: 3, categories: parsed };
    }
    if (Array.isArray(parsed.questions)) return parsed;
  }

  return null;
}
