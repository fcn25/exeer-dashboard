import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import {
  buildTodayAttendanceSummary,
  formatWorkingDuration,
} from "../utils/attendance/summary.js";
import { formatPortalDate } from "../utils/portalGreeting.js";
import { normalizeTaskStatus } from "../utils/taskStatus.js";
import { ADMINISTRATIVE_ACTION_TYPE_LABELS } from "../constants/administrativeActions.js";
import { fetchTodayAttendanceForEmployee } from "./attendanceService.js";
import { fetchPortalSnapshot } from "./portalService.js";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_OPTIONS,
  countCompanyRequests,
  listCompanyRequests,
  listEmployeeRequests,
} from "./requestsService.js";
import { listTasks } from "./tasksService.js";
import {
  listCompanyPendingEvaluations,
  listPendingEvaluationsForEmployee,
} from "./performanceService.js";
import { fetchAdministrativeActionsMasterLog } from "./administrativeActionsService.js";
import { fetchEmployeeProfileById } from "./employeeProfileService.js";

const PENDING_REQUEST_STATUSES = ["Pending", "In_Review"];

function getRequestTypeLabel(value) {
  return REQUEST_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function isPendingTask(status) {
  return normalizeTaskStatus(status) !== "مكتملة";
}

async function countRows(table, filter) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) throw new Error(error.message || "تعذّر جلب الإحصائيات.");
  return count ?? 0;
}

function mapRequestRow(row, { self = false } = {}) {
  return {
    id: row.id,
    employee: self ? "أنت" : row.employees?.full_name ?? "—",
    type: getRequestTypeLabel(row.request_type),
    status: REQUEST_STATUS_LABELS[row.status] ?? row.status ?? "—",
    date: formatPortalDate(row.created_at),
  };
}

function mapTaskRow(task) {
  return {
    id: task.id,
    title: task.title || task.description?.slice(0, 80) || "مهمة",
    status: normalizeTaskStatus(task.status),
    deadline: task.deadline ? formatPortalDate(task.deadline) : null,
  };
}

function mapEvaluationRow(evaluation) {
  return {
    id: evaluation.id,
    title:
      evaluation.evaluation_templates?.title ??
      evaluation.evaluation_templates?.title_ar ??
      "نموذج تقييم",
    cycle: evaluation.evaluation_cycles?.name ?? "دورة تقييم",
    due: evaluation.evaluation_cycles?.end_date
      ? formatPortalDate(evaluation.evaluation_cycles.end_date)
      : "—",
    employee: evaluation.employeeName ?? null,
  };
}

function mapAchievementRow(item) {
  return {
    id: item.id,
    title: item.title ?? "إنجاز",
    date: formatPortalDate(item.achievement_date),
  };
}

function mapLogRow(item) {
  const actionLabel =
    ADMINISTRATIVE_ACTION_TYPE_LABELS[item.actionType] ?? item.actionType;
  return {
    id: item.id,
    title: `${actionLabel} — ${item.reason?.slice(0, 60) || "إجراء إداري"}`,
    employee: item.employeeName ?? "—",
    date: formatPortalDate(item.actionDate ?? item.createdAt),
  };
}

function buildEmployeeBentoStats({ snapshot, requests, attendance }) {
  const pendingRequests = requests.filter((row) =>
    PENDING_REQUEST_STATUSES.includes(row.status),
  ).length;

  return [
    {
      id: "today-hours",
      value: formatWorkingDuration(attendance.workingMinutes),
      label: "ساعات اليوم",
      accent: "text-emerald-700",
      bg: "bg-emerald-50/80",
      span: 1,
    },
    {
      id: "pending-requests",
      value: String(pendingRequests),
      label: "طلبات معلقة",
      accent: "text-blue-700",
      bg: "bg-blue-50/80",
      span: 1,
    },
    {
      id: "pending-tasks",
      value: String(snapshot.stats.pendingTasks),
      label: "مهام معلقة",
      accent: "text-exeer-primary",
      bg: "bg-slate-50",
      span: 1,
    },
    {
      id: "leave-balance",
      value: String(snapshot.stats.leaveBalance ?? 0),
      label: "رصيد الإجازات (يوم)",
      accent: "text-violet-700",
      bg: "bg-violet-50/80",
      span: 1,
    },
  ];
}

async function fetchAdminBentoStats() {
  const companyId = getCompanyId();

  const [pendingTasks, pendingRequests, pendingLeaveRequests, achievementsCount] =
    await Promise.all([
      countRows("tasks", (q) =>
        q.eq("company_id", companyId).neq("status", "مكتملة"),
      ),
      countCompanyRequests(),
      countCompanyRequests({ requestType: "Leave" }),
      countRows("employee_achievements", (q) => q.eq("company_id", companyId)),
    ]);

  return [
    {
      id: "pending-tasks",
      value: String(pendingTasks),
      label: "مهام معلقة",
      accent: "text-exeer-primary",
      bg: "bg-slate-50",
      span: 1,
    },
    {
      id: "pending-requests",
      value: String(pendingRequests),
      label: "طلبات بانتظار الموافقة",
      accent: "text-blue-700",
      bg: "bg-blue-50/80",
      span: 1,
    },
    {
      id: "achievements",
      value: String(achievementsCount),
      label: "إنجازات الفريق",
      accent: "text-amber-700",
      bg: "bg-amber-50/80",
      span: 1,
    },
    {
      id: "leave-balance",
      value: String(pendingLeaveRequests),
      label: "طلبات إجازة معلقة",
      accent: "text-emerald-700",
      bg: "bg-emerald-50/80",
      span: 1,
    },
  ];
}

export async function fetchEmployeeMobileDashboard(employeeId) {
  if (!employeeId) {
    throw new Error("لم يتم ربط حسابك بسجل موظف. تواصل مع الموارد البشرية.");
  }

  const [snapshot, requests, evaluations, attendance] = await Promise.all([
    fetchPortalSnapshot(employeeId),
    listEmployeeRequests(employeeId),
    listPendingEvaluationsForEmployee(employeeId),
    fetchTodayAttendanceForEmployee(employeeId),
  ]);

  const pendingTasks = ensureArray(snapshot.tasks).filter((task) =>
    isPendingTask(task.status),
  );

  return {
    employee: snapshot.employee,
    attendance,
    bentoStats: buildEmployeeBentoStats({ snapshot, requests, attendance }),
    tabData: {
      requests: requests.map((row) => mapRequestRow(row, { self: true })),
      tasks: pendingTasks.map(mapTaskRow),
      evaluations: evaluations.map(mapEvaluationRow),
      achievements: ensureArray(snapshot.achievements).map(mapAchievementRow),
    },
  };
}

export async function fetchAdminMobileDashboard(employeeId) {
  const [
    bentoStats,
    requests,
    tasks,
    evaluations,
    logs,
    attendance,
    employee,
  ] = await Promise.all([
    fetchAdminBentoStats(),
    listCompanyRequests({ limit: 50 }),
    listTasks(),
    listCompanyPendingEvaluations({ limit: 50 }),
    fetchAdministrativeActionsMasterLog(),
    employeeId
      ? fetchTodayAttendanceForEmployee(employeeId)
      : Promise.resolve(buildTodayAttendanceSummary(null)),
    employeeId
      ? fetchEmployeeProfileById(employeeId)
      : Promise.resolve(null),
  ]);

  const pendingTasks = ensureArray(tasks).filter((task) =>
    isPendingTask(task.status),
  );

  return {
    employee,
    attendance,
    bentoStats,
    tabData: {
      requests: requests.map((row) => mapRequestRow(row)),
      tasks: pendingTasks.slice(0, 50).map(mapTaskRow),
      evaluations: evaluations.map(mapEvaluationRow),
      logs: logs.slice(0, 50).map(mapLogRow),
    },
  };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}
