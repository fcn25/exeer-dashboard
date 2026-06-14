import { supabase } from "../utils/supabaseClient.js";

function mapInvokeError(error, data) {
  if (data?.error) return data.error;
  if (error?.message) return error.message;
  return "تعذّر تسجيل طلب حذف الحساب.";
}

export async function requestAccountDeletion() {
  const { data, error } = await supabase.functions.invoke(
    "request-account-deletion",
    { body: {} },
  );

  if (error || data?.error) {
    throw new Error(mapInvokeError(error, data));
  }

  return {
    ok: Boolean(data?.ok),
    scope: data?.scope ?? "employee",
    deletionScheduledPurgeAt: data?.deletion_scheduled_purge_at ?? null,
    message: data?.message ?? null,
  };
}
