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
 * Links employees.auth_user_id to the logged-in auth user when emails match
 * (case-insensitive) and the employee row is still unlinked.
 * Uses security-definer RPC when available; falls back to direct update.
 */
export async function linkEmployeeAuthUserByEmail(authUserId, email) {
  if (!authUserId) return null;

  const existing = await fetchEmployeeRowByAuthUserId(authUserId);
  if (existing) return existing;

  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data: linkedId, error: rpcError } = await supabase.rpc(
    "link_employee_auth_user_by_email",
  );

  if (!rpcError && linkedId) {
    return fetchEmployeeRowByAuthUserId(authUserId);
  }

  if (rpcError && rpcError.code !== "PGRST202") {
    console.warn("link_employee_auth_user_by_email RPC failed:", rpcError.message);
  }

  const { data: candidate, error: findError } = await supabase
    .from("employees")
    .select("id")
    .ilike("email", normalizedEmail)
    .is("auth_user_id", null)
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(mapDbError(findError));
  if (!candidate?.id) return null;

  const { error: updateError } = await supabase
    .from("employees")
    .update({ auth_user_id: authUserId })
    .eq("id", candidate.id)
    .is("auth_user_id", null);

  if (updateError) {
    console.warn("Direct auth_user_id link failed:", updateError.message);
    return null;
  }

  return fetchEmployeeRowByAuthUserId(authUserId);
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

  let row = await fetchEmployeeRowByAuthUserId(user.id);

  if (!row?.id) {
    row = await linkEmployeeAuthUserByEmail(user.id, user.email);
  }

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

/**
 * Live session lookup: auth user → employees.auth_user_id → bigint id + company_id.
 * Never use auth UUID for employee_id / created_by / company_id columns.
 */
export async function resolveEmployeeContextFromSession(context = "العملية") {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message || "تعذّر التحقق من الجلسة.");
  }
  if (!user?.id) {
    throw new Error(`يجب تسجيل الدخول لإكمال ${context}.`);
  }

  let emp = null;
  let employeeError = null;

  ({ data: emp, error: employeeError } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("auth_user_id", user.id)
    .maybeSingle());

  if (!emp?.id) {
    const linked = await linkEmployeeAuthUserByEmail(user.id, user.email);
    if (linked?.id) {
      emp = { id: linked.id, company_id: linked.company_id };
      employeeError = null;
    }
  }

  if (employeeError) {
    throw new Error(mapDbError(employeeError));
  }

  if (!emp?.id) {
    throw new Error("لم يتم العثور على سجل موظف مرتبط بـ auth_user_id لهذا الحساب.");
  }

  const employeeId = Number(emp?.id);
  const companyId = Number(emp?.company_id);

  if (
    !Number.isFinite(employeeId) ||
    employeeId <= 0 ||
    !Number.isFinite(companyId) ||
    companyId <= 0
  ) {
    throw new Error(
      `يجب ربط حسابك بسجل موظف (auth_user_id) لإكمال ${context}.`,
    );
  }

  setCurrentEmployeeCache(
    normalizeCurrentEmployee(
      { id: employeeId, company_id: companyId },
      user.id,
    ),
  );

  return { employeeId, companyId, authUserId: user.id };
}
