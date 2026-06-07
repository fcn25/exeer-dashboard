import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";
import {
  countCompanyRequests,
  listCompanyRequests,
  REQUEST_TYPE_OPTIONS,
} from "./requestsService.js";
import { listCompanyPendingEvaluations } from "./performanceService.js";
import {
  fetchPayrollForMonth,
  fetchPayrollHistorySummaries,
} from "./payrollService.js";
import { formatPayrollMonthFromPicker } from "../utils/payroll/calculations.js";
import { calculateEvaluationScore } from "../constants/evaluationCriteria.js";

const ACTIVE_STATUSES = new Set(["نشط", "Active", "active"]);

const EMPLOYEE_SELECT_FULL =
  "id, full_name, nationality, employment_status, hire_date, job_title_name, iqama_expiry_date, probation_end_date";

const EMPLOYEE_SELECT_BASE =
  "id, full_name, nationality, employment_status, hire_date, job_title_name";

const REQUEST_TYPE_LABELS = Object.fromEntries(
  REQUEST_TYPE_OPTIONS.map((item) => [item.value, item.label]),
);

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

function lastNDaysIso(count) {
  const days = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
  }
  return days;
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

function formatEventTime(datetime) {
  if (!datetime) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(datetime));
  } catch {
    return "—";
  }
}

function resolveRequestTypeLabel(requestType) {
  return REQUEST_TYPE_LABELS[requestType] ?? requestType ?? "طلب";
}

function formatShortMonthLabel(month, year) {
  if (!month || !year) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", { month: "short" }).format(
      new Date(year, month - 1, 1),
    );
  } catch {
    return `${month}/${year}`;
  }
}

function scoreFromAnswers(answers) {
  if (!answers || typeof answers !== "object") return null;
  const score = calculateEvaluationScore(answers);
  return Number.isFinite(score) ? score : null;
}

async function safeCall(fn, fallback) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function fetchEmployeesSnapshot(companyId) {
  const fullQuery = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT_FULL)
    .eq("company_id", companyId);

  if (!fullQuery.error) return fullQuery.data ?? [];

  if (isMissingColumnError(fullQuery.error)) {
    const baseQuery = await supabase
      .from("employees")
      .select(EMPLOYEE_SELECT_BASE)
      .eq("company_id", companyId);
    if (!baseQuery.error) return baseQuery.data ?? [];
  }

  return [];
}

async function fetchTodayAttendancePulse(companyId, today) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("employee_id, status, delay_minutes")
    .eq("company_id", companyId)
    .eq("record_date", today);

  if (error) return { working: 0, onLeave: 0, late: 0, hasData: false };

  const rows = data ?? [];
  return {
    working: rows.filter((row) => String(row.status ?? "") === "حضور").length,
    onLeave: rows.filter((row) => String(row.status ?? "") === "إجازة").length,
    late: rows.filter((row) => Number(row.delay_minutes) > 0).length,
    hasData: rows.length > 0,
  };
}

async function fetchMonthlyAttendanceRate(companyId, bounds) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("status")
    .eq("company_id", companyId)
    .gte("record_date", bounds.start)
    .lte("record_date", bounds.end);

  if (error) return { rate: 0, hasData: false, sparkline: [] };

  const rows = data ?? [];
  if (!rows.length) return { rate: 0, hasData: false, sparkline: [] };

  const present = rows.filter((row) => String(row.status ?? "") === "حضور")
    .length;

  const sparkline = await fetchAttendanceSparkline(companyId);

  return {
    rate: Math.round((present / rows.length) * 100),
    hasData: true,
    sparkline,
  };
}

async function fetchAttendanceSparkline(companyId) {
  const days = lastNDaysIso(7);
  const { data, error } = await supabase
    .from("attendance_records")
    .select("record_date, status")
    .eq("company_id", companyId)
    .in("record_date", days);

  if (error) return [];

  const grouped = new Map(days.map((day) => [day, { total: 0, present: 0 }]));

  for (const row of data ?? []) {
    const key = row.record_date;
    if (!grouped.has(key)) continue;
    const bucket = grouped.get(key);
    bucket.total += 1;
    if (String(row.status ?? "") === "حضور") bucket.present += 1;
  }

  return days.map((day) => {
    const bucket = grouped.get(day);
    const value =
      bucket.total > 0
        ? Math.round((bucket.present / bucket.total) * 100)
        : 0;
    return { value };
  });
}

async function fetchMonthlyRequestsStats(companyId, bounds) {
  const { data, error } = await supabase
    .from("requests")
    .select("created_at")
    .eq("company_id", companyId)
    .gte("created_at", `${bounds.start}T00:00:00`)
    .lte("created_at", `${bounds.end}T23:59:59`);

  if (error) return { count: 0, hasData: false, sparkline: [] };

  const rows = data ?? [];
  const weeks = Array.from({ length: 6 }, (_, index) => ({
    key: index,
    value: 0,
  }));

  const now = new Date();
  for (const row of rows) {
    const created = new Date(row.created_at);
    if (Number.isNaN(created.getTime())) continue;
    const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    const bucket = Math.min(5, Math.max(0, 5 - Math.floor(diffDays / 7)));
    weeks[bucket].value += 1;
  }

  return {
    count: rows.length,
    hasData: rows.length > 0,
    sparkline: weeks.map((item) => ({ value: item.value })),
  };
}

async function fetchTodayAgenda(companyId, today) {
  const { data, error } = await supabase
    .from("events")
    .select("id, name, description, location, event_datetime")
    .eq("company_id", companyId)
    .order("event_datetime", { ascending: true });

  if (error) return [];

  return (data ?? [])
    .filter((row) => String(row.event_datetime ?? "").slice(0, 10) === today)
    .slice(0, 3)
    .map((row) => ({
      id: row.id,
      time: formatEventTime(row.event_datetime),
      title: row.name ?? "موعد",
      subtitle: row.location?.trim() || row.description?.trim() || "فعالية",
    }));
}

async function fetchPayrollHero(includePayroll, monthPicker) {
  if (!includePayroll) return null;

  const summaries = await safeCall(() => fetchPayrollHistorySummaries(), []);
  const sorted = [...summaries].sort(
    (a, b) => b.year - a.year || b.month - a.month,
  );

  const currentMonth = sorted.find((item) => item.pickerValue === monthPicker);
  const current = currentMonth ?? sorted[0] ?? null;
  const previous = sorted.find(
    (item) =>
      item.pickerValue !== current?.pickerValue &&
      (item.year < current?.year ||
        (item.year === current?.year && item.month < current?.month)),
  );

  const sparklineSource = sorted.slice(0, 6).reverse();
  const sparkline = sparklineSource.map((item) => ({
    value: item.totalNet ?? 0,
    label: formatShortMonthLabel(item.month, item.year),
  }));

  let percentChange = null;
  if (current && previous && previous.totalNet > 0) {
    percentChange =
      Math.round(
        ((current.totalNet - previous.totalNet) / previous.totalNet) * 1000,
      ) / 10;
  }

  const currentResult = await safeCall(
    () => fetchPayrollForMonth(monthPicker),
    { rows: [] },
  );
  const rows = currentResult?.rows ?? [];
  const liveTotal = rows.reduce(
    (sum, row) => sum + (Number(row.net) || 0),
    0,
  );

  return {
    total: liveTotal > 0 ? liveTotal : (current?.totalNet ?? 0),
    monthLabel: formatPayrollMonthFromPicker(monthPicker),
    percentChange,
    sparkline,
    hasData: Boolean(current) || rows.length > 0,
  };
}

async function fetchPendingRequestsPreview() {
  const rows = await safeCall(() => listCompanyRequests({ limit: 4 }), []);
  const total = await safeCall(() => countCompanyRequests(), 0);

  return {
    total,
    items: rows.map((row) => ({
      id: row.id,
      employeeName: row.employees?.full_name ?? "موظف",
      requestType: resolveRequestTypeLabel(row.request_type),
      requestTypeRaw: row.request_type,
      createdAt: row.created_at,
    })),
  };
}

async function fetchTopPerformers(companyId, bounds) {
  const { data, error } = await supabase
    .from("evaluation_responses")
    .select(
      "employee_id, answers, completed_at, employees ( full_name, job_title_name )",
    )
    .eq("company_id", companyId)
    .eq("status", "completed")
    .gte("completed_at", `${bounds.start}T00:00:00`)
    .lte("completed_at", `${bounds.end}T23:59:59`)
    .order("completed_at", { ascending: true });

  if (!error && (data ?? []).length) {
    const grouped = new Map();

    for (const row of data) {
      const employeeId = Number(row.employee_id);
      const score = scoreFromAnswers(row.answers);
      if (!employeeId || score == null) continue;

      if (!grouped.has(employeeId)) {
        grouped.set(employeeId, {
          id: employeeId,
          name: row.employees?.full_name ?? "موظف",
          jobTitle: row.employees?.job_title_name ?? "—",
          scores: [],
        });
      }
      grouped.get(employeeId).scores.push(score);
    }

    const performers = [...grouped.values()]
      .map((item) => {
        const latest = item.scores[item.scores.length - 1] ?? 0;
        const average =
          item.scores.reduce((sum, value) => sum + value, 0) /
          item.scores.length;
        return {
          id: item.id,
          name: item.name,
          jobTitle: item.jobTitle,
          performanceLabel: `${Math.round(average * 10) / 10}/5`,
          sparkline: item.scores.slice(-6).map((value) => ({ value })),
        };
      })
      .sort(
        (a, b) =>
          Number(b.performanceLabel.split("/")[0]) -
          Number(a.performanceLabel.split("/")[0]),
      )
      .slice(0, 3);

    if (performers.length) return performers;
  }

  const achievements = await supabase
    .from("employee_achievements")
    .select(
      "employee_id, employees ( full_name, job_title_name )",
    )
    .eq("company_id", companyId)
    .gte("achievement_date", bounds.start)
    .lte("achievement_date", bounds.end);

  if (achievements.error) return [];

  const counts = new Map();
  for (const row of achievements.data ?? []) {
    const employeeId = Number(row.employee_id);
    if (!employeeId) continue;
    if (!counts.has(employeeId)) {
      counts.set(employeeId, {
        id: employeeId,
        name: row.employees?.full_name ?? "موظف",
        jobTitle: row.employees?.job_title_name ?? "—",
        count: 0,
      });
    }
    counts.get(employeeId).count += 1;
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      name: item.name,
      jobTitle: item.jobTitle,
      performanceLabel: `${item.count} إنجاز`,
      sparkline: [],
    }));
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
    priority: "gray",
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
    return { label: "—", hasData: false };
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

  return { label, hasData: true };
}

export async function fetchHomeDashboardData({ includePayroll = false } = {}) {
  const companyId = getCompanyId();
  const today = todayIsoDate();
  const bounds = monthBoundsIso();
  const monthPicker = currentMonthPickerValue();

  const employees = await fetchEmployeesSnapshot(companyId);

  const [
    todayPulseRaw,
    attendanceResult,
    pendingRequestsCount,
    pendingEvaluations,
    payrollHero,
    todayAgenda,
    pendingRequests,
    topPerformers,
    monthlyRequests,
  ] = await Promise.all([
    safeCall(() => fetchTodayAttendancePulse(companyId, today), {
      working: 0,
      onLeave: 0,
      late: 0,
      hasData: false,
    }),
    safeCall(() => fetchMonthlyAttendanceRate(companyId, bounds), {
      rate: 0,
      hasData: false,
      sparkline: [],
    }),
    safeCall(() => countCompanyRequests(), 0),
    safeCall(() => listCompanyPendingEvaluations({ limit: 100 }), []),
    safeCall(() => fetchPayrollHero(includePayroll, monthPicker), null),
    safeCall(() => fetchTodayAgenda(companyId, today), []),
    safeCall(() => fetchPendingRequestsPreview(), { total: 0, items: [] }),
    safeCall(() => fetchTopPerformers(companyId, bounds), []),
    safeCall(() => fetchMonthlyRequestsStats(companyId, bounds), {
      count: 0,
      hasData: false,
      sparkline: [],
    }),
  ]);

  const leaveFromStatus = employees.filter(
    (row) => String(row.employment_status ?? "").trim() === "إجازة",
  ).length;

  const todayPulse = {
    working: todayPulseRaw.working,
    onLeave: Math.max(todayPulseRaw.onLeave, leaveFromStatus),
    late: todayPulseRaw.late,
    hasData: todayPulseRaw.hasData || leaveFromStatus > 0,
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
    const order = { red: 0, orange: 1, blue: 2, gray: 3 };
    return order[a.priority] - order[b.priority];
  });

  return {
    todayPulse,
    actionItems,
    payrollHero,
    todayAgenda,
    pendingRequests,
    topPerformers,
    smartStats: {
      attendanceRate: attendanceResult.rate,
      hasAttendanceData: attendanceResult.hasData,
      attendanceSparkline: attendanceResult.sparkline,
      employeeCount: activeEmployees.length,
      hasEmployeeData: employees.length > 0,
      saudiCount,
      nonSaudiCount,
      tenureLabel: tenure.label,
      hasTenureData: tenure.hasData,
      monthlyRequestsCount: monthlyRequests.count,
      hasMonthlyRequestsData: monthlyRequests.hasData,
      monthlyRequestsSparkline: monthlyRequests.sparkline,
      payrollMonthLabel: formatPayrollMonthFromPicker(monthPicker),
    },
  };
}
