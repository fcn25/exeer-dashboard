export const PAYROLL_DETAIL_COLUMNS = [
  { key: "employeeName", label: "اسم الموظف", tone: "neutral" },
  { key: "basic", label: "الأساسي", tone: "neutral" },
  { key: "housing", label: "السكن", tone: "neutral" },
  { key: "allowances", label: "البدلات", tone: "addition" },
  { key: "commissions", label: "العمولات", tone: "addition" },
  { key: "additional", label: "الإضافي", tone: "addition" },
  { key: "penalties", label: "جزاءات", tone: "deduction" },
  { key: "gosi", label: "GOSI", tone: "deduction" },
  { key: "lateness", label: "تأخيرات", tone: "deduction" },
  { key: "loans", label: "السلف", tone: "deduction" },
  { key: "net", label: "الصافي", tone: "neutral" },
];

export const PAYROLL_HEADER_TONE_CLASS = {
  neutral: "bg-gray-50 text-slate-900",
  addition: "bg-emerald-50 text-emerald-800",
  deduction: "bg-red-50 text-red-800",
};

export const PAYROLL_DEDUCTION_KEYS = new Set([
  "penalties",
  "gosi",
  "lateness",
  "loans",
]);

export const ARABIC_MONTHS = [
  { value: "", label: "كل الأشهر" },
  { value: "1", label: "يناير" },
  { value: "2", label: "فبراير" },
  { value: "3", label: "مارس" },
  { value: "4", label: "أبريل" },
  { value: "5", label: "مايو" },
  { value: "6", label: "يونيو" },
  { value: "7", label: "يوليو" },
  { value: "8", label: "أغسطس" },
  { value: "9", label: "سبتمبر" },
  { value: "10", label: "أكتوبر" },
  { value: "11", label: "نوفمبر" },
  { value: "12", label: "ديسمبر" },
];

export function safePayrollAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function formatPayrollCurrency(value) {
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safePayrollAmount(value));
}
