import * as XLSX from "xlsx";

const ACCOUNTING_HEADERS = [
  "رقم الموظف",
  "الاسم الكامل",
  "البنك",
  "IBAN",
  "الأساسي",
  "السكن",
  "بدلات أخرى",
  "العمولات",
  "الإضافي",
  "إجمالي المستحقات",
  "GOSI",
  "الجزاءات",
  "التأخيرات",
  "القروض",
  "إجمالي الخصومات",
  "الصافي",
];

function safeAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function mapAccountingExportRow(record) {
  const employee = record.employees ?? {};
  const basic = safeAmount(record.basic_salary);
  const housing = safeAmount(record.housing_allowance);
  const other = safeAmount(record.other_allowances ?? record.allowances);
  const commissions = safeAmount(record.commissions);
  const additional = safeAmount(record.additional);
  const totalEarnings = basic + housing + other + commissions + additional;

  const gosi = safeAmount(record.gosi_deduction ?? record.gosi);
  const penalties = safeAmount(record.penalty_deductions ?? record.penalties);
  const lateness = safeAmount(
    record.delay_deductions ?? record.lateness_deduction ?? record.delays,
  );
  const loans = safeAmount(record.loan_deductions);
  const totalDeductions = gosi + penalties + lateness + loans;
  const net = safeAmount(record.net_salary ?? record.net);

  return {
    "رقم الموظف": employee.employee_number ?? "",
    "الاسم الكامل": employee.full_name ?? record.employee_name ?? "",
    البنك: employee.bank_name ?? "",
    IBAN: employee.iban ?? "",
    الأساسي: basic,
    السكن: housing,
    "بدلات أخرى": other,
    العمولات: commissions,
    الإضافي: additional,
    "إجمالي المستحقات": totalEarnings,
    GOSI: gosi,
    الجزاءات: penalties,
    التأخيرات: lateness,
    القروض: loans,
    "إجمالي الخصومات": totalDeductions,
    الصافي: net,
  };
}

export function downloadPayrollAccountingExcel(records, payrollMonthLabel = "") {
  if (!records?.length) {
    throw new Error("لا توجد سجلات مسير لتصدير ملف المحاسبة.");
  }

  const sheetRows = records.map(mapAccountingExportRow);
  const worksheet = XLSX.utils.json_to_sheet(sheetRows, {
    header: ACCOUNTING_HEADERS,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "مسير الرواتب");

  const [monthPart, yearPart] = String(payrollMonthLabel).split("/");
  const fileName =
    monthPart && yearPart
      ? `payroll-${monthPart}-${yearPart}.xlsx`
      : "payroll.xlsx";

  XLSX.writeFile(workbook, fileName);
}
