import { supabase } from "../utils/supabaseClient.js";
import { requireCompanyId, scopeQueryByCompany } from "../utils/tenantScope.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";
import { SALARY_DEDUCTION_ACTION_TYPE } from "../constants/administrativeActions.js";
import { calculateDelayDeduction } from "../utils/attendance/deductions.js";
import {
  buildPayrollDraftFromEmployee,
  formatPayrollMonthFromPicker,
} from "../utils/payroll/calculations.js";
import { getMonthBoundsFromPicker } from "../utils/payroll/period.js";
import { calculatePayrollNetSalary } from "../utils/payroll/netSalary.js";
import { ensureActiveEmployeesInPayroll } from "./payrollService.js";
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

function isLoanDueForMonth(loan, payrollMonth) {
  if (!loan?.start_date) return true;
  const [monthPart, yearPart] = String(payrollMonth).split("/");
  const payrollKey = `${yearPart}-${String(monthPart).padStart(2, "0")}`;
  const startKey = String(loan.start_date).slice(0, 7);
  return payrollKey >= startKey;
}

async function fetchActiveLoanInstallmentsByEmployee(companyId, payrollMonth) {
  let { data, error } = await scopeQueryByCompany(
    supabase
      .from("employee_loans")
      .select(
        "id, employee_id, monthly_installment, status, start_date, installments_remaining, last_deducted_month",
      )
      .eq("status", "active"),
    companyId,
  );

  if (error && isMissingColumnError(error)) {
    return { totals: new Map(), dueLoans: [] };
  }
  if (error) throw new Error(mapDbError(error));

  const totals = new Map();
  const dueLoans = [];

  for (const row of data ?? []) {
    const status = String(row.status ?? "").toLowerCase();
    if (status !== "active") continue;
    const employeeId = row.employee_id;
    if (!employeeId) continue;

    const remaining = Number(row.installments_remaining);
    if (Number.isFinite(remaining) && remaining <= 0) continue;
    if (!isLoanDueForMonth(row, payrollMonth)) continue;
    if (row.last_deducted_month === payrollMonth) continue;

    const installment = Number(row.monthly_installment) || 0;
    totals.set(employeeId, (totals.get(employeeId) ?? 0) + installment);
    dueLoans.push(row);
  }

  return { totals, dueLoans };
}

async function markLoanInstallmentsDeducted(companyId, loans, payrollMonth) {
  for (const loan of loans) {
    const remaining = Number(loan.installments_remaining);
    const nextRemaining = Number.isFinite(remaining)
      ? Math.max(0, remaining - 1)
      : null;

    const payload = {
      last_deducted_month: payrollMonth,
      updated_at: new Date().toISOString(),
    };

    if (nextRemaining != null) {
      payload.installments_remaining = nextRemaining;
      if (nextRemaining === 0) payload.status = "closed";
    }

    await scopeQueryByCompany(
      supabase.from("employee_loans").update(payload).eq("id", loan.id),
      companyId,
    );
  }
}

async function fetchEmployeesCompensation(companyId, employeeIds) {
  if (!employeeIds.length) return new Map();

  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("employees")
      .select(
        "id, full_name, basic_salary, housing_allowance, other_allowance, nationality, employment_status",
      )
      .in("id", employeeIds),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));

  const map = new Map();
  for (const row of data ?? []) {
    map.set(row.id, row);
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
  let payrollRows = await fetchPayrollRecordsRaw(companyId, period);
  if (payrollRows.length === 0) {
    throw new Error(
      "لا يوجد مسير لهذا الشهر. أنشئ المسير أولاً ثم اضغط «تحديث أرقام المسير».",
    );
  }

  const { addedCount } = await ensureActiveEmployeesInPayroll(pickerValue);
  if (addedCount > 0) {
    payrollRows = await fetchPayrollRecordsRaw(companyId, period);
  }

  const employeeIds = [
    ...new Set(payrollRows.map((row) => row.employee_id).filter(Boolean)),
  ];

  const [delayByEmployee, penaltyByEmployee, loanResult, compensationByEmployee] =
    await Promise.all([
      fetchDelayMinutesByEmployee(companyId, bounds),
      fetchPenaltyDeductionsByEmployee(companyId, bounds),
      fetchActiveLoanInstallmentsByEmployee(companyId, period.payrollMonth),
      fetchEmployeesCompensation(companyId, employeeIds),
    ]);

  const loanByEmployee = loanResult.totals;
  const dueLoans = loanResult.dueLoans;

  let updatedCount = 0;

  for (const row of payrollRows) {
    const employeeId = row.employee_id;
    const employee = compensationByEmployee.get(employeeId);
    const isExported =
      String(row.status ?? "").trim().toLowerCase() === "exported";

    let basicSalary = Number(row.basic_salary) || 0;
    let housingAllowance = Number(row.housing_allowance) || 0;
    let otherAllowances =
      Number(row.other_allowances ?? row.allowances) || 0;
    let gosiDeduction = Number(row.gosi_deduction ?? row.gosi) || 0;
    let employeeName = row.employee_name;

    if (employee && !isExported) {
      const draft = buildPayrollDraftFromEmployee(employee, period.payrollMonth);
      basicSalary = draft.basic_salary;
      housingAllowance = draft.housing_allowance;
      otherAllowances = draft.other_allowances;
      gosiDeduction = draft.gosi_deduction;
      employeeName = employee.full_name ?? row.employee_name;
    } else if (employee) {
      basicSalary =
        Number(employee.basic_salary) || Number(row.basic_salary) || 0;
      housingAllowance =
        Number(employee.housing_allowance) ||
        Number(row.housing_allowance) ||
        0;
    }

    const totalDelay = delayByEmployee.get(employeeId) ?? 0;

    const delayDeductions = calculateDelayDeduction({
      baseSalary: basicSalary,
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
      basic_salary: basicSalary,
      housing_allowance: housingAllowance,
      other_allowances: otherAllowances,
      allowances: otherAllowances,
      gosi_deduction: gosiDeduction,
      gosi: gosiDeduction,
      commissions: Number(row.commissions) || 0,
      additional: Number(row.additional) || 0,
      delay_deductions: delayDeductions,
      penalty_deductions: penaltyDeductions,
      loan_deductions: loanDeductions,
    };
    const netSalary = calculatePayrollNetSalary(merged);

    const payload = {
      employee_name: employeeName,
      basic_salary: basicSalary,
      housing_allowance: housingAllowance,
      other_allowances: otherAllowances,
      allowances: otherAllowances,
      gosi_deduction: gosiDeduction,
      gosi: gosiDeduction,
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

  if (dueLoans.length) {
    await markLoanInstallmentsDeducted(companyId, dueLoans, period.payrollMonth);
  }

  return {
    updatedCount,
    addedCount,
    payrollMonth: period.payrollMonth,
  };
}

const ACCOUNTING_PAYROLL_SELECT = `
  id,
  employee_id,
  employee_name,
  basic_salary,
  housing_allowance,
  other_allowances,
  allowances,
  commissions,
  additional,
  gosi_deduction,
  gosi,
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
