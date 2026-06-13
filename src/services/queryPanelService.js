import { supabase } from "../utils/supabaseClient.js";

function mapRpcError(error) {
  if (!error) return "تعذّر إكمال الاستعلام.";
  return error.message || "تعذّر إكمال الاستعلام.";
}

/** Zero-parameter RPC — do NOT pass an empty params object. */
export async function callQueryRpcZero(rpcName) {
  const { data, error } = await supabase.rpc(rpcName);
  if (error) throw new Error(mapRpcError(error));
  return data ?? {};
}

/**
 * Parameterized RPC — always pass explicit args matching the Postgres signature.
 * @param {string} rpcName
 * @param {Record<string, unknown>} params
 */
export async function callQueryRpc(rpcName, params) {
  const { data, error } = await supabase.rpc(rpcName, params);
  if (error) throw new Error(mapRpcError(error));
  return data ?? {};
}

export async function fetchQueryDigest() {
  const [requests, joiners, renewals, adminActions] = await Promise.all([
    callQueryRpcZero("digest_recent_requests"),
    callQueryRpcZero("digest_recent_joiners"),
    callQueryRpcZero("digest_recent_renewals"),
    callQueryRpcZero("digest_recent_admin_actions"),
  ]);

  return {
    requests: requests?.items ?? [],
    joiners: joiners?.items ?? [],
    renewals: renewals?.items ?? [],
    adminActions: adminActions?.items ?? [],
  };
}

export async function searchEmployees(term) {
  return callQueryRpc("q_employee_search", { p_term: term });
}

export async function fetchEmployeeSummary(employeeId) {
  return callQueryRpc("q_employee_summary", { p_employee_id: Number(employeeId) });
}

export async function fetchEmployeeIqama(employeeId) {
  return callQueryRpc("q_employee_iqama", { p_employee_id: Number(employeeId) });
}

export async function fetchEmployeeLeave(employeeId) {
  return callQueryRpc("q_employee_leave", { p_employee_id: Number(employeeId) });
}

export async function fetchEmployeeAttendanceToday(employeeId) {
  return callQueryRpc("q_employee_attendance_today", {
    p_employee_id: Number(employeeId),
  });
}

export async function fetchIqamasExpiring(days = 30) {
  return callQueryRpc("q_iqamas_expiring", { p_days: Number(days) || 30 });
}

export async function fetchContractsExpiring(days = 90) {
  return callQueryRpc("q_contracts_expiring", { p_days: Number(days) || 90 });
}

export async function fetchActiveEmployeesCount() {
  return callQueryRpcZero("q_active_employees_count");
}

export async function fetchAttendanceToday() {
  return callQueryRpcZero("q_attendance_today");
}

export async function fetchEmployeesWithoutAnnualLeave() {
  return callQueryRpcZero("q_employees_without_annual_leave");
}

export async function fetchPendingApprovals() {
  return callQueryRpcZero("q_pending_approvals");
}

const ZERO_PARAM_RPCS = new Set([
  "q_active_employees_count",
  "q_attendance_today",
  "q_employees_without_annual_leave",
  "q_pending_approvals",
  "digest_recent_requests",
  "digest_recent_joiners",
  "digest_recent_renewals",
  "digest_recent_admin_actions",
]);

/**
 * Normalize RPC args: zero-param RPCs return null; parameterized RPCs always get required keys.
 * @param {string} rpcName
 * @param {Record<string, unknown>} [params]
 * @returns {Record<string, unknown>|null}
 */
export function resolveRpcParams(rpcName, params = {}) {
  if (ZERO_PARAM_RPCS.has(rpcName)) return null;

  if (rpcName === "q_iqamas_expiring") {
    return { p_days: Number(params.p_days) || 30 };
  }
  if (rpcName === "q_contracts_expiring") {
    return { p_days: Number(params.p_days) || 90 };
  }
  if (rpcName === "q_employee_search") {
    return { p_term: String(params.p_term ?? "").trim() };
  }
  if (
    rpcName === "q_employee_summary" ||
    rpcName === "q_employee_iqama" ||
    rpcName === "q_employee_leave" ||
    rpcName === "q_employee_attendance_today"
  ) {
    return { p_employee_id: Number(params.p_employee_id) };
  }

  return params;
}
