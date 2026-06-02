import { getAuthUser, getUserPermissions } from "./mobileAuth.js";
import { isAdminRole } from "../constants/roles.js";

export function getCurrentUserRole() {
  const user = getAuthUser();
  return user?.role ? String(user.role).trim() : "Employee";
}

export function getCurrentPermissions() {
  return getUserPermissions();
}

export function hasPermission(key) {
  const role = getCurrentUserRole();
  if (isAdminRole(role)) return true;
  return Boolean(getUserPermissions()?.[key]);
}

export function canEditEmployeeRecords() {
  return hasPermission("can_edit_employees");
}

export function isReadOnlyEmployeeAccess() {
  return !canEditEmployeeRecords();
}

export function canViewPayroll() {
  return hasPermission("can_view_payroll");
}

export function canCreateEvents() {
  return hasPermission("can_create_events");
}

export function isAdmin() {
  return isAdminRole(getCurrentUserRole());
}

export function canAccessSettings() {
  const role = getCurrentUserRole();
  if (isAdminRole(role)) return true;
  return ["Executive", "HR_Manager"].includes(role);
}

export function canAccessPerformance() {
  const role = getCurrentUserRole();
  if (isAdminRole(role)) return true;
  return ["Executive", "HR_Manager"].includes(role);
}
