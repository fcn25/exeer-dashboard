import { supabase } from "../utils/supabaseClient.js";
import { formatErrorMessage } from "../utils/formatErrorMessage.js";

export const SIGNUP_EMAIL_REDIRECT_URL = "https://app.exeerai.com/dashboard";

export const SIGNUP_SUCCESS_MESSAGE =
  "تم إنشاء الحساب بنجاح. يرجى مراجعة بريدك الإلكتروني لتفعيل الحساب";

function mapAuthError(error) {
  return formatErrorMessage(error, "تعذّر إكمال العملية.");
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw new Error(mapAuthError(error));
  return data;
}

async function createAdminEmployeeRecord(companyId, adminFullName, adminEmail) {
  const { error: employeeError } = await supabase.from("employees").insert({
    company_id: companyId,
    full_name: adminFullName.trim(),
    email: adminEmail.trim(),
    employee_number: "EMP-001",
    role: "Admin",
    employment_status: "Active",
    department: "الإدارة",
    job_title_name: "مدير النظام",
    hire_date: new Date().toISOString().slice(0, 10),
  });

  if (employeeError) {
    if (employeeError.code === "PGRST205") {
      throw new Error(
        "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.",
      );
    }
    throw new Error(mapAuthError(employeeError));
  }
}

async function rollbackCompanySignup(companyId) {
  if (!companyId) return;
  await supabase.from("employees").delete().eq("company_id", companyId);
  await supabase.from("companies").delete().eq("id", companyId);
}

export async function signUpCompany({
  companyName,
  adminFullName,
  adminEmail,
  password,
}) {
  const trimmedCompany = String(companyName ?? "").trim();
  const trimmedName = String(adminFullName ?? "").trim();
  const trimmedEmail = String(adminEmail ?? "").trim().toLowerCase();
  const trimmedPassword = String(password ?? "");

  if (!trimmedCompany) throw new Error("اسم المنشأة مطلوب.");
  if (!trimmedName) throw new Error("اسم المدير مطلوب.");
  if (!trimmedEmail) throw new Error("البريد الإلكتروني مطلوب.");
  if (!trimmedPassword) throw new Error("كلمة المرور مطلوبة.");

  let companyId = null;

  try {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name: trimmedCompany })
      .select("id, name")
      .single();

    if (companyError) {
      if (companyError.code === "PGRST205") {
        throw new Error(
          "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.",
        );
      }
      throw new Error(mapAuthError(companyError));
    }

    companyId = company.id;
    await createAdminEmployeeRecord(companyId, trimmedName, trimmedEmail);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: trimmedPassword,
      options: {
        emailRedirectTo: SIGNUP_EMAIL_REDIRECT_URL,
        data: {
          full_name: trimmedName,
          company_id: companyId,
          role: "Admin",
        },
      },
    });

    if (authError) {
      throw new Error(mapAuthError(authError));
    }

    return {
      auth: authData,
      company,
      successMessage: SIGNUP_SUCCESS_MESSAGE,
    };
  } catch (error) {
    await rollbackCompanySignup(companyId);
    throw new Error(mapAuthError(error));
  }
}
