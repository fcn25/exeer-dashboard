import { getCurrentEmployeeCache } from "../services/currentEmployeeService.js";
import { getAuthUser, getUserPermissions } from "./mobileAuth.js";
import {
  isManagementRole,
  isOwnerRole,
  normalizeAppRole,
} from "../constants/roles.js";

export function isDirectManager(role = getCurrentUserRole()) {
  const normalized = normalizeAppRole(role);
  return normalized === "Direct_Manager" || normalized === "manager";
}

/** فريق العمل: مدير مباشر + HR + المالك */
export function canAccessMyTeam(role = getCurrentUserRole()) {
  const normalized = normalizeAppRole(role);
  return (
    isOwnerRole(normalized) ||
    normalized === "Executive" ||
    normalized === "HR_Manager" ||
    normalized === "HR_Assistant" ||
    isDirectManager(normalized)
  );
}
import { ADMINISTRATIVE_MASTER_LOG_ROLES } from "../constants/administrativeActions.js";

export function getCurrentUserRole() {
  const cachedRole = getCurrentEmployeeCache()?.role;
  if (cachedRole) return normalizeAppRole(cachedRole);
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
  return isOwner() || hasPermission("can_view_payroll");
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
  return (
    hasPermission("can_edit_employees") || isOwner() || isDirectManager()
  );
}

export function canAccessPerformance() {
  return (
    isOwner() ||
    hasPermission("can_edit_employees") ||
    hasPermission("can_view_payroll") ||
    isDirectManager()
  );
}

/** Master log + issue actions: owner, Executive, HR — not Direct Manager */
export function canManageAdministrativeActions() {
  return ADMINISTRATIVE_MASTER_LOG_ROLES.has(getCurrentUserRole());
}

export function canViewAdministrativeActionsMasterLog() {
  return canManageAdministrativeActions();
}

/** @deprecated Use isOwner */
export function isAdmin() {
  return isOwner();
}

/** Biometric & geofencing settings — owner / legacy Admin only */
export function canManageAttendanceSettings() {
  return isOwner();
}

/** Strategic AI assistant & smart management tools */
export function canAccessStrategicAI() {
  return isManagementRole(getCurrentUserRole());
}
