/**
 * Display helper — use "غير محدد" only when the DB value is null/empty.
 * Numeric zero is a real value and is shown as-is.
 */
export function formatDisplayValue(value, options = {}) {
  const { suffix = "", asNumber = false } = options;

  if (value == null) return "غير محدد";
  if (typeof value === "string" && value.trim() === "") return "غير محدد";

  if (asNumber) {
    const num = Number(value);
    if (Number.isNaN(num)) return "غير محدد";
    const formatted = new Intl.NumberFormat("ar-SA", {
      maximumFractionDigits: suffix ? 2 : 0,
    }).format(num);
    return suffix ? `${formatted} ${suffix}` : formatted;
  }

  return `${String(value).trim()}${suffix ? ` ${suffix}` : ""}`;
}
