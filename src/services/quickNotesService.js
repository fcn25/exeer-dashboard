import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId, getEmployeeId } from "../utils/mobileAuth.js";

const NOTE_COLORS = new Set(["amber", "mint", "sky", "rose"]);

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول الملاحظات غير جاهز. نفّذ migration user_quick_notes في Supabase.";
  }
  return error.message || "تعذّر حفظ الملاحظة.";
}

function requireEmployeeId() {
  const employeeId = getEmployeeId();
  if (!employeeId) {
    throw new Error("يجب ربط حسابك بسجل موظف (auth_user_id) لحفظ الملاحظة.");
  }
  return employeeId;
}

export function normalizeNoteColor(color) {
  const value = String(color ?? "amber").trim();
  return NOTE_COLORS.has(value) ? value : "amber";
}

export async function getMyQuickNote() {
  const companyId = getCompanyId();
  const employeeId = getEmployeeId();
  if (!employeeId) return null;

  const { data, error } = await supabase
    .from("user_quick_notes")
    .select("id, content, color, is_pinned, updated_at")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function upsertMyQuickNote({ content, color, is_pinned }) {
  const companyId = getCompanyId();
  const employeeId = requireEmployeeId();

  const payload = {
    company_id: companyId,
    employee_id: employeeId,
    content: String(content ?? ""),
    color: normalizeNoteColor(color),
    is_pinned: is_pinned !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_quick_notes")
    .upsert(payload, { onConflict: "employee_id" })
    .select("id, content, color, is_pinned, updated_at")
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}
