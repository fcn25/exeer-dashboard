import * as XLSX from "xlsx";
import {
  computePayrollAmounts,
  normalizeIban,
  resolveEmployeeGovernmentId,
  resolveEmployeeIsSaudi,
} from "./wpsValidation.js";

const WPS_HEADERS = [
  "اسم الموظف",
  "الهوية / الإقامة",
  "نوع الهوية",
  "الآيبان",
  "الجنسية",
  "الأساسي",
  "إجمالي الخصومات",
  "مستحقات أخرى",
  "الصافي",
  "وصف الدفع",
  "شهر الاستحقاق",
  "المسمى الوظيفي",
];

function mapWpsReviewRow(record, payrollMonth) {
  const employee = record.employees ?? {};
  const amounts = computePayrollAmounts(record);
  const isSaudi = resolveEmployeeIsSaudi(employee);

  return {
    "اسم الموظف": employee.full_name ?? record.employee_name ?? "",
    "الهوية / الإقامة": resolveEmployeeGovernmentId(employee),
    "نوع الهوية": isSaudi ? "هوية وطنية" : "إقامة",
    الآيبان: normalizeIban(employee.iban),
    الجنسية: employee.nationality ?? "",
    الأساسي: amounts.basic,
    "إجمالي الخصومات": amounts.totalDeductions,
    "مستحقات أخرى": amounts.otherEarnings,
    الصافي: amounts.net,
    "وصف الدفع": `راتب ${record.payroll_month ?? payrollMonth}`,
    "شهر الاستحقاق": record.payroll_month ?? payrollMonth,
    "المسمى الوظيفي": employee.job_title_name ?? "",
  };
}

export function downloadPayrollWpsExcel(records, payrollMonthLabel = "") {
  if (!records?.length) {
    throw new Error("لا توجد سجلات مسير لتصدير ملف WPS.");
  }

  const sheetRows = records.map((record) =>
    mapWpsReviewRow(record, payrollMonthLabel),
  );
  const worksheet = XLSX.utils.json_to_sheet(sheetRows, {
    header: WPS_HEADERS,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "WPS");

  const [monthPart, yearPart] = String(payrollMonthLabel).split("/");
  const fileName =
    monthPart && yearPart
      ? `wps-review-${monthPart}-${yearPart}.xlsx`
      : "wps-review.xlsx";

  XLSX.writeFile(workbook, fileName);
}
