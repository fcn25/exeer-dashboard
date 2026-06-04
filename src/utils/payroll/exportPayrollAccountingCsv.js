import { calculateSafeProtocolNetSalary } from "./netSalary.js";

const ACCOUNTING_HEADERS = [
  "الرقم الوظيفي",
  "اسم الموظف",
  "اسم البنك",
  "الآيبان",
  "الراتب الأساسي",
  "بدل السكن",
  "بدل النقل",
  "خصومات التأخير",
  "الجزاءات",
  "أقساط السلف",
  "الصافي",
];

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

function mapAccountingRow(record) {
  const employee = record.employees ?? {};
  const delay =
    record.delay_deductions ??
    record.lateness_deduction ??
    record.delays ??
    0;
  const penalties =
    record.penalty_deductions ?? record.penalties ?? 0;
  const loans = record.loan_deductions ?? 0;
  const net =
    record.net_salary ??
    record.net ??
    calculateSafeProtocolNetSalary(record);

  return [
    employee.employee_number ?? "",
    employee.full_name ?? record.employee_name ?? "",
    employee.bank_name ?? "",
    employee.iban ?? "",
    formatMoney(record.basic_salary),
    formatMoney(record.housing_allowance),
    formatMoney(record.transport_allowance),
    formatMoney(delay),
    formatMoney(penalties),
    formatMoney(loans),
    formatMoney(net),
  ];
}

/** Finance CSV — includes bank/IBAN; not shown in the payroll grid. */
export function downloadPayrollAccountingCsv(payrollRecords, payrollMonthLabel = "") {
  if (!payrollRecords?.length) {
    throw new Error("لا توجد سجلات مسير لتصدير ملف المحاسبة.");
  }

  const lines = [
    ACCOUNTING_HEADERS.map(escapeCsvCell).join(","),
    ...payrollRecords.map((record) =>
      mapAccountingRow(record).map(escapeCsvCell).join(","),
    ),
  ];

  const content = `\uFEFF${lines.join("\r\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const monthSuffix = payrollMonthLabel
    ? `_${String(payrollMonthLabel).replace("/", "-")}`
    : "";
  anchor.download = `Exeer_Payroll_Accounting${monthSuffix}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
