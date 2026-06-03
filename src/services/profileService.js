import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
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

export async function fetchEmployeeProfileByEmail(email) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, company_id, full_name, email, role, department, job_title_name, image",
    )
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export async function resolveAuthProfile(sessionUser) {
  const email = sessionUser?.email;
  const employee = await fetchEmployeeProfileByEmail(email);

  const rawRole =
    employee?.role ?? sessionUser?.user_metadata?.role ?? "Employee";
  const role = normalizeAppRole(rawRole);
  const companyId =
    employee?.company_id ??
    sessionUser?.user_metadata?.company_id ??
    getCompanyId();

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
    id: sessionUser?.id,
    email,
    name:
      employee?.full_name ??
      sessionUser?.user_metadata?.full_name ??
      email ??
      "مستخدم",
    role,
    company_id: companyId,
    employee_id: employee?.id ?? null,
    department: employee?.department ?? null,
    job_title: employee?.job_title_name ?? null,
    image: employee?.image ?? null,
    permissions: normalizePermissions(permissions),
  };
}
