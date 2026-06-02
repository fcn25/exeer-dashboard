import { supabase } from "../utils/supabaseClient.js";

function mapAuthError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر إكمال العملية.";
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

export async function signUpCompany({
  companyName,
  adminFullName,
  adminEmail,
  password,
}) {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: companyName.trim() })
    .select()
    .single();

  if (companyError) {
    if (companyError.code === "PGRST205") {
      throw new Error(
        "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.",
      );
    }
    throw new Error(mapAuthError(companyError));
  }

  await createAdminEmployeeRecord(company.id, adminFullName, adminEmail);

  const { data, error } = await supabase.auth.signUp({
    email: adminEmail.trim(),
    password,
    options: {
      data: {
        full_name: adminFullName.trim(),
        company_id: company.id,
        role: "Admin",
      },
    },
  });

  if (error) throw new Error(mapAuthError(error));
  return { auth: data, company };
}
