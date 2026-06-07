import { calculateGosiDeduction } from "./gosi.js";
import { calculatePayrollNetSalary } from "./netSalary.js";

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function formatPayrollMonthFromPicker(value) {
  const [year, month] = String(value).split("-").map(Number);
  if (!year || !month) return "";
  return `${String(month).padStart(2, "0")}/${year}`;
}

export function formatPickerFromPayrollMonth(payrollMonth) {
  const [month, year] = String(payrollMonth).split("/").map(Number);
  if (!year || !month) return "";
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function buildPayrollDraftFromEmployee(employee, payrollMonth) {
  const basic = Number(employee.basic_salary) || 0;
  const housing = Number(employee.housing_allowance) || 0;
  const otherAllowances = Number(employee.other_allowance) || 0;
  const commissions = 0;
  const additional = 0;
  const penaltyDeductions = 0;
  const delayDeductions = 0;
  const loanDeductions = 0;

  const { amount: gosi } = calculateGosiDeduction({
    basicSalary: basic,
    housingAllowance: housing,
    employee,
    payrollMonth,
  });

  const draftRow = {
    basic_salary: basic,
    housing_allowance: housing,
    other_allowances: otherAllowances,
    commissions,
    additional,
    penalty_deductions: penaltyDeductions,
    delay_deductions: delayDeductions,
    loan_deductions: loanDeductions,
    gosi_deduction: gosi,
  };
  const net = calculatePayrollNetSalary(draftRow);

  return {
    employee_id: employee.id,
    employee_name: employee.full_name,
    payroll_month: payrollMonth,
    basic_salary: basic,
    housing_allowance: housing,
    other_allowances: otherAllowances,
    commissions,
    additional,
    penalty_deductions: penaltyDeductions,
    delay_deductions: delayDeductions,
    loan_deductions: loanDeductions,
    penalties: penaltyDeductions,
    gosi_deduction: gosi,
    lateness_deduction: delayDeductions,
    net_salary: net,
    status: "Draft",
  };
}

export function mapPayrollRecordRow(row) {
  if (!row) return null;

  return {
    id: String(row.id),
    employeeId: row.employee_id,
    employeeName: String(
      row.employee_name ?? row.employees?.full_name ?? "—",
    ),
    payrollMonth: row.payroll_month,
    basic: Number(row.basic_salary) || 0,
    housing: Number(row.housing_allowance) || 0,
    allowances: Number(row.other_allowances) || 0,
    commissions: Number(row.commissions) || 0,
    additional: Number(row.additional) || 0,
    penalties:
      Number(row.penalty_deductions ?? row.penalties) || 0,
    gosi: Number(row.gosi_deduction ?? row.gosi) || 0,
    lateness:
      Number(
        row.delay_deductions ?? row.lateness_deduction ?? row.delays,
      ) || 0,
    loans: Number(row.loan_deductions) || 0,
    net: Number(row.net_salary ?? row.net) || 0,
    status: row.status ?? "Draft",
  };
}

function safeAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function computePayrollStats(rows) {
  const list = Array.isArray(rows) ? rows : [];

  const totalNet =
    list.reduce((sum, row) => sum + safeAmount(row?.net), 0) || 0;
  const totalDeductions =
    list.reduce(
      (sum, row) =>
        sum +
        safeAmount(row?.penalties) +
        safeAmount(row?.lateness) +
        safeAmount(row?.loans) +
        safeAmount(row?.gosi),
      0,
    ) || 0;

  return {
    employeeCount: list.length || 0,
    totalNet: safeAmount(totalNet),
    totalDeductions: safeAmount(totalDeductions),
  };
}
