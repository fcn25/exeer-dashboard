import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import {
  CONFIGURABLE_ROLES,
  DEFAULT_PERMISSIONS,
  normalizeAssignedEmployeeIds,
  normalizePermissions,
  OWNER_PERMISSIONS,
} from "../constants/roles.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول role_permissions غير جاهز. نفّذ migrations 20250608000000_rbac_roles_permissions.sql و 20250618000000_role_permissions_extended.sql.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

export async function fetchRolePermissionsForCompany(companyId = getCompanyId()) {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("id, role_name, permissions, assigned_employees, updated_at")
    .eq("company_id", companyId)
    .order("role_name", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  return (data ?? []).map((row) => ({
    ...row,
    assigned_employees: normalizeAssignedEmployeeIds(row.assigned_employees),
  }));
}

export async function fetchPermissionsForRole(roleName, companyId = getCompanyId()) {
  if (roleName === "owner" || roleName === "Admin") return { ...OWNER_PERMISSIONS };

  const { data, error } = await supabase
    .from("role_permissions")
    .select("permissions")
    .eq("company_id", companyId)
    .eq("role_name", roleName)
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return normalizePermissions(data?.permissions ?? DEFAULT_PERMISSIONS);
}

export async function updateRolePermissions(roleName, permissionsPatch) {
  const companyId = getCompanyId();
  const nextPermissions = normalizePermissions({
    ...DEFAULT_PERMISSIONS,
    ...permissionsPatch,
  });

  const { data, error } = await supabase
    .from("role_permissions")
    .upsert(
      {
        company_id: companyId,
        role_name: roleName,
        permissions: nextPermissions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,role_name" },
    )
    .select("id, role_name, permissions, assigned_employees, updated_at")
    .single();

  if (error) throw new Error(mapDbError(error));
  return {
    ...data,
    assigned_employees: normalizeAssignedEmployeeIds(data?.assigned_employees),
  };
}

export async function updateRoleAssignedEmployees(roleName, employeeIds) {
  const companyId = getCompanyId();
  const assigned_employees = normalizeAssignedEmployeeIds(employeeIds);

  await ensureDefaultRolePermissions(companyId);

  const { data, error } = await supabase
    .from("role_permissions")
    .update({
      assigned_employees,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("role_name", roleName)
    .select("id, role_name, permissions, assigned_employees, updated_at")
    .single();

  if (error) throw new Error(mapDbError(error));
  return {
    ...data,
    assigned_employees: normalizeAssignedEmployeeIds(data?.assigned_employees),
  };
}

export async function ensureDefaultRolePermissions(companyId = getCompanyId()) {
  const existing = await fetchRolePermissionsForCompany(companyId);
  const existingNames = new Set(existing.map((row) => row.role_name));
  const missing = CONFIGURABLE_ROLES.filter((role) => !existingNames.has(role));

  if (missing.length === 0) return existing;

  const inserts = missing.map((role_name) => ({
    company_id: companyId,
    role_name,
    permissions: DEFAULT_PERMISSIONS,
    assigned_employees: [],
  }));

  const { error } = await supabase.from("role_permissions").insert(inserts);
  if (error) throw new Error(mapDbError(error));

  return fetchRolePermissionsForCompany(companyId);
}
