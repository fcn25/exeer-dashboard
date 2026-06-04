import { supabase } from "../utils/supabaseClient.js";
import { getAuthUser, getCompanyId } from "../utils/mobileAuth.js";
import {
  normalizeAppRole,
  normalizeAssignedEmployeeIds,
} from "../constants/roles.js";
import { getCurrentUserRole, isDirectManager } from "../utils/rbac.js";
import {
  REQUEST_STATUS_LABELS,
  createEmployeeRequest,
} from "./requestsService.js";

const TEAM_EMPLOYEE_SELECT =
  "id, full_name, email, department, job_title_name, employment_status, direct_manager_name, employee_number";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر إكمال العملية.";
}

function namesMatch(employeeManagerName, managerDisplayName) {
  const a = String(employeeManagerName ?? "").trim().toLowerCase();
  const b = String(managerDisplayName ?? "").trim().toLowerCase();
  return Boolean(a && b && a === b);
}

async function fetchAssignedEmployeeIdsForDirectManager() {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("role_permissions")
    .select("assigned_employees")
    .eq("company_id", companyId)
    .eq("role_name", "Direct_Manager")
    .maybeSingle();

  if (error) throw new Error(mapDbError(error));
  return normalizeAssignedEmployeeIds(data?.assigned_employees);
}

export async function listMyTeamEmployees() {
  const companyId = getCompanyId();
  const user = getAuthUser();
  const role = getCurrentUserRole();

  const { data, error } = await supabase
    .from("employees")
    .select(TEAM_EMPLOYEE_SELECT)
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });

  if (error) throw new Error(mapDbError(error));
  const rows = data ?? [];

  const hrOversightRoles = new Set([
    "owner",
    "Executive",
    "HR_Manager",
    "HR_Assistant",
  ]);

  if (hrOversightRoles.has(normalizeAppRole(role))) {
    return rows;
  }

  if (!isDirectManager(role)) return [];

  const assignedIds = await fetchAssignedEmployeeIdsForDirectManager();
  const managerName = user?.name ?? "";

  return rows.filter(
    (row) =>
      assignedIds.includes(Number(row.id)) ||
      namesMatch(row.direct_manager_name, managerName),
  );
}

export async function listTeamPendingRequests(teamEmployeeIds = []) {
  const companyId = getCompanyId();
  const ids = [
    ...new Set(teamEmployeeIds.map((id) => Number(id)).filter(Boolean)),
  ];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("requests")
    .select(
      "id, employee_id, request_type, details, status, routing_to, amount, installments, created_at",
    )
    .eq("company_id", companyId)
    .eq("routing_to", "Direct_Manager")
    .eq("status", "Pending")
    .in("employee_id", ids)
    .order("created_at", { ascending: false });

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

export async function updateTeamRequestStatus(requestId, status) {
  const companyId = getCompanyId();
  const { data, error } = await supabase
    .from("requests")
    .update({ status })
    .eq("company_id", companyId)
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(mapDbError(error));
  return data;
}

export const MANAGER_HR_REQUEST_TYPES = [
  { id: "training", label: "طلب تدريب" },
  { id: "hiring", label: "طلب توظيف" },
  { id: "promotion", label: "طلب ترقية" },
  { id: "evaluation", label: "طلب تقييم" },
  { id: "administrative", label: "طلب إجراء إداري" },
];

export async function submitManagerHrRequest({
  requestKind,
  details,
  employeeId,
}) {
  const kindLabel =
    MANAGER_HR_REQUEST_TYPES.find((item) => item.id === requestKind)?.label ??
    requestKind;

  const trimmedDetails = String(details ?? "").trim();
  if (!trimmedDetails) throw new Error("تفاصيل الطلب مطلوبة.");

  return createEmployeeRequest({
    requestType: "General",
    details: `[${kindLabel}] ${trimmedDetails}`,
    employeeId,
  });
}

export { REQUEST_STATUS_LABELS };
