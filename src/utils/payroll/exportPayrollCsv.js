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
];

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Download table rows as Exeer_Payroll.csv */
export function downloadPayrollTableCsv(rows) {
  if (!rows?.length) {
    throw new Error("لا توجد بيانات في الجدول للتصدير.");
  }

  const headerLine = EXPORT_COLUMNS.map((c) => c.header).join(",");
  const dataLines = rows.map((row) =>
    EXPORT_COLUMNS.map((c) => escapeCsvCell(row[c.key])).join(","),
  );
  const content = `\uFEFF${headerLine}\n${dataLines.join("\n")}\n`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "Exeer_Payroll.csv";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
