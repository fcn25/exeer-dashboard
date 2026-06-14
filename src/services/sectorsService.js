import { supabase } from "../utils/supabaseClient.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر تحميل القطاعات.";
}

export async function listSectors() {
  const { data, error } = await supabase
    .from("sectors")
    .select("id, name_ar")
    .order("name_ar", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return (data ?? []).map((row) => ({
    id: Number(row.id),
    nameAr: String(row.name_ar ?? "").trim(),
  }));
}
