import { supabase } from "../utils/supabaseClient.js";

function mapRpcError(error) {
  if (!error) return "تعذّر إكمال الاستعلام.";
  return error.message || "تعذّر إكمال الاستعلام.";
}

/**
 * @param {string} rpcName
 * @param {Record<string, unknown>} [params]
 */
export async function callQueryRpc(rpcName, params = {}) {
  const { data, error } = await supabase.rpc(rpcName, params);
  if (error) throw new Error(mapRpcError(error));
  return data ?? {};
}

export async function fetchQueryDigest() {
  const [requests, joiners, renewals, adminActions] = await Promise.all([
    callQueryRpc("digest_recent_requests"),
    callQueryRpc("digest_recent_joiners"),
    callQueryRpc("digest_recent_renewals"),
    callQueryRpc("digest_recent_admin_actions"),
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
