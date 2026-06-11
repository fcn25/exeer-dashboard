import { supabase } from "../utils/supabaseClient.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "23505") {
    return "لديك طلب حذف حساب قيد المعالجة بالفعل.";
  }
  if (error.code === "PGRST205") {
    return "جدول طلبات حذف الحساب غير جاهز. نفّذ migration account_deletion_requests في Supabase.";
  }
  return error.message || "تعذّر تسجيل طلب حذف الحساب.";
}

export async function requestAccountDeletion(userId) {
  if (!userId) {
    throw new Error("تعذّر تحديد المستخدم الحالي.");
  }

  const { error } = await supabase.from("account_deletion_requests").insert({
    user_id: userId,
    status: "pending",
    requested_at: new Date().toISOString(),
  });

  if (error) throw new Error(mapDbError(error));
}
