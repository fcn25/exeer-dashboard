import { supabase } from "../utils/supabaseClient.js";
import { getAuthUser, getCompanyId } from "../utils/mobileAuth.js";

const NOTE_COLORS = new Set(["amber", "mint", "sky", "rose"]);

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول الملاحظات غير جاهز. نفّذ migration user_quick_notes في Supabase.";
  }
  return error.message || "تعذّر حفظ الملاحظة.";
}

function requireCurrentUserId() {
  const userId = getAuthUser()?.id;
  if (!userId) {
    throw new Error("يجب تسجيل الدخول لحفظ الملاحظة.");
  }
  return userId;
}

export function normalizeNoteColor(color) {
  const value = String(color ?? "amber").trim();
  return NOTE_COLORS.has(value) ? value : "amber";
}

export async function getMyQuickNote() {
  const companyId = getCompanyId();
  const userId = getAuthUser()?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("user_quick_notes")
    .select("id, content, color, is_visible, updated_at")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function upsertMyQuickNote({ content, color, is_visible }) {
  const companyId = getCompanyId();
  const userId = requireCurrentUserId();

  const payload = {
    company_id: companyId,
    user_id: userId,
    content: String(content ?? ""),
    color: normalizeNoteColor(color),
    is_visible: is_visible !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_quick_notes")
    .upsert(payload, { onConflict: "user_id" })
    .select("id, content, color, is_visible, updated_at")
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}
