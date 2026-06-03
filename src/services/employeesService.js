import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
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
    iban: form.iban?.trim() || null,
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

  const created = [];
  const failed = [];
  let invitesSent = 0;

  for (const row of rows) {
    const email = String(row.email ?? "").trim();
    try {
      const { data, error } = await supabase
        .from("employees")
        .insert({
          company_id: companyId,
          ...employeeFormToRow(row),
        })
        .select("id, full_name, email")
        .single();

      if (error) throw error;

      created.push(data);

      if (sendInvites && email) {
        try {
          await inviteEmployeeByEmail({
            email,
            fullName: row.full_name,
            role: row.role || "Employee",
            companyId,
            employeeId: data.id,
          });
          invitesSent += 1;
        } catch {
          // Row saved; invite can be retried later
        }
      }
    } catch (error) {
      failed.push({
        full_name: row.full_name,
        email: email || null,
        message: mapDbError(error),
      });
    }
  }

  if (created.length === 0) {
    const hint =
      failed.some((item) =>
        /email|duplicate|unique|بريد/i.test(item.message ?? ""),
      ) || failed.some((item) => item.email);
    throw new Error(
      hint
        ? "خطأ في بعض السجلات، يرجى التأكد من صحة البريد الإلكتروني."
        : failed[0]?.message || "تعذّر استيراد الموظفين.",
    );
  }

  return {
    imported: created.length,
    failed,
    invitesSent,
    rows: created,
    partial: failed.length > 0,
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
