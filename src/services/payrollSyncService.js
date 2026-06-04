import { supabase } from "../utils/supabaseClient.js";
import { requireCompanyId, scopeQueryByCompany } from "../utils/tenantScope.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";
import { SALARY_DEDUCTION_ACTION_TYPE } from "../constants/administrativeActions.js";
import { calculateDelayDeduction, resolveEmployeeBaseSalary } from "../utils/attendance/deductions.js";
import { formatPayrollMonthFromPicker } from "../utils/payroll/calculations.js";
import { getMonthBoundsFromPicker } from "../utils/payroll/period.js";
import { calculateSafeProtocolNetSalary } from "../utils/payroll/netSalary.js";
import { fetchPayrollForMonth } from "./payrollService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول غير موجود. نفّذ migrations الخاصة بالمسير والقروض في Supabase.";
  }
  return error.message || "تعذّر مزامنة المسير.";
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

function groupSumByEmployee(rows, valueKey) {
  const map = new Map();
  for (const row of rows ?? []) {
    const id = row.employee_id;
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + (Number(row[valueKey]) || 0));
  }
  return map;
}

function groupPenaltySum(rows) {
  const map = new Map();
  for (const row of rows ?? []) {
    const id = row.employee_id;
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + (Number(row.penalty_amount) || 0));
  }
  return map;
}

async function fetchDelayMinutesByEmployee(companyId, bounds) {
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("attendance_records")
      .select("employee_id, delay_minutes")
      .gte("record_date", bounds.dateFrom)
      .lte("record_date", bounds.dateTo),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));
  return groupSumByEmployee(data, "delay_minutes");
}

async function fetchPenaltyDeductionsByEmployee(companyId, bounds) {
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("administrative_actions")
      .select("employee_id, penalty_amount")
      .eq("action_type", SALARY_DEDUCTION_ACTION_TYPE)
      .gte("action_date", bounds.rangeStartIso)
      .lte("action_date", bounds.rangeEndIso),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));
  return groupPenaltySum(data);
}

async function fetchActiveLoanInstallmentsByEmployee(companyId) {
  let { data, error } = await scopeQueryByCompany(
    supabase
      .from("employee_loans")
      .select("employee_id, monthly_installment, status")
      .eq("status", "active"),
    companyId,
  );

  if (error && isMissingColumnError(error)) {
    return new Map();
  }
  if (error) throw new Error(mapDbError(error));

  const map = new Map();
  for (const row of data ?? []) {
    const status = String(row.status ?? "").toLowerCase();
    if (status !== "active") continue;
    const id = row.employee_id;
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + (Number(row.monthly_installment) || 0));
  }
  return map;
}

async function fetchEmployeesBaseSalaries(companyId, employeeIds) {
  if (!employeeIds.length) return new Map();

  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("employees")
      .select("id, basic_salary, base_salary")
      .in("id", employeeIds),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));

  const map = new Map();
  for (const row of data ?? []) {
    map.set(row.id, resolveEmployeeBaseSalary(row));
  }
  return map;
}

async function fetchPayrollRecordsRaw(companyId, period) {
  let { data, error } = await scopeQueryByCompany(
    supabase
      .from("payroll_records")
      .select("*")
      .eq("payroll_month", period.payrollMonth),
    companyId,
  );

  if (error && String(error.message ?? "").includes("payroll_month")) {
    ({ data, error } = await scopeQueryByCompany(
      supabase
        .from("payroll_records")
        .select("*")
        .eq("month", period.month)
        .eq("year", period.year),
      companyId,
    ));
  }

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

/**
 * Safe Protocol: on-demand sync of delay, penalty, and loan deductions for the month.
 */
export async function syncPayrollDeductionsForMonth(pickerValue) {
  const period = parsePayrollPeriod(pickerValue);
  const bounds = getMonthBoundsFromPicker(pickerValue);
  if (!period || !bounds) {
    throw new Error("يرجى اختيار شهر صالح.");
  }

  const companyId = requireCompanyId("تحديث أرقام المسير");
  const existing = await fetchPayrollForMonth(pickerValue);

  if (existing.isLocked) {
    throw new Error("مسير هذا الشهر مُصدَّر ومقفل — لا يمكن المزامنة.");
  }

  const payrollRows = await fetchPayrollRecordsRaw(companyId, period);
  if (payrollRows.length === 0) {
    throw new Error(
      "لا يوجد مسير لهذا الشهر. أنشئ المسير أولاً ثم اضغط «تحديث أرقام المسير».",
    );
  }

  const employeeIds = [
    ...new Set(payrollRows.map((row) => row.employee_id).filter(Boolean)),
  ];

  const [delayByEmployee, penaltyByEmployee, loanByEmployee, baseSalaries] =
    await Promise.all([
      fetchDelayMinutesByEmployee(companyId, bounds),
      fetchPenaltyDeductionsByEmployee(companyId, bounds),
      fetchActiveLoanInstallmentsByEmployee(companyId),
      fetchEmployeesBaseSalaries(companyId, employeeIds),
    ]);

  let updatedCount = 0;
  let lockedSkipped = 0;

  for (const row of payrollRows) {
    if (row.status === "Exported") {
      lockedSkipped += 1;
      continue;
    }

    const employeeId = row.employee_id;
    const baseSalary =
      baseSalaries.get(employeeId) ?? (Number(row.basic_salary) || 0);
    const totalDelay = delayByEmployee.get(employeeId) ?? 0;

    const delayDeductions = calculateDelayDeduction({
      baseSalary,
      totalDelayMinutes: totalDelay,
    });
    const penaltyDeductions = Math.round(
      (penaltyByEmployee.get(employeeId) ?? 0) * 100,
    ) / 100;
    const loanDeductions = Math.round(
      (loanByEmployee.get(employeeId) ?? 0) * 100,
    ) / 100;

    const merged = {
      ...row,
      delay_deductions: delayDeductions,
      penalty_deductions: penaltyDeductions,
      loan_deductions: loanDeductions,
    };
    const netSalary = calculateSafeProtocolNetSalary(merged);

    const payload = {
      delay_deductions: delayDeductions,
      lateness_deduction: delayDeductions,
      delays: delayDeductions,
      penalty_deductions: penaltyDeductions,
      penalties: penaltyDeductions,
      loan_deductions: loanDeductions,
      net_salary: netSalary,
      net: netSalary,
    };

    const { error } = await scopeQueryByCompany(
      supabase.from("payroll_records").update(payload),
      companyId,
    ).eq("id", row.id);

    if (error) throw new Error(mapDbError(error));
    updatedCount += 1;
  }

  return {
    updatedCount,
    lockedSkipped,
    payrollMonth: period.payrollMonth,
  };
}

const ACCOUNTING_PAYROLL_SELECT = `
  id,
  employee_id,
  employee_name,
  basic_salary,
  housing_allowance,
  transport_allowance,
  delay_deductions,
  penalty_deductions,
  loan_deductions,
  lateness_deduction,
  delays,
  penalties,
  net_salary,
  net,
  employees (
    full_name,
    employee_number,
    bank_name,
    iban
  )
`;

export async function fetchPayrollAccountingRows(pickerValue) {
  const period = parsePayrollPeriod(pickerValue);
  if (!period) throw new Error("يرجى اختيار شهر صالح.");

  const companyId = requireCompanyId("تصدير للمحاسبة");

  let { data, error } = await scopeQueryByCompany(
    supabase
      .from("payroll_records")
      .select(ACCOUNTING_PAYROLL_SELECT)
      .eq("payroll_month", period.payrollMonth)
      .order("employee_name", { ascending: true }),
    companyId,
  );

  if (error && String(error.message ?? "").includes("payroll_month")) {
    ({ data, error } = await scopeQueryByCompany(
      supabase
        .from("payroll_records")
        .select(ACCOUNTING_PAYROLL_SELECT)
        .eq("month", period.month)
        .eq("year", period.year)
        .order("employee_name", { ascending: true }),
      companyId,
    ));
  }

  if (error) throw new Error(mapDbError(error));
  if (!data?.length) {
    throw new Error("لا توجد سجلات مسير لتصدير ملف المحاسبة.");
  }

  return data;
}
