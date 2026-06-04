import { supabase } from "../utils/supabaseClient.js";
import { requireCompanyId, scopeQueryByCompany } from "../utils/tenantScope.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";
import {
  buildPayrollDraftFromEmployee,
  formatPayrollMonthFromPicker,
  mapPayrollRecordRow,
} from "../utils/payroll/calculations.js";

export const PAYROLL_SCHEMA_FIX_HINT =
  "نفّذ ملف supabase/migrations/20250624000000_payroll_records_columns.sql أو supabase/scripts/fix_payroll_records_schema.sql في Supabase SQL Editor ثم أعد تحميل Schema Cache.";

const PAYROLL_EMPLOYEE_FK_HINT =
  "نفّذ SQL ربط payroll_records.employee_id → employees.id (ملف 20250603000001_payroll_employee_fk.sql) ثم حدّث Schema Cache.";

const INACTIVE_STATUSES = new Set([
  "مستقيل",
  "منتهي",
  "غير نشط",
  "terminated",
  "inactive",
  "resigned",
  "إجازة بدون راتب",
]);

function isMissingPayrollEmployeeRelationship(error) {
  if (!error) return false;
  if (error.code === "PGRST200") return true;
  return /relationship.*payroll_records.*employees/i.test(error.message ?? "");
}

function isMissingPayrollMonthColumn(error) {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return message.includes("payroll_month") && message.includes("does not exist");
}

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جداول قاعدة البيانات غير جاهزة. نفّذ ملف supabase/migrations/20250602000000_exeer_schema.sql و 20250603000000_payroll_engine.sql في Supabase SQL Editor.";
  }
  if (isMissingColumnError(error) || isMissingPayrollMonthColumn(error)) {
    return `عمود payroll_month غير موجود. ${PAYROLL_SCHEMA_FIX_HINT}`;
  }
  if (isMissingPayrollEmployeeRelationship(error)) {
    return `تعذّر ربط جدول المسير بالموظفين. ${PAYROLL_EMPLOYEE_FK_HINT}`;
  }
  if (error.code === "23505") {
    return "سجل المسير موجود مسبقاً لهذا الموظف في نفس الشهر.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

function parsePayrollPeriod(pickerValue) {
  const payrollMonth = formatPayrollMonthFromPicker(pickerValue);
  if (!payrollMonth) return null;
  const [monthPart, yearPart] = payrollMonth.split("/");
  const month = Number(monthPart);
  const year = Number(yearPart);
  if (!month || !year) return null;
  return { payrollMonth, month, year };
}

function isActiveEmployee(employee) {
  const status = String(employee.employment_status ?? "نشط").trim();
  if (!status) return true;
  const lower = status.toLowerCase();
  for (const inactive of INACTIVE_STATUSES) {
    if (lower === inactive.toLowerCase() || lower.includes(inactive.toLowerCase())) {
      return false;
    }
  }
  return true;
}

function buildPayrollRecordPayload(companyId, draft, period, includePayrollMonth) {
  const payload = {
    company_id: companyId,
    employee_id: draft.employee_id,
    employee_name: draft.employee_name,
    month: period.month,
    year: period.year,
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

  if (includePayrollMonth) {
    payload.payroll_month = draft.payroll_month;
  }

  return payload;
}

async function queryPayrollByPayrollMonth(companyId, payrollMonth) {
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("payroll_records")
      .select("*, employees ( id, full_name )")
      .eq("payroll_month", payrollMonth),
    companyId,
  ).order("employee_name", { ascending: true });

  if (!error) return { data: data ?? [], usedFallback: false, mode: "payroll_month" };

  if (!isMissingPayrollMonthColumn(error) && !isMissingPayrollEmployeeRelationship(error)) {
    throw new Error(mapDbError(error));
  }

  if (isMissingPayrollEmployeeRelationship(error)) {
    const plain = await scopeQueryByCompany(
      supabase.from("payroll_records").select("*").eq("payroll_month", payrollMonth),
      companyId,
    ).order("employee_name", { ascending: true });
    if (plain.error && !isMissingPayrollMonthColumn(plain.error)) {
      throw new Error(mapDbError(plain.error));
    }
    if (!plain.error) {
      return { data: plain.data ?? [], usedFallback: true, mode: "payroll_month" };
    }
  }

  return null;
}

async function queryPayrollByLegacyMonthYear(companyId, month, year) {
  const { data, error } = await scopeQueryByCompany(
    supabase.from("payroll_records").select("*").eq("month", month).eq("year", year),
    companyId,
  ).order("employee_name", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return { data: data ?? [], usedFallback: true, mode: "month_year" };
}

async function queryPayrollRecordsForMonth(companyId, period) {
  const byMonth = await queryPayrollByPayrollMonth(
    companyId,
    period.payrollMonth,
  );
  if (byMonth) return byMonth;

  return queryPayrollByLegacyMonthYear(companyId, period.month, period.year);
}

async function findExistingRecord(companyId, period, employeeId, includePayrollMonth) {
  if (includePayrollMonth) {
    const { data } = await scopeQueryByCompany(
      supabase
        .from("payroll_records")
        .select("id, status, employee_id")
        .eq("payroll_month", period.payrollMonth)
        .eq("employee_id", employeeId),
      companyId,
    ).maybeSingle();
    if (data) return data;
  }

  const { data: legacy } = await scopeQueryByCompany(
    supabase
      .from("payroll_records")
      .select("id, status, employee_id")
      .eq("month", period.month)
      .eq("year", period.year)
      .eq("employee_id", employeeId),
    companyId,
  ).maybeSingle();

  return legacy;
}

export async function listActiveEmployees() {
  const companyId = requireCompanyId("توليد المسير");
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("employees")
      .select(
        "id, full_name, email, department, basic_salary, housing_allowance, other_allowance, nationality, is_saudi, employment_status",
      ),
    companyId,
  ).order("full_name", { ascending: true });

  if (error) throw new Error(mapDbError(error));

  return (data ?? []).filter(isActiveEmployee);
}

export async function fetchPayrollForMonth(pickerValue) {
  const period = parsePayrollPeriod(pickerValue);
  if (!period) {
    return { rows: [], payrollMonth: "", isLocked: false, schemaWarning: null };
  }

  const companyId = requireCompanyId("تحميل المسير");
  const { data, usedFallback, mode } = await queryPayrollRecordsForMonth(
    companyId,
    period,
  );

  const rows = data.map(mapPayrollRecordRow).filter(Boolean);
  const isLocked = rows.some((row) => row.status === "Exported");

  let schemaWarning = null;
  if (usedFallback && mode === "payroll_month") {
    schemaWarning = PAYROLL_EMPLOYEE_FK_HINT;
  }
  if (mode === "month_year") {
    schemaWarning = PAYROLL_SCHEMA_FIX_HINT;
  }

  return {
    rows,
    payrollMonth: period.payrollMonth,
    isLocked,
    schemaWarning,
  };
}

export async function generatePayrollForMonth(pickerValue) {
  const period = parsePayrollPeriod(pickerValue);
  if (!period) {
    throw new Error("يرجى اختيار شهر صالح.");
  }

  const companyId = requireCompanyId("إنشاء المسير الشهري");
  const existing = await fetchPayrollForMonth(pickerValue);

  if (existing.isLocked) {
    throw new Error(
      "تم تصدير مسير هذا الشهر وهو مقفل. لا يمكن إعادة الإنشاء.",
    );
  }

  const employees = await listActiveEmployees();
  if (employees.length === 0) {
    throw new Error(
      "لا يوجد موظفون نشطون. أضف موظفين بحالة «نشط» من صفحة الموظفين أولاً.",
    );
  }

  let includePayrollMonth = true;
  let upsertError = null;

  for (const employee of employees) {
    const draft = buildPayrollDraftFromEmployee(employee, period.payrollMonth);
    let payload = buildPayrollRecordPayload(
      companyId,
      draft,
      period,
      includePayrollMonth,
    );

    let existingRow = await findExistingRecord(
      companyId,
      period,
      employee.id,
      includePayrollMonth,
    );

    if (existingRow?.status === "Exported") continue;

    if (existingRow?.id) {
      const { error } = await scopeQueryByCompany(
        supabase.from("payroll_records").update(payload),
        companyId,
      ).eq("id", existingRow.id);
      if (error) upsertError = error;
      continue;
    }

    let { error } = await supabase.from("payroll_records").insert(payload);

    if (
      error &&
      includePayrollMonth &&
      (isMissingPayrollMonthColumn(error) || isMissingColumnError(error))
    ) {
      includePayrollMonth = false;
      payload = buildPayrollRecordPayload(companyId, draft, period, false);
      existingRow = await findExistingRecord(companyId, period, employee.id, false);
      if (existingRow?.status === "Exported") continue;
      if (existingRow?.id) {
        ({ error } = await scopeQueryByCompany(
          supabase.from("payroll_records").update(payload),
          companyId,
        ).eq("id", existingRow.id));
      } else {
        ({ error } = await supabase.from("payroll_records").insert(payload));
      }
    }

    if (error && !upsertError) upsertError = error;
  }

  if (upsertError) throw new Error(mapDbError(upsertError));

  return fetchPayrollForMonth(pickerValue);
}

export async function exportPayrollMonth(pickerValue) {
  const period = parsePayrollPeriod(pickerValue);
  if (!period) {
    throw new Error("يرجى اختيار شهر صالح.");
  }

  const companyId = requireCompanyId("تصدير المسير");
  const { rows, isLocked } = await fetchPayrollForMonth(pickerValue);

  if (rows.length === 0) {
    throw new Error("لا توجد سجلات مسير لتصديرها.");
  }

  if (isLocked) {
    return { rows, payrollMonth: period.payrollMonth, alreadyExported: true };
  }

  if (period.payrollMonth) {
    const byMonth = await scopeQueryByCompany(
      supabase
        .from("payroll_records")
        .update({ status: "Exported" })
        .eq("payroll_month", period.payrollMonth),
      companyId,
    );
    if (byMonth.error && isMissingPayrollMonthColumn(byMonth.error)) {
      const legacy = await scopeQueryByCompany(
        supabase
          .from("payroll_records")
          .update({ status: "Exported" })
          .eq("month", period.month)
          .eq("year", period.year),
        companyId,
      );
      if (legacy.error) throw new Error(mapDbError(legacy.error));
    } else if (byMonth.error) {
      throw new Error(mapDbError(byMonth.error));
    }
  }

  const refreshed = await fetchPayrollForMonth(pickerValue);
  return { ...refreshed, alreadyExported: false };
}
