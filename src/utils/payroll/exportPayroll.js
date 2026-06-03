const EXPORT_COLUMNS = [
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

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Download current payroll grid as Exeer_Payroll.csv */
export function downloadPayrollCsv(rows, filename = "Exeer_Payroll.csv") {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("لا توجد بيانات لتصديرها.");
  }

  const headerLine = EXPORT_COLUMNS.map((col) => col.header).join(",");
  const dataLines = rows.map((row) =>
    EXPORT_COLUMNS.map((col) => escapeCsvCell(row[col.key])).join(","),
  );
  const content = `\uFEFF${headerLine}\n${dataLines.join("\n")}\n`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadPayrollExcel(rows) {
  downloadPayrollCsv(rows, "Exeer_Payroll.csv");
}
