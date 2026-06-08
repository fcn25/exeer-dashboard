import { supabase } from "../utils/supabaseClient.js";
import { getCurrentEmployeeCache } from "./currentEmployeeService.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import {
  normalizeAppRole,
  normalizeAssignedEmployeeIds,
} from "../constants/roles.js";
import { getCurrentUserRole, isDirectManager } from "../utils/rbac.js";
import {
  REQUEST_STATUS_LABELS,
  createEmployeeRequest,
  listManagerPendingRequests,
} from "./requestsService.js";
import {
  approveEmployeeRequest,
  rejectEmployeeRequest,
} from "./requestApprovalService.js";

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
  const managerName =
    getCurrentEmployeeCache()?.fullName ??
    getCurrentEmployeeCache()?.employee?.full_name ??
    "";

  return rows.filter(
    (row) =>
      assignedIds.includes(Number(row.id)) ||
      namesMatch(row.direct_manager_name, managerName),
  );
}

export async function listTeamPendingRequests(teamEmployeeIds = []) {
  const teamIdSet = new Set(
    teamEmployeeIds.map((id) => Number(id)).filter(Boolean),
  );

  const allRows = await listManagerPendingRequests({
    companyWide: true,
    limit: 50,
  });

  if (!teamIdSet.size) return allRows;

  return allRows.filter((row) => teamIdSet.has(Number(row.employee_id)));
}

export async function updateTeamRequestStatus(requestId, status) {
  if (status === "Approved") {
    return approveEmployeeRequest(requestId);
  }
  if (status === "Rejected") {
    return rejectEmployeeRequest(requestId);
  }

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

function resolveHrRequestKindLabel(requestKind) {
  return (
    MANAGER_HR_REQUEST_TYPES.find((item) => item.id === requestKind)?.label ??
    requestKind
  );
}

export async function listManagerHrRequestsByKind(requestKind, { limit = 50 } = {}) {
  const companyId = getCompanyId();
  const kindLabel = resolveHrRequestKindLabel(requestKind);
  const marker = `[${kindLabel}]`;

  const { data, error } = await supabase
    .from("requests")
    .select(
      "id, employee_id, details, status, created_at, employees ( full_name )",
    )
    .eq("company_id", companyId)
    .ilike("details", `${marker}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("requests")
      .select("id, employee_id, details, status, created_at")
      .eq("company_id", companyId)
      .ilike("details", `${marker}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fallbackError) throw new Error(mapDbError(fallbackError));
    return fallback ?? [];
  }

  return data ?? [];
}

export async function submitPromotionRequest({
  employeeId,
  employeeName,
  promotionReasons,
  evaluationResults,
}) {
  const trimmedReasons = String(promotionReasons ?? "").trim();
  const trimmedEvaluations = String(evaluationResults ?? "").trim();
  const resolvedName = String(employeeName ?? "").trim() || "موظف";

  if (!employeeId) throw new Error("اختر الموظف المراد ترقيته.");
  if (!trimmedReasons) throw new Error("أسباب الترقية مطلوبة.");

  const details = [
    `الموظف: ${resolvedName}`,
    "",
    "أسباب الترقية:",
    trimmedReasons,
    "",
    "نتائج التقييمات المساعدة على الترقية:",
    trimmedEvaluations || "—",
  ].join("\n");

  return submitManagerHrRequest({
    requestKind: "promotion",
    details,
    employeeId,
  });
}

export { REQUEST_STATUS_LABELS };
