import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { countCompanyRequests } from "./requestsService.js";
import { listCompanyPendingEvaluations } from "./performanceService.js";
import { fetchPayrollForMonth } from "./payrollService.js";
import { formatPayrollMonthFromPicker } from "../utils/payroll/calculations.js";

const ACTIVE_STATUSES = new Set(["نشط", "Active", "active"]);

function mapDbError(error) {
  return error?.message || "تعذّر جلب بيانات لوحة التحكم.";
}

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function currentMonthPickerValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthBoundsIso() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end = todayIsoDate();
  return { start, end };
}

function isSaudiNationality(nationality) {
  const value = String(nationality ?? "").trim().toLowerCase();
  return (
    value.includes("سعود") ||
    value.includes("saudi") ||
    value === "sa" ||
    value === "ksa"
  );
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isActiveEmployee(row) {
  return ACTIVE_STATUSES.has(String(row?.employment_status ?? "").trim());
}

async function fetchEmployeesSnapshot(companyId) {
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, full_name, nationality, employment_status, hire_date, iqama_expiry_date, probation_end_date",
    )
    .eq("company_id", companyId);

  if (error) throw new Error(mapDbError(error));
  return data ?? [];
}

async function fetchTodayAttendancePulse(companyId, today) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("employee_id, status, delay_minutes")
    .eq("company_id", companyId)
    .eq("record_date", today);

  if (error) throw new Error(mapDbError(error));

  const rows = data ?? [];
  const working = rows.filter(
    (row) => String(row.status ?? "") === "حضور",
  ).length;
  const onLeave = rows.filter(
    (row) => String(row.status ?? "") === "إجازة",
  ).length;
  const late = rows.filter((row) => Number(row.delay_minutes) > 0).length;

  return { working, onLeave, late };
}

async function fetchMonthlyAttendanceRate(companyId, bounds) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("status")
    .eq("company_id", companyId)
    .gte("record_date", bounds.start)
    .lte("record_date", bounds.end);

  if (error) throw new Error(mapDbError(error));

  const rows = data ?? [];
  if (!rows.length) return 0;

  const present = rows.filter((row) => String(row.status ?? "") === "حضور")
    .length;
  return Math.round((present / rows.length) * 100);
}

function buildIqamaActionItems(employees) {
  const items = [];

  for (const employee of employees) {
    if (!isActiveEmployee(employee)) continue;
    if (isSaudiNationality(employee.nationality)) continue;
    if (!employee.iqama_expiry_date) continue;

    const daysLeft = daysUntil(employee.iqama_expiry_date);
    if (daysLeft == null || daysLeft > 60) continue;

    items.push({
      id: `iqama-${employee.id}`,
      type: "iqama",
      priority: daysLeft < 30 ? "red" : "orange",
      title: `إقامة ${employee.full_name} تنتهي خلال ${daysLeft} يوم`,
      detail: `تاريخ الانتهاء: ${employee.iqama_expiry_date}`,
      actionLabel: "معالجة",
      employeeId: String(employee.id),
    });
  }

  return items.sort(
    (a, b) =>
      (a.priority === "red" ? 0 : 1) - (b.priority === "red" ? 0 : 1),
  );
}

function buildProbationActionItems(employees) {
  const items = [];

  for (const employee of employees) {
    if (!isActiveEmployee(employee)) continue;
    if (!employee.probation_end_date) continue;

    const daysLeft = daysUntil(employee.probation_end_date);
    if (daysLeft == null || daysLeft < 0 || daysLeft > 30) continue;

    items.push({
      id: `probation-${employee.id}`,
      type: "probation",
      priority: daysLeft <= 7 ? "red" : "orange",
      title: `فترة تجربة ${employee.full_name} تنتهي خلال ${daysLeft} يوم`,
      detail: `تاريخ نهاية التجربة: ${employee.probation_end_date}`,
      actionLabel: "قرار",
      employeeId: String(employee.id),
      employeeName: employee.full_name,
      probationEndDate: employee.probation_end_date,
    });
  }

  return items.sort((a, b) => a.priority.localeCompare(b.priority));
}

function buildEvaluationActionItems(evaluations) {
  const groups = new Map();

  for (const row of evaluations) {
    const cycleName = row.evaluation_cycles?.name ?? "دورة تقييم";
    const key = row.evaluation_cycles?.id ?? cycleName;
    if (!groups.has(key)) {
      groups.set(key, { cycleName, count: 0 });
    }
    groups.get(key).count += 1;
  }

  return [...groups.values()].map((group, index) => ({
    id: `evaluation-${index}`,
    type: "evaluation",
    priority: "blue",
    title: `تقييم ${group.cycleName} لـ ${group.count} موظفين مستحق`,
    detail: "تقييمات أداء بانتظار الإكمال",
    actionLabel: "ابدأ",
    href: "/dashboard/performance",
  }));
}

function computeTenureSummary(employees) {
  const active = employees.filter(isActiveEmployee);
  const withHireDate = active.filter((row) => row.hire_date);

  if (!withHireDate.length) {
    return { avgTenureMonths: 0, label: "—" };
  }

  const now = new Date();
  const totalMonths = withHireDate.reduce((sum, row) => {
    const hire = new Date(row.hire_date);
    if (Number.isNaN(hire.getTime())) return sum;
    const months =
      (now.getFullYear() - hire.getFullYear()) * 12 +
      (now.getMonth() - hire.getMonth());
    return sum + Math.max(0, months);
  }, 0);

  const avgTenureMonths = Math.round(totalMonths / withHireDate.length);
  const years = Math.floor(avgTenureMonths / 12);
  const months = avgTenureMonths % 12;
  const label =
    years > 0
      ? `${years} سنة${months ? ` و ${months} شهر` : ""}`
      : `${months} شهر`;

  return { avgTenureMonths, label };
}

export async function fetchHomeDashboardData({ includePayroll = false } = {}) {
  const companyId = getCompanyId();
  const today = todayIsoDate();
  const bounds = monthBoundsIso();
  const monthPicker = currentMonthPickerValue();

  const employees = await fetchEmployeesSnapshot(companyId);
  const [
    todayPulseRaw,
    attendanceRate,
    pendingRequestsCount,
    pendingEvaluations,
    payrollResult,
  ] = await Promise.all([
    fetchTodayAttendancePulse(companyId, today),
    fetchMonthlyAttendanceRate(companyId, bounds),
    countCompanyRequests(),
    listCompanyPendingEvaluations({ limit: 100 }),
    includePayroll
      ? fetchPayrollForMonth(monthPicker)
      : Promise.resolve({ rows: [] }),
  ]);

  const leaveFromStatus = employees.filter(
    (row) => String(row.employment_status ?? "").trim() === "إجازة",
  ).length;

  const todayPulse = {
    working: todayPulseRaw.working,
    onLeave: Math.max(todayPulseRaw.onLeave, leaveFromStatus),
    late: todayPulseRaw.late,
  };

  const activeEmployees = employees.filter(isActiveEmployee);
  const saudiCount = activeEmployees.filter((row) =>
    isSaudiNationality(row.nationality),
  ).length;
  const nonSaudiCount = activeEmployees.length - saudiCount;
  const tenure = computeTenureSummary(employees);

  const actionItems = [
    ...buildIqamaActionItems(employees),
    ...buildProbationActionItems(employees),
    ...(pendingRequestsCount > 0
      ? [
          {
            id: "pending-requests",
            type: "requests",
            priority: "blue",
            title: `${pendingRequestsCount} طلبات بانتظار موافقتك`,
            detail: "طلبات الموظفين قيد المراجعة",
            actionLabel: "مراجعة",
            href: "/dashboard/my-team",
          },
        ]
      : []),
    ...buildEvaluationActionItems(pendingEvaluations),
  ].sort((a, b) => {
    const order = { red: 0, orange: 1, blue: 2 };
    return order[a.priority] - order[b.priority];
  });

  const monthlyPayrollTotal = includePayroll
    ? (payrollResult.rows ?? []).reduce(
        (sum, row) => sum + (Number(row.net) || 0),
        0,
      )
    : null;

  return {
    todayPulse,
    actionItems,
    smartStats: {
      attendanceRate,
      employeeCount: activeEmployees.length,
      saudiCount,
      nonSaudiCount,
      tenureLabel: tenure.label,
      monthlyPayrollTotal,
      payrollMonthLabel: formatPayrollMonthFromPicker(monthPicker),
    },
  };
}
