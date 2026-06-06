import {
  buildBulkImportLimitMessage,
  canAddEmployeeCount,
  EMPLOYEE_LIMIT_ERROR_AR,
} from "../utils/employeeLimitGuard.js";
import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { isActiveEmployee } from "../utils/employeeStatus.js";
import { fetchCompanyBilling } from "./billingService.js";
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
    employee_number: form.employee_number?.trim() || null,
    hire_date: form.hire_date || null,
    contract_type: form.contract_type || "دوام كامل",
    employment_status: form.employment_status || "نشط",
    role: form.role || "Employee",
    direct_manager_name: form.direct_manager_name?.trim() || null,
    job_title_name: form.job_title_name?.trim() || null,
    work_location_id: form.work_location_id ? form.work_location_id : null,
    department: form.department?.trim() || null,
    basic_salary: Number(form.basic_salary) || 0,
    housing_allowance: Number(form.housing_allowance) || 0,
    other_allowance: Number(form.other_allowance) || 0,
    bank_name: form.bank_name?.trim() || null,
    iban: form.iban?.trim() || null,
    transport_allowance: Number(form.transport_allowance) || 0,
  };
}

export async function countCompanyEmployees() {
  const companyId = getCompanyId();
  const { count, error } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) throw new Error(mapDbError(error));
  return count ?? 0;
}

async function assertCanAddEmployees(toAdd) {
  const [billing, employeeCount] = await Promise.all([
    fetchCompanyBilling(),
    countCompanyEmployees(),
  ]);
  const check = canAddEmployeeCount(employeeCount, toAdd, billing.subscription_tier);
  if (!check.allowed) {
    throw new Error(
      toAdd === 1
        ? EMPLOYEE_LIMIT_ERROR_AR
        : buildBulkImportLimitMessage({
            currentCount: employeeCount,
            importCount: toAdd,
            tier: billing.subscription_tier,
          }),
    );
  }
}

const EMPLOYEE_DIRECTORY_SELECT =
  "id, full_name, employee_number, department, email, phone_number, employment_status, job_title_name, work_location_id, company_branches ( id, name )";

export async function listEmployees() {
  const companyId = getCompanyId();
  let { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_DIRECTORY_SELECT)
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (error && /company_branches|relationship/i.test(error.message ?? "")) {
    const fallback = await supabase
      .from("employees")
      .select(
        "id, full_name, employee_number, department, email, phone_number, employment_status, job_title_name, work_location_id",
      )
      .eq("company_id", companyId)
      .order("full_name", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function updateEmployeeWorkLocation(employeeId, workLocationId) {
  const companyId = getCompanyId();
  const id = Number(employeeId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("معرّف الموظف غير صالح.");
  }

  const payload = {
    work_location_id: workLocationId || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("employees")
    .update(payload)
    .eq("company_id", companyId)
    .eq("id", id)
    .select(EMPLOYEE_DIRECTORY_SELECT)
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

/** Active employees for assignments, performance, and payroll (no payroll module dependency). */
export async function listActiveEmployees() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, full_name, email, department, basic_salary, housing_allowance, transport_allowance, other_allowance, nationality, employment_status, job_title_name",
    )
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return (data ?? []).filter(isActiveEmployee);
}

export async function getEmployeeById(employeeId) {
  const companyId = getCompanyId();
  let { data, error } = await supabase
    .from("employees")
    .select("*, company_branches ( id, name )")
    .eq("company_id", companyId)
    .eq("id", employeeId)
    .maybeSingle();

  if (error && /company_branches|relationship/i.test(error.message ?? "")) {
    const fallback = await supabase
      .from("employees")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", employeeId)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function createEmployee(form) {
  await assertCanAddEmployees(1);

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
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("لا توجد سجلات للاستيراد.");
  }

  await assertCanAddEmployees(rows.length);
  const companyId = getCompanyId();

  const { data: lastEmp } = await supabase
    .from("employees")
    .select("employee_number")
    .eq("company_id", companyId)
    .not("employee_number", "is", null)
    .order("employee_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastNum = parseInt(
    lastEmp?.employee_number?.replace(/\D/g, "") || "0",
    10,
  );

  const payload = rows
    .map((row, index) => ({
      company_id: companyId,
      full_name: String(row.full_name ?? "").trim(),
      email: String(row.email ?? "").trim().toLowerCase() || null,
      phone_number: String(row.phone_number ?? "").trim() || null,
      gender: row.gender || "ذكر",
      date_of_birth: row.date_of_birth || null,
      nationality: String(row.nationality ?? "").trim() || null,
      id_number: row.id_number ? Number(row.id_number) : null,
      national_address: String(row.national_address ?? "").trim() || null,
      employee_number:
        String(row.employee_number ?? "").trim() ||
        `EMP-${String(lastNum + index + 1).padStart(3, "0")}`,
      hire_date: row.hire_date || null,
      contract_type: row.contract_type || "دوام كامل",
      employment_status: row.employment_status || "نشط",
      role: "Employee",
      direct_manager_name: String(row.direct_manager_name ?? "").trim() || null,
      job_title_name: String(row.job_title_name ?? "").trim() || null,
      department: String(row.department ?? "").trim() || null,
      basic_salary: Number(row.basic_salary) || 0,
      housing_allowance: Number(row.housing_allowance) || 0,
      transport_allowance: Number(row.transport_allowance) || 0,
      other_allowance: Number(row.other_allowance) || 0,
      bank_name: String(row.bank_name ?? "").trim() || null,
      iban: String(row.iban ?? "").trim() || null,
    }))
    .filter((row) => row.full_name);

  const { data, error } = await supabase
    .from("employees")
    .insert(payload)
    .select("id, full_name, email");

  if (error) throw new Error(mapDbError(error));

  let invitesSent = 0;
  let invitesSkippedNoEmail = 0;

  if (sendInvites) {
    const emailsToInvite = data.filter((emp) => emp.email);
    invitesSkippedNoEmail = data.length - emailsToInvite.length;

    for (const emp of emailsToInvite) {
      try {
        await inviteEmployeeByEmail({
          email: emp.email,
          fullName: emp.full_name,
          role: "Employee",
          companyId,
          employeeId: emp.id,
        });
        invitesSent += 1;
      } catch (err) {
        console.error(`فشل إرسال دعوة لـ ${emp.email}:`, err.message);
      }
    }
  }

  return {
    imported: data.length,
    invitesSent,
    invitesSkippedNoEmail,
    rows: data,
    inviteErrors: [],
  };
}

export async function listEmployeesWithoutAuthAccount() {
  const { data, error } = await supabase.rpc(
    "list_employees_without_auth_account",
    {
      p_company_id: getCompanyId(),
    },
  );

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function inviteEmployeesWithoutAccounts() {
  const companyId = getCompanyId();
  const employees = await listEmployeesWithoutAuthAccount();
  let invitesSent = 0;

  console.log("الموظفون بدون حساب:", employees);

  for (const emp of employees) {
    console.log("إرسال دعوة لـ:", emp.email);
    try {
      const result = await inviteEmployeeByEmail({
        email: emp.email,
        fullName: emp.full_name,
        role: "Employee",
        companyId,
        employeeId: emp.id,
      });
      console.log("نجح:", result);
      invitesSent += 1;
    } catch (err) {
      console.log("فشل:", err.message);
    }
  }

  return { invitesSent, total: employees.length };
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
