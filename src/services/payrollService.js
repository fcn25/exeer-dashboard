import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import {
  buildPayrollDraftFromEmployee,
  formatPayrollMonthFromPicker,
  mapPayrollRecordRow,
} from "../utils/payroll/calculations.js";

const PAYROLL_EMPLOYEE_FK_HINT =
  "نفّذ SQL ربط payroll_records.employee_id → employees.id (ملف 20250603000001_payroll_employee_fk.sql) ثم حدّث Schema Cache من Supabase Dashboard → Settings → API → Reload schema.";

function isMissingPayrollEmployeeRelationship(error) {
  if (!error) return false;
  if (error.code === "PGRST200") return true;
  return /relationship.*payroll_records.*employees/i.test(error.message ?? "");
}

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql و 20250603000000_payroll_engine.sql في Supabase SQL Editor.";
  }
  if (isMissingPayrollEmployeeRelationship(error)) {
    return `تعذّر ربط جدول المسير بالموظفين. ${PAYROLL_EMPLOYEE_FK_HINT}`;
  }
  if (error.code === "23505") {
    return "سجل المسير موجود مسبقاً لهذا الموظف في نفس الشهر.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

async function queryPayrollRecordsForMonth(companyId, payrollMonth) {
  const { data, error } = await supabase
    .from("payroll_records")
    .select("*, employees ( id, full_name )")
    .eq("company_id", companyId)
    .eq("payroll_month", payrollMonth)
    .order("employee_name", { ascending: true });

  if (!error) return { data: data ?? [], usedFallback: false };

  if (!isMissingPayrollEmployeeRelationship(error)) {
    throw new Error(mapDbError(error));
  }

  const fallback = await supabase
    .from("payroll_records")
    .select("*")
    .eq("company_id", companyId)
    .eq("payroll_month", payrollMonth)
    .order("employee_name", { ascending: true });

  if (fallback.error) throw new Error(mapDbError(fallback.error));

  return { data: fallback.data ?? [], usedFallback: true };
}

const ACTIVE_STATUSES = ["نشط", "Active", "active"];

export async function listActiveEmployees() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, full_name, basic_salary, housing_allowance, other_allowance, nationality, is_saudi, employment_status",
    )
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (error) throw new Error(mapDbError(error));

  return (data ?? []).filter((employee) =>
    ACTIVE_STATUSES.includes(String(employee.employment_status ?? "").trim()),
  );
}

export async function fetchPayrollForMonth(pickerValue) {
  const payrollMonth = formatPayrollMonthFromPicker(pickerValue);
  if (!payrollMonth) {
    return { rows: [], payrollMonth, isLocked: false, schemaWarning: null };
  }

  const companyId = getCompanyId();
  const { data, usedFallback } = await queryPayrollRecordsForMonth(
    companyId,
    payrollMonth,
  );

  const rows = data.map(mapPayrollRecordRow).filter(Boolean);
  const isLocked = rows.some((row) => row.status === "Exported");

  return {
    rows,
    payrollMonth,
    isLocked,
    schemaWarning: usedFallback ? PAYROLL_EMPLOYEE_FK_HINT : null,
  };
}

export async function generatePayrollForMonth(pickerValue) {
  const payrollMonth = formatPayrollMonthFromPicker(pickerValue);
  if (!payrollMonth) {
    throw new Error("يرجى اختيار شهر صالح.");
  }

  const companyId = getCompanyId();
  const existing = await fetchPayrollForMonth(pickerValue);

  if (existing.isLocked) {
    throw new Error(
      "تم تصدير مسير هذا الشهر وهو مقفل. لا يمكن إعادة الإنشاء.",
    );
  }

  const existingEmployeeIds = new Set(
    existing.rows.map((row) => String(row.employeeId)).filter(Boolean),
  );

  const employees = await listActiveEmployees();
  const toCreate = employees.filter(
    (employee) => !existingEmployeeIds.has(String(employee.id)),
  );

  if (toCreate.length > 0) {
    const inserts = toCreate.map((employee) => {
      const draft = buildPayrollDraftFromEmployee(employee, payrollMonth);
      return {
        company_id: companyId,
        employee_id: draft.employee_id,
        employee_name: draft.employee_name,
        payroll_month: draft.payroll_month,
        month: Number(payrollMonth.split("/")[0]),
        year: Number(payrollMonth.split("/")[1]),
        basic_salary: draft.basic_salary,
        housing_allowance: draft.housing_allowance,
        other_allowances: draft.other_allowances,
        allowances: draft.other_allowances,
        commissions: draft.commissions,
        additional: draft.additional,
        penalties: draft.penalties,
        gosi_deduction: draft.gosi_deduction,
        gosi: draft.gosi_deduction,
        lateness_deduction: draft.lateness_deduction,
        delays: draft.lateness_deduction,
        net_salary: draft.net_salary,
        net: draft.net_salary,
        status: "Draft",
      };
    });

    const { error } = await supabase.from("payroll_records").insert(inserts);

    if (error) throw new Error(mapDbError(error));
  }

  return fetchPayrollForMonth(pickerValue);
}

export async function exportPayrollMonth(pickerValue) {
  const payrollMonth = formatPayrollMonthFromPicker(pickerValue);
  if (!payrollMonth) {
    throw new Error("يرجى اختيار شهر صالح.");
  }

  const companyId = getCompanyId();
  const { rows, isLocked } = await fetchPayrollForMonth(pickerValue);

  if (rows.length === 0) {
    throw new Error("لا توجد سجلات مسير لتصديرها.");
  }

  if (isLocked) {
    return { rows, payrollMonth, alreadyExported: true };
  }

  const { error } = await supabase
    .from("payroll_records")
    .update({ status: "Exported" })
    .eq("company_id", companyId)
    .eq("payroll_month", payrollMonth);

  if (error) throw new Error(mapDbError(error));

  const refreshed = await fetchPayrollForMonth(pickerValue);
  return { ...refreshed, alreadyExported: false };
}
