import { getAppDateLocale } from "../i18n/formatLocale.js";
import { supabase } from "../utils/supabaseClient.js";
import { getCompanyId } from "../utils/mobileAuth.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";
import {
  listManagerPendingRequests,
  REQUEST_TYPE_OPTIONS,
} from "./requestsService.js";
import { listMyTeamEmployees } from "./myTeamService.js";
import { buildRequestSummary } from "../utils/requestDetails.js";
import { listCompanyPendingEvaluations } from "./performanceService.js";
import {
  fetchPayrollForMonth,
  fetchPayrollHistorySummaries,
} from "./payrollService.js";
import { formatPayrollMonthFromPicker } from "../utils/payroll/calculations.js";
import { calculateEvaluationScore } from "./performanceLegacyHelpers.js";
import { fetchNitaqatDashboardSnapshot } from "./nitaqatService.js";

const INACTIVE_EMPLOYMENT_STATUSES = new Set(["منتهي الخدمة", "موقوف"]);

const SAUDI_NATIONALITIES = new Set([
  "سعودي",
  "سعودية",
  "saudi",
  "sa",
  "ksa",
]);

const EMPLOYEE_SELECT_FULL =
  "id, full_name, nationality, employment_status, hire_date, job_title_name, iqama_expiry_date, probation_end_date, work_permit_expiry_date";

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
  return SAUDI_NATIONALITIES.has(
    String(nationality ?? "").trim().toLowerCase(),
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
  const status = String(row?.employment_status ?? "").trim();
  if (!status) return true;
  if (INACTIVE_EMPLOYMENT_STATUSES.has(status)) return false;
  const lower = status.toLowerCase();
  return !["منتهي", "مستقيل", "terminated", "resigned", "inactive"].some(
    (token) => lower === token || lower.includes(token),
  );
}

function formatEventTime(datetime) {
  if (!datetime) return "—";
  try {
    return new Intl.DateTimeFormat(getAppDateLocale(), {
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

function parseMonthPicker(pickerValue) {
  const [yearPart, monthPart] = String(pickerValue ?? "").split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!year || !month) return null;
  return { year, month, payrollMonth: `${month}/${year}` };
}

function sumPayrollDeductions(rawRows) {
  return (rawRows ?? []).reduce((sum, row) => {
    const totalField = Number(row.total_deductions);
    if (Number.isFinite(totalField) && totalField !== 0) {
      return sum + totalField;
    }

    const gosi = Number(row.gosi_deduction ?? row.gosi) || 0;
    const penalties = Number(row.penalty_deductions ?? row.penalties) || 0;
    const late =
      Number(row.delay_deductions ?? row.lateness_deduction ?? row.delays) ||
      0;
    const loans = Number(row.loan_deductions) || 0;

    return sum + gosi + penalties + late + loans;
  }, 0);
}

function sumPayrollOvertime(rawRows) {
  return (rawRows ?? []).reduce(
    (sum, row) => sum + (Number(row.overtime) || 0),
    0,
  );
}

async function fetchPayrollRawRecords(companyId, monthPicker) {
  const period = parseMonthPicker(monthPicker);
  if (!period) return [];

  const byPayrollMonth = await supabase
    .from("payroll_records")
    .select("*")
    .eq("company_id", companyId)
    .eq("payroll_month", period.payrollMonth);

  if (!byPayrollMonth.error && (byPayrollMonth.data ?? []).length) {
    return byPayrollMonth.data ?? [];
  }

  const byLegacy = await supabase
    .from("payroll_records")
    .select("*")
    .eq("company_id", companyId)
    .eq("month", period.month)
    .eq("year", period.year);

  if (byLegacy.error) return [];
  return byLegacy.data ?? [];
}

async function fetchPayrollHero(includePayroll, monthPicker, companyId) {
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

  const rawRecords = await safeCall(
    () => fetchPayrollRawRecords(companyId, monthPicker),
    [],
  );

  return {
    total: liveTotal > 0 ? liveTotal : (current?.totalNet ?? 0),
    monthLabel: formatPayrollMonthFromPicker(monthPicker),
    percentChange,
    totalDeductions: sumPayrollDeductions(rawRecords),
    totalOvertime: sumPayrollOvertime(rawRecords),
    hasData: Boolean(current) || rows.length > 0,
  };
}

async function fetchPendingRequestsPreview() {
  const team = await safeCall(() => listMyTeamEmployees(), []);
  const teamById = new Map(team.map((row) => [Number(row.id), row]));
  const teamIdSet = new Set(team.map((row) => Number(row.id)));

  const allRows = await safeCall(
    () => listManagerPendingRequests({ companyWide: true, limit: 30 }),
    [],
  );

  const filtered = teamIdSet.size
    ? allRows.filter((row) => teamIdSet.has(Number(row.employee_id)))
    : allRows;
  const rows = filtered.slice(0, 8);

  return {
    total: filtered.length,
    items: rows.map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName:
        row.employees?.full_name ??
        teamById.get(Number(row.employee_id))?.full_name ??
        "موظف",
      requestType: resolveRequestTypeLabel(row.request_type),
      requestTypeRaw: row.request_type,
      createdAt: row.created_at,
      summary: buildRequestSummary(row),
      request: row,
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

const CONTRACT_EXPIRY_WINDOW_DAYS = 90;
const IQAMA_EXPIRY_WINDOW_DAYS = 30;
const WORK_PERMIT_EXPIRY_WINDOW_DAYS = 45;
/** فترة التجربة من تاريخ التعيين (hire_date) */
const PROBATION_PERIOD_DAYS = 80;
const PROBATION_ALERT_WINDOW_DAYS = 10;

function toIsoDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIsoDateOnly(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function addCalendarDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Next annual contract end from hire_date anniversary (start of each contract year). */
function getNextAnnualContractEndDate(hireDate) {
  const hire = parseIsoDateOnly(hireDate);
  if (!hire) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let year = today.getFullYear();
  let end = new Date(year, hire.getMonth(), hire.getDate());
  if (end.getTime() <= today.getTime()) {
    end = new Date(year + 1, hire.getMonth(), hire.getDate());
  }

  return toIsoDateOnly(end);
}

/** نهاية التجربة = تاريخ التعيين + ٨٠ يوماً (بيانات حية من employees.hire_date). */
function resolveProbationEndDate(employee) {
  if (!employee.hire_date) return null;

  const hire = parseIsoDateOnly(employee.hire_date);
  if (!hire) return null;

  return toIsoDateOnly(addCalendarDays(hire, PROBATION_PERIOD_DAYS));
}

function formatArabicDaysLeft(daysLeft) {
  if (daysLeft === 0) return "اليوم";
  if (daysLeft === 1) return "يوم واحد";
  if (daysLeft === 2) return "يومان";
  if (daysLeft >= 3 && daysLeft <= 10) return `${daysLeft} أيام`;
  return `${daysLeft} يوم`;
}

function buildEmergencyAlertItem(employee, endDate, daysLeft, type, message) {
  return {
    id: `${type}-${employee.id}`,
    type,
    employeeId: String(employee.id),
    fullName: employee.full_name ?? "موظف",
    jobTitle: employee.job_title_name ?? "—",
    endDate,
    daysLeft,
    message,
    severity: daysLeft <= 7 ? "critical" : "warning",
  };
}

function buildContractExpiryAlerts(employees) {
  const items = [];

  for (const employee of employees) {
    if (!isActiveEmployee(employee)) continue;
    if (!employee.hire_date) continue;

    const endDate = getNextAnnualContractEndDate(employee.hire_date);
    const daysLeft = daysUntil(endDate);
    if (daysLeft == null || daysLeft < 0 || daysLeft > CONTRACT_EXPIRY_WINDOW_DAYS) {
      continue;
    }

    const daysPhrase = formatArabicDaysLeft(daysLeft);
    items.push({
      ...buildEmergencyAlertItem(
        employee,
        endDate,
        daysLeft,
        "contract",
        `ينتهي العقد السنوي بعد ${daysPhrase} — ذكرى بداية العقد ${employee.hire_date}`,
      ),
      contractStartDate: employee.hire_date,
    });
  }

  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

function buildIqamaExpiryAlerts(employees) {
  const items = [];

  for (const employee of employees) {
    if (!isActiveEmployee(employee)) continue;
    if (isSaudiNationality(employee.nationality)) continue;
    if (!employee.iqama_expiry_date) continue;

    const daysLeft = daysUntil(employee.iqama_expiry_date);
    if (
      daysLeft == null ||
      daysLeft < 0 ||
      daysLeft > IQAMA_EXPIRY_WINDOW_DAYS
    ) {
      continue;
    }

    const daysPhrase = formatArabicDaysLeft(daysLeft);
    items.push(
      buildEmergencyAlertItem(
        employee,
        employee.iqama_expiry_date,
        daysLeft,
        "iqama",
        `متبقي ${daysPhrase} على انتهاء الإقامة — ${employee.iqama_expiry_date}`,
      ),
    );
  }

  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

function buildWorkPermitAlerts(employees) {
  const items = [];

  for (const employee of employees) {
    if (!isActiveEmployee(employee)) continue;
    if (!employee.work_permit_expiry_date) continue;

    const daysLeft = daysUntil(employee.work_permit_expiry_date);
    if (
      daysLeft == null ||
      daysLeft < 0 ||
      daysLeft > WORK_PERMIT_EXPIRY_WINDOW_DAYS
    ) {
      continue;
    }

    const daysPhrase = formatArabicDaysLeft(daysLeft);
    items.push(
      buildEmergencyAlertItem(
        employee,
        employee.work_permit_expiry_date,
        daysLeft,
        "workPermit",
        `متبقي ${daysPhrase} على انتهاء رخصة العمل — ${employee.work_permit_expiry_date}`,
      ),
    );
  }

  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

function buildProbationEndingAlerts(employees) {
  const items = [];

  for (const employee of employees) {
    if (!isActiveEmployee(employee)) continue;

    const endDate = resolveProbationEndDate(employee);
    const daysLeft = daysUntil(endDate);
    if (
      daysLeft == null ||
      daysLeft < 0 ||
      daysLeft > PROBATION_ALERT_WINDOW_DAYS
    ) {
      continue;
    }

    const daysPhrase = formatArabicDaysLeft(daysLeft);
    const name = employee.full_name ?? "الموظف";
    items.push({
      ...buildEmergencyAlertItem(
        employee,
        endDate,
        daysLeft,
        "probation",
        `تبقت ${daysPhrase} وتنتهي فترة تجربة ${name}`,
      ),
      employeeName: name,
      probationEndDate: endDate,
      hireDate: employee.hire_date,
    });
  }

  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

function buildEmergencyAlerts(employees) {
  const contracts = buildContractExpiryAlerts(employees);
  const iqamas = buildIqamaExpiryAlerts(employees);
  const probations = buildProbationEndingAlerts(employees);
  const workPermits = buildWorkPermitAlerts(employees);

  return {
    contracts,
    iqamas,
    probations,
    workPermits,
    totalCount:
      contracts.length +
      iqamas.length +
      probations.length +
      workPermits.length,
  };
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
    _legacyPendingCount,
    pendingEvaluations,
    payrollHero,
    todayAgenda,
    pendingRequests,
    topPerformers,
    monthlyRequests,
    nitaqat,
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
    Promise.resolve(0),
    safeCall(() => listCompanyPendingEvaluations({ limit: 100 }), []),
    safeCall(() => fetchPayrollHero(includePayroll, monthPicker, companyId), null),
    safeCall(() => fetchTodayAgenda(companyId, today), []),
    safeCall(() => fetchPendingRequestsPreview(), { total: 0, items: [] }),
    safeCall(() => fetchTopPerformers(companyId, bounds), []),
    safeCall(() => fetchMonthlyRequestsStats(companyId, bounds), {
      count: 0,
      hasData: false,
      sparkline: [],
    }),
    safeCall(() => fetchNitaqatDashboardSnapshot(), null),
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

  const workforceEmployees = employees.filter(isActiveEmployee);
  const saudiCount = workforceEmployees.filter((row) =>
    isSaudiNationality(row.nationality),
  ).length;
  const nonSaudiCount = workforceEmployees.length - saudiCount;
  const tenure = computeTenureSummary(employees);

  const actionItems = [
    ...buildIqamaActionItems(employees),
    ...buildProbationActionItems(employees),
    ...(pendingRequests.items ?? []).map((item) => ({
      id: `request-${item.id}`,
      type: "request",
      priority: "blue",
      title: `${item.employeeName} — ${item.requestType}`,
      detail: item.summary,
      requestId: item.id,
      request: item.request,
      employeeName: item.employeeName,
    })),
    ...buildEvaluationActionItems(pendingEvaluations),
  ].sort((a, b) => {
    const order = { red: 0, orange: 1, blue: 2, gray: 3 };
    return order[a.priority] - order[b.priority];
  });

  const emergencyAlerts = buildEmergencyAlerts(employees);

  return {
    todayPulse,
    actionItems,
    emergencyAlerts,
    payrollHero,
    todayAgenda,
    pendingRequests,
    topPerformers,
    smartStats: {
      attendanceRate: attendanceResult.rate,
      hasAttendanceData: attendanceResult.hasData,
      attendanceSparkline: attendanceResult.sparkline,
      employeeCount: workforceEmployees.length,
      hasEmployeeData: workforceEmployees.length > 0,
      saudiCount,
      nonSaudiCount,
      tenureLabel: tenure.label,
      hasTenureData: tenure.hasData,
      monthlyRequestsCount: monthlyRequests.count,
      hasMonthlyRequestsData: monthlyRequests.hasData,
      monthlyRequestsSparkline: monthlyRequests.sparkline,
      payrollMonthLabel: formatPayrollMonthFromPicker(monthPicker),
    },
    nitaqat,
  };
}
