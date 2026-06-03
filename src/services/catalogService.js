import { supabase } from "../utils/supabaseClient.js";

function mapCatalogError(error, tableLabel) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return `جدول ${tableLabel} غير جاهز. نفّذ ملف supabase/migrations/20250617000000_hr_reference_tables.sql ثم supabase/seed.sql.`;
  }
  return error.message || "تعذّر تحميل البيانات.";
}

export async function listDepartments() {
  const { data, error } = await supabase
    .from("departments")
    .select("name")
    .order("name", { ascending: true });

  if (error) throw new Error(mapCatalogError(error, "departments"));
  return (data ?? []).map((row) => String(row.name ?? "").trim()).filter(Boolean);
}

export async function listJobTitles() {
  const { data, error } = await supabase
    .from("job_titles")
    .select("name")
    .order("name", { ascending: true });

  if (error) throw new Error(mapCatalogError(error, "job_titles"));
  return (data ?? []).map((row) => String(row.name ?? "").trim()).filter(Boolean);
}

export async function listLeaveTypes() {
  const { data, error } = await supabase
    .from("leave_types")
    .select("id, name, default_days")
    .order("name", { ascending: true });

  if (error) throw new Error(mapCatalogError(error, "leave_types"));
  return data ?? [];
}
