import * as XLSX from "xlsx";

const EXPORT_HEADERS = [
  { key: "employeeName", header: "اسم الموظف" },
  { key: "basic", header: "الأساسي" },
  { key: "housing", header: "السكن" },
  { key: "allowances", header: "البدلات" },
  { key: "commissions", header: "العمولات" },
  { key: "additional", header: "الإضافي" },
  { key: "penalties", header: "جزاءات" },
  { key: "gosi", header: "GOSI" },
  { key: "lateness", header: "تأخيرات" },
  { key: "net", header: "الصافي" },
  { key: "status", header: "الحالة" },
];

export function downloadPayrollExcel(rows, payrollMonth) {
  const sheetRows = rows.map((row) => {
    const record = {};
    for (const column of EXPORT_HEADERS) {
      record[column.header] = row[column.key];
    }
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "مسير الرواتب");

  const safeMonth = payrollMonth.replace("/", "-");
  XLSX.writeFile(workbook, `payroll-${safeMonth}.xlsx`);
}
