import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

export async function listEvents() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("company_id", companyId)
    .order("event_datetime", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

function toEventTimestamp(datetime) {
  if (!datetime) return null;
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) return datetime;
  return parsed.toISOString();
}

export async function createEvent(payload) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("events")
    .insert({
      company_id: companyId,
      name: payload.name?.trim(),
      description: payload.description?.trim() || null,
      event_datetime: toEventTimestamp(payload.datetime),
      location: payload.location?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}
