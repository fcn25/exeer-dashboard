import { normalizeAppRole } from "../constants/roles.js";
import { supabase } from "../utils/supabaseClient.js";

export const CURRENT_EMPLOYEE_SELECT =
  "id, company_id, auth_user_id, full_name, email, role, department, job_title_name, employment_status, employee_number, direct_manager_name, work_location_id, phone_number, hire_date";

let sessionCache = null;

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر تحميل بيانات الموظف.";
}

export function normalizeCurrentEmployee(row, authUserId) {
  if (!authUserId) return null;

  const employeeId = row?.id != null ? Number(row.id) : null;
  const companyId = row?.company_id != null ? Number(row.company_id) : null;

  return {
    authUserId,
    employeeId: Number.isFinite(employeeId) && employeeId > 0 ? employeeId : null,
    companyId: Number.isFinite(companyId) && companyId > 0 ? companyId : null,
    role: normalizeAppRole(row?.role ?? "Employee"),
    employee: row ?? null,
    fullName: row?.full_name ?? null,
    email: row?.email ?? null,
    department: row?.department ?? null,
    jobTitle: row?.job_title_name ?? null,
  };
}

export function getCurrentEmployeeCache() {
  return sessionCache;
}

export function setCurrentEmployeeCache(value) {
  sessionCache = value ?? null;
  return sessionCache;
}

export function clearCurrentEmployeeCache() {
  sessionCache = null;
}

export async function fetchEmployeeRowByAuthUserId(authUserId) {
  if (!authUserId) return null;

  const { data, error } = await supabase
    .from("employees")
    .select(CURRENT_EMPLOYEE_SELECT)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data;
}

/**
 * Resolves the logged-in employee via auth_user_id = auth.users.id.
 * Result is cached for the session unless force=true.
 */
export async function fetchCurrentEmployee({ force = false } = {}) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw new Error(authError.message || "تعذّر التحقق من الجلسة.");
  if (!user?.id) {
    clearCurrentEmployeeCache();
    return null;
  }

  if (!force) {
    const cached = getCurrentEmployeeCache();
    if (cached?.authUserId === user.id) {
      return cached;
    }
  }

  const row = await fetchEmployeeRowByAuthUserId(user.id);
  const normalized = normalizeCurrentEmployee(row, user.id);
  setCurrentEmployeeCache(normalized);
  return normalized;
}

export function requireCurrentEmployee(context = "العملية") {
  const cached = getCurrentEmployeeCache();
  if (!cached?.employeeId || !cached?.companyId) {
    throw new Error(
      `لم يتم ربط حسابك بسجل موظف عبر auth_user_id. تواصل مع الموارد البشرية (${context}).`,
    );
  }
  return cached;
}
