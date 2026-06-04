import { getPlanLimitsForTier } from "../constants/subscriptionPlans.js";

export const EMPLOYEE_LIMIT_ERROR_AR =
  "عفواً، لقد وصلت للحد الأقصى لعدد الموظفين. يرجى الترقية لإضافة المزيد.";

export function getEmployeeSlotsLeft(currentCount, tier) {
  const { maxEmployees } = getPlanLimitsForTier(tier);
  const current = Math.max(0, Number(currentCount) || 0);
  return Math.max(0, maxEmployees - current);
}

export function canAddEmployeeCount(currentCount, toAdd, tier) {
  const { maxEmployees } = getPlanLimitsForTier(tier);
  const slotsLeft = getEmployeeSlotsLeft(currentCount, tier);
  const add = Math.max(0, Number(toAdd) || 0);
  if (add === 0) {
    return { allowed: true, slotsLeft, maxEmployees };
  }
  return {
    allowed: add <= slotsLeft,
    slotsLeft,
    maxEmployees,
  };
}

export function buildBulkImportLimitMessage({ currentCount, importCount, tier }) {
  const { maxEmployees } = getPlanLimitsForTier(tier);
  const slotsLeft = getEmployeeSlotsLeft(currentCount, tier);
  const importN = Math.max(0, Number(importCount) || 0);
  const current = Math.max(0, Number(currentCount) || 0);

  if (importN <= slotsLeft) return null;

  return (
    `لا يمكن الاستيراد: لديك ${current} موظف من أصل ${maxEmployees} المسموح بها، ` +
    `وتبقى ${slotsLeft} مقعد${slotsLeft === 1 ? "" : "اً"} فقط، ` +
    `بينما الملف يحتوي على ${importN} موظف. يرجى الترقية أو تقليل عدد الصفوف.`
  );
}
