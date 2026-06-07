const INACTIVE_STATUSES = new Set([
  "مستقيل",
  "منتهي",
  "غير نشط",
  "terminated",
  "inactive",
  "resigned",
  "إجازة بدون راتب",
]);

const ACTIVE_STATUS_ALIASES = new Set([
  "نشط",
  "active",
  "employed",
  "on duty",
]);

/** @param {object | null | undefined} employee */
export function isActiveEmployee(employee) {
  const status = String(employee?.employment_status ?? "نشط").trim();
  if (!status) return true;
  const lower = status.toLowerCase();
  if (ACTIVE_STATUS_ALIASES.has(lower)) return true;
  for (const inactive of INACTIVE_STATUSES) {
    const token = inactive.toLowerCase();
    if (lower === token || lower.includes(token)) {
      return false;
    }
  }
  return true;
}
