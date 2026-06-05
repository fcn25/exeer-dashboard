export const STANDARD_ROLES = [
  "owner",
  "Executive",
  "HR_Manager",
  "HR_Assistant",
  "Direct_Manager",
  "Employee",
];

/**
 * Role written to employees.role at company signup (employees_role_check).
 * - Legacy DB: "Admin" (20250608000000_rbac_roles_permissions.sql)
 * - After 20250619000000_owner_role.sql: use "owner" instead
 */
export const SIGNUP_OWNER_DB_ROLE = "Admin";

export const CONFIGURABLE_ROLES = [
  "Executive",
  "HR_Manager",
  "HR_Assistant",
  "Direct_Manager",
];

export const DASHBOARD_ROLES = new Set([
  "owner",
  "Executive",
  "HR_Manager",
  "HR_Assistant",
  "Direct_Manager",
]);

export const PORTAL_ROLES = new Set(["Employee"]);

export const ROLE_LABELS = {
  owner: "مالك المنشأة",
  Admin: "مالك المنشأة",
  Executive: "تنفيذي",
  HR_Manager: "مدير موارد بشرية",
  HR_Assistant: "مساعد موارد بشرية",
  Direct_Manager: "مدير مباشر",
  Employee: "موظف",
};

export const DEFAULT_PERMISSIONS = {
  can_edit_employees: false,
  can_view_payroll: false,
  can_create_events: false,
  can_manage_events: false,
  can_manage_events: false,
  can_approve_financial: false,
  can_approve_general: false,
  can_access_employee_profile: false,
};

export const OWNER_PERMISSIONS = {
  can_edit_employees: true,
  can_view_payroll: true,
  can_create_events: true,
  can_manage_events: true,
  can_manage_events: true,
  can_approve_financial: true,
  can_approve_general: true,
  can_access_employee_profile: true,
};

/** @deprecated Use OWNER_PERMISSIONS — Admin is normalized to owner */
export const ADMIN_PERMISSIONS = OWNER_PERMISSIONS;

export const PERMISSION_DEFINITIONS = [
  { key: "can_edit_employees", label: "تعديل وحذف الموظفين" },
  { key: "can_view_payroll", label: "الوصول إلى مسير الرواتب" },
  { key: "can_manage_events", label: "إنشاء وإدارة الفعاليات" },
  { key: "can_approve_financial", label: "الموافقة على الطلبات المالية" },
  { key: "can_approve_general", label: "الموافقة على الطلبات العامة" },
  { key: "can_access_employee_profile", label: "الوصول لملف الموظف" },
];

export function isDashboardRole(role) {
  return DASHBOARD_ROLES.has(String(role ?? "").trim());
}

export function isPortalRole(role) {
  return PORTAL_ROLES.has(String(role ?? "").trim());
}

export function getHomePathForRole(role) {
  return isDashboardRole(role) ? "/dashboard" : "/employee-portal";
}

export function getAuthenticatedHomePath(role, isMobile = false) {
  if (isMobile) return "/mobile";
  return getHomePathForRole(role);
}

export function normalizePermissions(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    can_edit_employees: Boolean(source.can_edit_employees),
    can_view_payroll: Boolean(source.can_view_payroll),
    can_create_events: Boolean(
      source.can_create_events ?? source.can_manage_events,
    ),
    can_manage_events: Boolean(
      source.can_manage_events ?? source.can_create_events,
    ),
    can_approve_financial: Boolean(source.can_approve_financial),
    can_approve_general: Boolean(source.can_approve_general),
    can_access_employee_profile: Boolean(source.can_access_employee_profile),
  };
}

export function normalizeAssignedEmployeeIds(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ].sort((a, b) => a - b);
}

export function normalizeAppRole(role) {
  const trimmed = String(role ?? "").trim();
  if (trimmed === "Admin" || trimmed === "admin") return "owner";
  return trimmed || "Employee";
}

export function isOwnerRole(role) {
  return normalizeAppRole(role) === "owner";
}

/** @deprecated Use isOwnerRole */
export function isAdminRole(role) {
  return isOwnerRole(role);
}
