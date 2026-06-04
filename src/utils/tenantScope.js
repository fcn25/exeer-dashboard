import { getAuthCompanyId, getCompanyId } from "./mobileAuth.js";

/**
 * Resolves the authenticated user's company for multi-tenant queries.
 * @param {string} [context] Human-readable operation name for error messages
 * @returns {number}
 */
export function requireCompanyId(context = "العملية") {
  const companyId = getAuthCompanyId() ?? Number(getCompanyId());
  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Error(
      `لم يتم تحديد الشركة الحالية. أعد تسجيل الدخول ثم حاول مرة أخرى (${context}).`,
    );
  }
  return companyId;
}

/**
 * @param {import("@supabase/supabase-js").PostgrestFilterBuilder} query
 * @param {number} companyId
 */
export function scopeQueryByCompany(query, companyId) {
  return query.eq("company_id", companyId);
}
