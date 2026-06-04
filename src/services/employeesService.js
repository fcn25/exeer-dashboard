import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { isActiveEmployee } from "../utils/employeeStatus.js";
import { inviteEmployeeByEmail } from "./employeeInviteService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql في Supabase SQL Editor.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

export function employeeFormToRow(form) {
  return {
    full_name: form.full_name?.trim(),
    email: form.email?.trim() || null,
    phone_number: form.phone_number?.trim() || null,
    gender: form.gender || "ذكر",
    date_of_birth: form.date_of_birth || null,
    nationality: form.nationality?.trim() || null,
    id_number: form.id_number ? Number(form.id_number) : null,
    national_address: form.national_address?.trim() || null,
    address: form.national_address?.trim() || form.address?.trim() || null,
    image: form.image?.trim() || null,
    employee_number: form.employee_number?.trim() || null,
    hire_date: form.hire_date || null,
    contract_type: form.contract_type || "دوام كامل",
    employment_status: form.employment_status || "نشط",
    role: form.role || "Employee",
    direct_manager_name: form.direct_manager_name?.trim() || null,
    job_title_name: form.job_title_name?.trim() || null,
    work_location_name: form.work_location_name?.trim() || null,
    department: form.department?.trim() || null,
    basic_salary: Number(form.basic_salary) || 0,
    housing_allowance: Number(form.housing_allowance) || 0,
    other_allowance: Number(form.other_allowance) || 0,
    bank_name: form.bank_name?.trim() || null,
    iban: form.iban?.trim() || null,
    transport_allowance: Number(form.transport_allowance) || 0,
  };
}

export async function listEmployees() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, full_name, employee_number, department, email, phone_number, employment_status, job_title_name",
    )
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

/** Active employees for assignments, performance, and payroll (no payroll module dependency). */
export async function listActiveEmployees() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, full_name, email, department, basic_salary, housing_allowance, transport_allowance, other_allowance, nationality, is_saudi, employment_status, job_title_name",
    )
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return (data ?? []).filter(isActiveEmployee);
}

export async function getEmployeeById(employeeId) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function createEmployee(form) {
  const companyId = getCompanyId();
  const email = String(form.email ?? "").trim();

  const { data, error } = await supabase
    .from("employees")
    .insert({
      company_id: companyId,
      ...employeeFormToRow(form),
    })
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));

  if (email) {
    try {
      await inviteEmployeeByEmail({
        email,
        fullName: form.full_name,
        role: form.role || "Employee",
        companyId,
        employeeId: data.id,
      });
    } catch (inviteError) {
      await supabase.from("employees").delete().eq("id", data.id);
      throw new Error(
        inviteError.message ||
          "تعذّر إرسال دعوة الدخول. تأكد من نشر Edge Function: invite-employee.",
      );
    }
  }

  return {
    ...data,
    invitationSent: Boolean(email),
  };
}

export async function bulkCreateEmployees(rows, { sendInvites = false } = {}) {
  const companyId = getCompanyId();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("لا توجد سجلات للاستيراد.");
  }

  const payload = rows.map((row) => ({
    company_id: companyId,
    ...employeeFormToRow(row),
  }));

  const { data, error } = await supabase
    .from("employees")
    .insert(payload)
    .select("id, full_name, email");

  if (error) throw new Error(mapDbError(error));

  let invitesSent = 0;
  if (sendInvites) {
    for (const employee of data ?? []) {
      const email = String(employee.email ?? "").trim();
      if (!email) continue;
      try {
        await inviteEmployeeByEmail({
          email,
          fullName: employee.full_name,
          role: "Employee",
          companyId,
          employeeId: employee.id,
        });
        invitesSent += 1;
      } catch {
        // Keep imported rows; invites can be retried individually
      }
    }
  }

  return {
    imported: data?.length ?? 0,
    invitesSent,
    rows: data ?? [],
  };
}

export async function updateEmployee(employeeId, form) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employees")
    .update({
      ...employeeFormToRow(form),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", employeeId)
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function listEmployeesForTasks() {
  const rows = await listEmployees();
  return rows
    .map((item) => ({
      id: Number(item.id),
      name: String(item.full_name ?? "").trim(),
    }))
    .filter((item) => !Number.isNaN(item.id) && item.name);
}
