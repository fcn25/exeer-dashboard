import { supabase } from "../utils/supabaseClient.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر تحميل الإشعارات.";
}

export async function listUserNotifications(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, type, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function countUnreadNotifications(userId) {
  if (!userId) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw new Error(mapDbError(error));
  return count ?? 0;
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw new Error(mapDbError(error));
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw new Error(mapDbError(error));
}
