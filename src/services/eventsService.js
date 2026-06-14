import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";

export const EVENT_SOURCE_MANUAL = "manual";
export const EVENT_SOURCE_SYSTEM = "system";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

/** Events page: manual company events only (excludes loan/leave approval rows). */
export async function listEvents() {
  const companyId = getCompanyId();

  const withSource = await supabase
    .from("events")
    .select("*")
    .eq("company_id", companyId)
    .eq("source", EVENT_SOURCE_MANUAL)
    .order("event_datetime", { ascending: true });

  if (!withSource.error) return withSource.data ?? [];

  if (isMissingColumnError(withSource.error)) {
    const fallback = await supabase
      .from("events")
      .select("*")
      .eq("company_id", companyId)
      .order("event_datetime", { ascending: true });

    if (fallback.error) throw new Error(mapDbError(fallback.error));
    return (fallback.data ?? []).filter((row) => !isLegacySystemEventRow(row));
  }

  throw new Error(mapDbError(withSource.error));
}

/** Calendar / home agenda: all company events including system-generated. */
export async function listCompanyEventsForCalendar(companyId) {
  const id = companyId ?? getCompanyId();
  const { data, error } = await supabase
    .from("events")
    .select("id, name, description, event_datetime, location, source")
    .eq("company_id", id)
    .order("event_datetime", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

function isLegacySystemEventRow(row) {
  const name = String(row?.name ?? "");
  return (
    name.startsWith("سلفة معتمدة:") ||
    name.startsWith("إجازة معتمدة:") ||
    name.startsWith("طلب معتمد:")
  );
}

function toEventTimestamp(datetime) {
  if (!datetime) return null;
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) return datetime;
  return parsed.toISOString();
}

function resolveEventSource(payload) {
  return payload?.source === EVENT_SOURCE_SYSTEM
    ? EVENT_SOURCE_SYSTEM
    : EVENT_SOURCE_MANUAL;
}

export async function createEvent(payload) {
  const companyId = getCompanyId();
  const source = resolveEventSource(payload);
  const row = {
    company_id: companyId,
    name: payload.name?.trim(),
    description: payload.description?.trim() || null,
    event_datetime: toEventTimestamp(payload.datetime),
    location: payload.location?.trim() || null,
    source,
  };

  const { data, error } = await supabase.from("events").insert(row).select().single();

  if (error && isMissingColumnError(error) && source === EVENT_SOURCE_MANUAL) {
    const { source: _drop, ...withoutSource } = row;
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("events")
      .insert(withoutSource)
      .select()
      .single();

    if (fallbackError) throw new Error(mapDbError(fallbackError));
    return fallbackData;
  }

  if (error) throw new Error(mapDbError(error));
  return data;
}
