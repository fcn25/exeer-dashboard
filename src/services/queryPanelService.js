import { supabase } from "../utils/supabaseClient.js";

function mapRpcError(error) {
  if (!error) return "تعذّر تحميل التقرير.";
  return error.message || "تعذّر تحميل التقرير.";
}

/** Zero-parameter digest RPC — do NOT pass an empty params object. */
export async function callDigestRpc(rpcName) {
  const { data, error } = await supabase.rpc(rpcName);
  if (error) throw new Error(mapRpcError(error));
  return data ?? {};
}

/** Loads all sections for the account report panel. */
export async function fetchAccountReport() {
  const [
    requests,
    joiners,
    renewals,
    adminActions,
    payrollRuns,
    tasks,
  ] = await Promise.all([
    callDigestRpc("digest_recent_requests"),
    callDigestRpc("digest_recent_joiners"),
    callDigestRpc("digest_recent_renewals"),
    callDigestRpc("digest_recent_admin_actions"),
    callDigestRpc("digest_recent_payroll_runs"),
    callDigestRpc("digest_recent_tasks"),
  ]);

  return {
    requests: requests?.items ?? [],
    joiners: joiners?.items ?? [],
    renewals: renewals?.items ?? [],
    adminActions: adminActions?.items ?? [],
    payrollRuns: payrollRuns?.items ?? [],
    tasks: tasks?.items ?? [],
  };
}

/** @deprecated Use fetchAccountReport */
export const fetchQueryDigest = fetchAccountReport;

/** Parameterized query RPC — used by profile quick chips in QueryResultView. */
export async function callQueryRpc(rpcName, params) {
  const { data, error } = await supabase.rpc(rpcName, params);
  if (error) throw new Error(mapRpcError(error));
  return data ?? {};
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
