import { supabase } from "../utils/supabaseClient.js";
import {
  normalizeCurrentEmployee,
  setCurrentEmployeeCache,
} from "./currentEmployeeService.js";

const NOTE_COLORS = new Set(["amber", "mint", "sky", "rose"]);

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول الملاحظات غير جاهز. نفّذ migration user_quick_notes في Supabase.";
  }
  if (error.code === "PGRST116") {
    return "لم يتم العثور على سجل موظف مرتبط بـ auth_user_id لهذا الحساب.";
  }
  return error.message || "تعذّر حفظ الملاحظة.";
}

/**
 * Resolve employee bigint id + company_id from the live Supabase auth session.
 */
async function resolveNoteEmployeeContext() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message || "تعذّر التحقق من الجلسة.");
  }
  if (!user?.id) {
    throw new Error("يجب تسجيل الدخول لحفظ الملاحظة.");
  }

  const { data: emp, error: employeeError } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (employeeError) {
    throw new Error(mapDbError(employeeError));
  }

  const employeeId = Number(emp?.id);
  const companyId = Number(emp?.company_id);

  if (!Number.isFinite(employeeId) || employeeId <= 0 || !Number.isFinite(companyId) || companyId <= 0) {
    throw new Error("يجب ربط حسابك بسجل موظف (auth_user_id) لحفظ الملاحظة.");
  }

  setCurrentEmployeeCache(
    normalizeCurrentEmployee(
      { id: employeeId, company_id: companyId },
      user.id,
    ),
  );

  return { employeeId, companyId, authUserId: user.id };
}

export function normalizeNoteColor(color) {
  const value = String(color ?? "amber").trim();
  return NOTE_COLORS.has(value) ? value : "amber";
}

export async function getMyQuickNote() {
  const { employeeId, companyId } = await resolveNoteEmployeeContext();

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
  const { employeeId, companyId } = await resolveNoteEmployeeContext();

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
