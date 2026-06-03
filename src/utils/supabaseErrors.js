/**
 * Detect PostgREST / Postgres errors for missing columns or schema cache lag.
 */
export function isMissingColumnError(error) {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  const details = String(error.details ?? "").toLowerCase();

  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache") ||
    details.includes("column")
  );
}

export const SCHEMA_FIX_HINT =
  "نفّذ ملف supabase/scripts/fix_missing_schema_columns.sql في Supabase SQL Editor ثم أعد تحميل الصفحة.";
