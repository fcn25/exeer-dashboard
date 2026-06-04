const INACTIVE_STATUSES = new Set([
  "مستقيل",
  "منتهي",
  "غير نشط",
  "terminated",
  "inactive",
  "resigned",
  "إجازة بدون راتب",
]);

/** @param {object | null | undefined} employee */
export function isActiveEmployee(employee) {
  const status = String(employee?.employment_status ?? "نشط").trim();
  if (!status) return true;
  const lower = status.toLowerCase();
  for (const inactive of INACTIVE_STATUSES) {
    if (lower === inactive.toLowerCase() || lower.includes(inactive.toLowerCase())) {
      return false;
    }
  }
  return true;
}
