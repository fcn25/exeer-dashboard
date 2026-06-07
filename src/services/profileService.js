import { supabase } from "../utils/supabaseClient.js";
import {
  fetchEmployeeRowByAuthUserId,
  normalizeCurrentEmployee,
  setCurrentEmployeeCache,
} from "./currentEmployeeService.js";
import {
  DEFAULT_PERMISSIONS,
  normalizeAppRole,
  normalizePermissions,
  OWNER_PERMISSIONS,
} from "../constants/roles.js";
import { fetchPermissionsForRole } from "./permissionsService.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر إكمال العملية.";
}

/** @deprecated Prefer auth_user_id via fetchEmployeeRowByAuthUserId */
export async function fetchEmployeeProfileByEmail(email) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, company_id, auth_user_id, full_name, email, role, department, job_title_name",
    )
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function resolveAuthProfile(sessionUser) {
  const authUserId = sessionUser?.id;
  if (!authUserId) {
    throw new Error("جلسة الدخول غير صالحة.");
  }

  const employeeRow = await fetchEmployeeRowByAuthUserId(authUserId);
  const current = normalizeCurrentEmployee(employeeRow, authUserId);
  setCurrentEmployeeCache(current);

  const role = normalizeAppRole(
    current?.role ?? sessionUser?.user_metadata?.role ?? "Employee",
  );
  const companyId =
    current?.companyId ?? sessionUser?.user_metadata?.company_id ?? null;

  let permissions = { ...DEFAULT_PERMISSIONS };
  if (role === "owner") {
    permissions = { ...OWNER_PERMISSIONS };
  } else if (
    companyId &&
    ["Executive", "HR_Manager", "HR_Assistant", "Direct_Manager"].includes(role)
  ) {
    try {
      permissions = await fetchPermissionsForRole(role, companyId);
    } catch (error) {
      console.warn("Could not load role permissions, using defaults:", error);
      permissions = { ...DEFAULT_PERMISSIONS };
    }
  }

  return {
    id: authUserId,
    auth_user_id: authUserId,
    email: current?.email ?? sessionUser?.email,
    name:
      current?.fullName ??
      sessionUser?.user_metadata?.full_name ??
      sessionUser?.email ??
      "مستخدم",
    role,
    company_id: companyId,
    employee_id: current?.employeeId ?? null,
    department: current?.department ?? null,
    job_title: current?.jobTitle ?? null,
    permissions: normalizePermissions(permissions),
  };
}
