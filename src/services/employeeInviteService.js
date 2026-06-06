import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";

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

  const { data, error } = await supabase.functions.invoke("invite-employee", {
    body: {
      email: normalizedEmail,
      full_name: String(fullName ?? "").trim(),
      company_id: companyId ?? getCompanyId(),
      role: role ?? "Employee",
      employee_id: employeeId ?? null,
      redirect_to: `${window.location.origin}/update-password`,
    },
  });

  if (error || data?.error) {
    throw new Error(data?.error || error?.message || "تعذّر إرسال الدعوة.");
  }

  return data;
}
