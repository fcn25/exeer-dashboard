import { supabase } from "./supabaseClient.js";
import { normalizePermissions } from "../constants/roles.js";

export function getAuthToken() {
  return localStorage.getItem("authToken");
}

export function clearAuthStorage() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("company_id");
}

export function persistAuthSession(session, profile) {
  if (session?.access_token) {
    localStorage.setItem("authToken", session.access_token);
  }

  const user = profile ?? session?.user ?? null;
  if (user && typeof user === "object") {
    const companyId =
      user.company_id ??
      user.user_metadata?.company_id ??
      user.app_metadata?.company_id;

    const role =
      user.role ??
      user.app_role ??
      user.user_metadata?.role ??
      user.user_metadata?.app_role ??
      "Employee";

    const permissions = normalizePermissions(user.permissions);

    localStorage.setItem(
      "auth_user",
      JSON.stringify({
        id: user.id,
        email: user.email,
        name:
          user.name ??
          user.full_name ??
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email,
        company_id: companyId,
        employee_id: user.employee_id ?? null,
        department: user.department ?? null,
        job_title: user.job_title ?? null,
        role,
        permissions,
      }),
    );

    if (companyId != null) {
      localStorage.setItem("company_id", String(companyId));
    }
  }
}

export function getCompanyId() {
  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "null");
    const companyId = Number(user?.company_id ?? user?.companyId);
    if (!Number.isNaN(companyId)) return companyId;
  } catch {
    // ignore invalid JSON
  }

  const direct = localStorage.getItem("company_id");
  const parsed = Number(direct);
  return Number.isNaN(parsed) ? 118 : parsed;
}

export function getEmployeeId() {
  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "null");
    const employeeId = Number(user?.employee_id);
    return Number.isNaN(employeeId) ? null : employeeId;
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
    return {
      ...user,
      permissions: normalizePermissions(user.permissions),
    };
  } catch {
    return null;
  }
}

export function getUserPermissions() {
  return normalizePermissions(getAuthUser()?.permissions);
}

export function getUserDisplay() {
  try {
    const user = getAuthUser();
    if (!user || typeof user !== "object") {
      return { name: "مستخدم", initials: "م" };
    }

    const name = String(
      user.name ?? user.full_name ?? user.email ?? "مستخدم",
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
