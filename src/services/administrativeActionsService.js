import { supabase } from "../utils/supabaseClient.js";
import { getActiveActionsWindowStartIso } from "../utils/administrativeActions.js";
import { requireCompanyId, scopeQueryByCompany } from "../utils/tenantScope.js";
import { getAuthUser } from "../utils/mobileAuth.js";
import { ADMINISTRATIVE_ACTION_TYPES } from "../constants/administrativeActions.js";
import { isSalaryDeductionAction } from "../utils/administrativeActions.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  if (error.code === "PGRST205") {
    return "جدول الإجراءات الإدارية غير موجود. نفّذ migration 20250629000000_administrative_actions.sql في Supabase.";
  }
  return error.message || "تعذّر إكمال العملية.";
}

function mapActionRow(row) {
  if (!row) return null;
  const employee = row.employees ?? {};
  return {
    id: row.id,
    companyId: row.company_id,
    employeeId: row.employee_id,
    employeeName: employee.full_name ?? row.employee_name ?? "—",
    employeeNumber: employee.employee_number ?? "—",
    actionType: row.action_type,
    reason: row.reason,
    penaltyAmount:
      row.penalty_amount != null ? Number(row.penalty_amount) : null,
    actionDate: row.action_date,
    issuedByName: row.issued_by_name ?? "—",
    createdAt: row.created_at,
  };
}

const ACTION_SELECT = `
  id,
  company_id,
  employee_id,
  action_type,
  reason,
  penalty_amount,
  action_date,
  issued_by_name,
  created_at,
  employees (
    id,
    full_name,
    employee_number
  )
`;

/**
 * Count administrative actions for an employee in the last 180 days.
 * @param {number} employeeId
 * @returns {Promise<number>}
 */
export async function getEmployeeActionCount(employeeId) {
  const companyId = requireCompanyId("عدّ الإجراءات النشطة");
  const id = Number(employeeId);
  if (!Number.isFinite(id) || id <= 0) return 0;

  const windowStart = getActiveActionsWindowStartIso();

  const { count, error } = await scopeQueryByCompany(
    supabase
      .from("administrative_actions")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", id)
      .gte("action_date", windowStart),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));
  return count ?? 0;
}

export async function fetchAdministrativeActionsMasterLog() {
  const companyId = requireCompanyId("سجل الإجراءات الإدارية");

  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("administrative_actions")
      .select(ACTION_SELECT)
      .order("action_date", { ascending: false }),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));
  return (data ?? []).map(mapActionRow).filter(Boolean);
}

export async function fetchMyAdministrativeActions(employeeId) {
  const companyId = requireCompanyId("سجلاتي الإدارية");
  const id = Number(employeeId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("لم يتم ربط حسابك بسجل موظف.");
  }

  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("administrative_actions")
      .select(ACTION_SELECT)
      .eq("employee_id", id)
      .order("action_date", { ascending: false }),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));
  return (data ?? []).map(mapActionRow).filter(Boolean);
}

export async function createAdministrativeAction(payload) {
  const companyId = requireCompanyId("إصدار إجراء إداري");
  const employeeId = Number(payload.employeeId);
  const actionType = String(payload.actionType ?? "").trim();

  if (!Number.isFinite(employeeId) || employeeId <= 0) {
    throw new Error("يرجى اختيار موظف.");
  }

  if (!ADMINISTRATIVE_ACTION_TYPES.includes(actionType)) {
    throw new Error("نوع الإجراء غير صالح.");
  }

  const reason = String(payload.reason ?? "").trim();
  if (!reason) {
    throw new Error("يرجى إدخال سبب الإجراء.");
  }

  let penaltyAmount = null;
  if (isSalaryDeductionAction(actionType)) {
    const amount = Number(payload.penaltyAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("يرجى إدخال مبلغ الخصم عند اختيار «خصم من الراتب».");
    }
    penaltyAmount = Math.round(amount * 100) / 100;
  }

  const authUser = getAuthUser();
  const issuedByName =
    authUser?.name ?? authUser?.email ?? "الموارد البشرية";

  const { data, error } = await supabase
    .from("administrative_actions")
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      action_type: actionType,
      reason,
      penalty_amount: penaltyAmount,
      action_date: new Date().toISOString(),
      issued_by_name: issuedByName,
    })
    .select(ACTION_SELECT)
    .single();

  if (error) throw new Error(mapDbError(error));
  return mapActionRow(data);
}
