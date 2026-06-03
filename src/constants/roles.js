export const STANDARD_ROLES = [
  "Admin",
  "Executive",
  "HR_Manager",
  "HR_Assistant",
  "Direct_Manager",
  "Employee",
];

export const CONFIGURABLE_ROLES = [
  "Executive",
  "HR_Manager",
  "HR_Assistant",
  "Direct_Manager",
];

export const DASHBOARD_ROLES = new Set([
  "Admin",
  "Executive",
  "HR_Manager",
  "HR_Assistant",
]);

export const PORTAL_ROLES = new Set(["Direct_Manager", "Employee"]);

export const ROLE_LABELS = {
  Admin: "مدير النظام",
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
  can_approve_financial: false,
  can_approve_general: false,
  can_access_employee_profile: false,
};

export const ADMIN_PERMISSIONS = {
  can_edit_employees: true,
  can_view_payroll: true,
  can_create_events: true,
  can_approve_financial: true,
  can_approve_general: true,
  can_access_employee_profile: true,
};

export const PERMISSION_DEFINITIONS = [
  { key: "can_edit_employees", label: "تعديل وحذف الموظفين" },
  { key: "can_view_payroll", label: "الوصول إلى مسير الرواتب" },
  { key: "can_create_events", label: "إنشاء وإدارة الفعاليات" },
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
    can_create_events: Boolean(source.can_create_events),
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

export function isAdminRole(role) {
  return String(role ?? "").trim() === "Admin";
}
