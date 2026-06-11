import { getCurrentEmployeeCache } from "../services/currentEmployeeService.js";
import { getAuthUser, getUserPermissions } from "./mobileAuth.js";
import {
  isAccountantRole as isAccountantRoleConstant,
  isManagementRole,
  isOwnerRole,
  normalizeAppRole,
  resolvePermissionsForRole,
} from "../constants/roles.js";
import { ADMINISTRATIVE_MASTER_LOG_ROLES } from "../constants/administrativeActions.js";

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

function getPrimarySubscriberEmployeeNumber() {
  const cached = getCurrentEmployeeCache()?.employee?.employee_number;
  if (cached) return String(cached).trim();

  const user = getAuthUser();
  return String(user?.employee_number ?? "").trim();
}

export function isPrimarySubscriber() {
  return getPrimarySubscriberEmployeeNumber() === "EMP-001";
}

export function getCurrentUserRole() {
  const authRole = normalizeAppRole(getAuthUser()?.role);
  const cachedRole = normalizeAppRole(getCurrentEmployeeCache()?.role);

  if (isOwnerRole(authRole) || isOwnerRole(cachedRole) || isPrimarySubscriber()) {
    return "owner";
  }

  if (getCurrentEmployeeCache()?.role) return cachedRole;
  return authRole;
}

export function getCurrentPermissions() {
  const role = getCurrentUserRole();
  return resolvePermissionsForRole(role, getUserPermissions());
}

export function isOwner() {
  return isOwnerRole(getCurrentUserRole()) || isPrimarySubscriber();
}

/** Company owner / Executive — system customization (see ROLE_NAV). */
export function canAccessSystemCustomization() {
  const normalized = normalizeAppRole(getCurrentUserRole());
  return isOwnerRole(normalized) || normalized === "Executive";
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

export function isAccountantRole(role = getCurrentUserRole()) {
  return isAccountantRoleConstant(role);
}

/** Owner + HR roles that manage the payroll workflow (not Accountant). */
export function isHrPayrollStaff(role = getCurrentUserRole()) {
  const normalized = normalizeAppRole(role);
  return (
    isOwnerRole(normalized) ||
    normalized === "HR_Manager" ||
    normalized === "HR_Assistant"
  );
}

export function canViewPayroll() {
  return isAccountantRole() || hasPermission("can_view_payroll");
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
  if (isOwner()) return true;
  return ADMINISTRATIVE_MASTER_LOG_ROLES.has(getCurrentUserRole());
}

export function canViewAdministrativeActionsMasterLog() {
  return canManageAdministrativeActions();
}

/** @deprecated Use isOwner */
export function isAdmin() {
  return isOwner();
}

/** Biometric & geofencing settings — company owner only */
export function canManageAttendanceSettings() {
  return isOwner();
}

/** Strategic AI assistant & smart management tools */
export function canAccessStrategicAI() {
  if (isOwner()) return true;
  return isManagementRole(getCurrentUserRole());
}
