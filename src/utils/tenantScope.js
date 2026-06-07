import {
  getCurrentEmployeeCache,
  requireCurrentEmployee,
} from "../services/currentEmployeeService.js";
import { getAuthCompanyId, getCompanyId, getEmployeeId } from "./mobileAuth.js";

/**
 * Resolves the authenticated user's company for multi-tenant queries.
 * @param {string} [context] Human-readable operation name for error messages
 * @returns {number}
 */
export function requireCompanyId(context = "العملية") {
  const cachedCompanyId = getCurrentEmployeeCache()?.companyId;
  const companyId = cachedCompanyId ?? getAuthCompanyId() ?? safeGetCompanyId();

  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Error(
      `لم يتم تحديد الشركة الحالية. أعد تسجيل الدخول ثم حاول مرة أخرى (${context}).`,
    );
  }
  return companyId;
}

function safeGetCompanyId() {
  try {
    return Number(getCompanyId());
  } catch {
    return null;
  }
}

/**
 * Employee bigint id linked via employees.auth_user_id.
 * @param {string} [context]
 * @returns {number}
 */
export function requireEmployeeId(context = "العملية") {
  const employeeId = getCurrentEmployeeCache()?.employeeId ?? getEmployeeId();
  if (!Number.isFinite(employeeId) || employeeId <= 0) {
    try {
      return requireCurrentEmployee(context).employeeId;
    } catch (error) {
      throw error;
    }
  }
  return employeeId;
}

/**
 * @param {import("@supabase/supabase-js").PostgrestFilterBuilder} query
 * @param {number} companyId
 */
export function scopeQueryByCompany(query, companyId) {
  return query.eq("company_id", companyId);
}
