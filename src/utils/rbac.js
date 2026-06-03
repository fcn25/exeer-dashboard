import { getAuthUser, getUserPermissions } from "./mobileAuth.js";
import {
  isOwnerRole,
  normalizeAppRole,
} from "../constants/roles.js";

export function getCurrentUserRole() {
  const user = getAuthUser();
  return normalizeAppRole(user?.role);
}

export function getCurrentPermissions() {
  return getUserPermissions();
}

export function isOwner() {
  return isOwnerRole(getCurrentUserRole());
}

export function hasPermission(key) {
  if (isOwner()) return true;
  return Boolean(getUserPermissions()?.[key]);
}

export function canEditEmployeeRecords() {
  return hasPermission("can_edit_employees");
}

export function isReadOnlyEmployeeAccess() {
  return (
    hasPermission("can_access_employee_profile") && !canEditEmployeeRecords()
  );
}

export function canAccessEmployeeProfile() {
  return (
    hasPermission("can_access_employee_profile") || canEditEmployeeRecords()
  );
}

export function canViewPayroll() {
  return isOwner();
}

export function canManageEvents() {
  return (
    hasPermission("can_manage_events") || hasPermission("can_create_events")
  );
}

/** @deprecated Use canManageEvents */
export function canCreateEvents() {
  return canManageEvents();
}

export function canAccessSettings() {
  return hasPermission("can_edit_employees") || isOwner();
}

export function canAccessPerformance() {
  return (
    isOwner() ||
    hasPermission("can_edit_employees") ||
    hasPermission("can_view_payroll")
  );
}

/** @deprecated Use isOwner */
export function isAdmin() {
  return isOwner();
}
