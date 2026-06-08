import {
  clearCurrentEmployeeCache,
  getCurrentEmployeeCache,
} from "../services/currentEmployeeService.js";
import { supabase } from "./supabaseClient.js";
import {
  normalizeAppRole,
  resolvePermissionsForRole,
} from "../constants/roles.js";

export function getAuthToken() {
  return localStorage.getItem("authToken");
}

export function clearAuthStorage() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("company_id");
  clearCurrentEmployeeCache();
}

export function persistAuthSession(session, profile) {
  if (session?.access_token) {
    localStorage.setItem("authToken", session.access_token);
  }

  const user = profile ?? session?.user ?? null;
  if (user && typeof user === "object") {
    const companyId =
      user.company_id ??
      user.companyId ??
      user.user_metadata?.company_id ??
      user.app_metadata?.company_id;

    const role = normalizeAppRole(
      user.role ??
        user.app_role ??
        user.user_metadata?.role ??
        user.user_metadata?.app_role ??
        "Employee",
    );

    const permissions = resolvePermissionsForRole(role, user.permissions);
    const authUserId = user.id ?? user.auth_user_id ?? null;
    const employeeId = user.employee_id ?? user.employeeId ?? null;
    const employeeNumber =
      user.employee_number ??
      user.employeeNumber ??
      getCurrentEmployeeCache()?.employee?.employee_number ??
      null;

    localStorage.setItem(
      "auth_user",
      JSON.stringify({
        id: authUserId,
        auth_user_id: authUserId,
        email: user.email,
        name:
          user.name ??
          user.full_name ??
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email,
        company_id: companyId,
        employee_id: employeeId,
        employee_number: employeeNumber,
        department: user.department ?? null,
        job_title: user.job_title ?? null,
        role,
        permissions,
      }),
    );

    if (companyId != null) {
      localStorage.setItem("company_id", String(companyId));
    }

    repairStoredAuthProfile();
  }
}

/** Supabase auth.users.id (UUID) */
export function getAuthUserId() {
  const cached = getCurrentEmployeeCache()?.authUserId;
  if (cached) return cached;

  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "null");
    return user?.auth_user_id ?? user?.id ?? null;
  } catch {
    return null;
  }
}

/** Company id from current employee (auth_user_id), then cached auth profile. */
export function getAuthCompanyId() {
  const fromEmployee = getCurrentEmployeeCache()?.companyId;
  if (Number.isFinite(fromEmployee) && fromEmployee > 0) return fromEmployee;

  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "null");
    const fromUser = Number(user?.company_id ?? user?.companyId);
    if (Number.isFinite(fromUser) && fromUser > 0) return fromUser;
  } catch {
    // ignore invalid JSON
  }

  const direct = Number(localStorage.getItem("company_id"));
  if (Number.isFinite(direct) && direct > 0) return direct;

  return null;
}

export function getCompanyId() {
  const companyId = getAuthCompanyId();
  if (companyId != null) return companyId;

  throw new Error(
    "لم يتم تحديد الشركة الحالية. تأكد من ربط auth_user_id بسجل الموظف.",
  );
}

/** Employee bigint id from auth_user_id link. */
export function getEmployeeId() {
  const fromEmployee = getCurrentEmployeeCache()?.employeeId;
  if (Number.isFinite(fromEmployee) && fromEmployee > 0) return fromEmployee;

  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "null");
    const employeeId = Number(user?.employee_id);
    return Number.isFinite(employeeId) && employeeId > 0 ? employeeId : null;
  } catch {
    return null;
  }
}

export function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function getAuthUser() {
  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "null");
    if (!user || typeof user !== "object") return null;

    const cached = getCurrentEmployeeCache();

    return {
      ...user,
      id: user.auth_user_id ?? user.id,
      auth_user_id: user.auth_user_id ?? user.id,
      employee_id: cached?.employeeId ?? user.employee_id ?? null,
      employee_number:
        cached?.employee?.employee_number ?? user.employee_number ?? null,
      company_id: cached?.companyId ?? user.company_id ?? null,
      role: normalizeAppRole(cached?.role ?? user.role),
      permissions: resolvePermissionsForRole(
        normalizeAppRole(cached?.role ?? user.role),
        user.permissions,
      ),
    };
  } catch {
    return null;
  }
}

export function getUserPermissions() {
  const user = getAuthUser();
  return resolvePermissionsForRole(user?.role, user?.permissions);
}

/** Re-normalize cached auth profile so legacy Admin owners always get full permissions. */
export function repairStoredAuthProfile() {
  try {
    const user = getAuthUser();
    if (!user) return null;

    const employeeNumber = String(
      user.employee_number ??
        getCurrentEmployeeCache()?.employee?.employee_number ??
        "",
    ).trim();
    const role =
      employeeNumber === "EMP-001" ? "owner" : normalizeAppRole(user.role);
    const permissions = resolvePermissionsForRole(role, user.permissions);
    const needsRoleRepair = user.role !== role;
    const needsPermissionRepair = JSON.stringify(user.permissions) !== JSON.stringify(permissions);

    if (!needsRoleRepair && !needsPermissionRepair) return user;

    const repaired = {
      ...user,
      role,
      permissions,
    };
    localStorage.setItem("auth_user", JSON.stringify(repaired));
    return repaired;
  } catch {
    return null;
  }
}

export function getUserDisplay() {
  try {
    const user = getAuthUser();
    const cached = getCurrentEmployeeCache();
    if (!user || typeof user !== "object") {
      return { name: "مستخدم", initials: "م" };
    }

    const name = String(
      cached?.fullName ??
        user.name ??
        user.full_name ??
        user.email ??
        "مستخدم",
    ).trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`
        : (parts[0]?.[0] ?? "م");

    return { name, initials: initials.toUpperCase() };
  } catch {
    return { name: "مستخدم", initials: "م" };
  }
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
  clearAuthStorage();
}
