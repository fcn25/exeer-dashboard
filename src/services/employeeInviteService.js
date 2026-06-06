import { supabase } from "../utils/supabaseClient.js";

export async function inviteEmployeeByEmail({
  email,
  fullName,
  role,
  companyId,
  employeeId,
}) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("البريد الإلكتروني مطلوب لإرسال دعوة الدخول.");
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(
    normalizedEmail,
    {
      redirectTo: `${window.location.origin}/update-password`,
    },
  );

  if (error) throw new Error(error.message);
  return data;
}
