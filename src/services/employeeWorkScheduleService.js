import { supabase } from "../utils/supabaseClient.js";
import { requireCompanyId, scopeQueryByCompany } from "../utils/tenantScope.js";
import { isMissingColumnError } from "../utils/supabaseErrors.js";
function rowsToSettingsMap(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const raw = row.setting_value;
    const value =
      raw != null && typeof raw === "object" && "value" in raw ? raw.value : raw;
    map.set(row.setting_key, value);
  }
  return map;
}
import {
  getAssignedShiftIndices,
  getEmployeeAssignedPeriods,
  normalizeEmployeeWorkPeriodIds,
  normalizeWorkPeriodsConfig,
  parseWorkPeriodsSetting,
} from "../utils/attendance/workSchedules.js";

function mapDbError(error) {
  if (!error) return "حدث خطأ غير متوقع.";
  return error.message || "تعذّر تحميل مواعيد العمل.";
}

export function buildEmployeeAttendanceSchedule({
  workPeriodsConfig,
  employeePeriodIds,
}) {
  const config = normalizeWorkPeriodsConfig(workPeriodsConfig);
  const assignedPeriods = getEmployeeAssignedPeriods(config, employeePeriodIds);
  const assignedShiftIndices = getAssignedShiftIndices(assignedPeriods);

  return {
    config,
    assignedPeriods,
    assignedShiftIndices,
  };
}

export async function fetchEmployeeWorkPeriodIds(employeeId) {
  const companyId = requireCompanyId("مواعيد العمل");
  const resolvedEmployeeId = Number(employeeId);
  if (!Number.isFinite(resolvedEmployeeId) || resolvedEmployeeId <= 0) {
    return ["period_1"];
  }

  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("employees")
      .select("work_period_ids")
      .eq("id", resolvedEmployeeId),
    companyId,
  ).maybeSingle();

  if (error) {
    if (isMissingColumnError(error)) return ["period_1"];
    throw new Error(mapDbError(error));
  }

  return normalizeEmployeeWorkPeriodIds(
    data?.work_period_ids,
    parseWorkPeriodsSetting().periods,
  );
}

async function fetchCompanyWorkPeriodsConfig(companyId) {
  const { data, error } = await scopeQueryByCompany(
    supabase
      .from("company_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["work_periods", "work_start_time", "work_end_time"]),
    companyId,
  );

  if (error) throw new Error(mapDbError(error));

  const map = rowsToSettingsMap(data ?? []);
  return parseWorkPeriodsSetting((key) => map.get(key));
}

export async function fetchEmployeeAttendanceSchedule(employeeId, getSetting) {
  const workPeriodsConfig = parseWorkPeriodsSetting(getSetting);
  const employeePeriodIds = await fetchEmployeeWorkPeriodIds(employeeId);
  return buildEmployeeAttendanceSchedule({
    workPeriodsConfig,
    employeePeriodIds,
  });
}

export async function fetchEmployeeAttendanceScheduleFromDb(employeeId) {
  const companyId = requireCompanyId("مواعيد العمل");
  const [workPeriodsConfig, employeePeriodIds] = await Promise.all([
    fetchCompanyWorkPeriodsConfig(companyId),
    fetchEmployeeWorkPeriodIds(employeeId),
  ]);

  return buildEmployeeAttendanceSchedule({
    workPeriodsConfig,
    employeePeriodIds,
  });
}

export function toAttendanceScheduleContext(schedule) {
  return {
    assignedPeriods: schedule.assignedPeriods,
    assignedShiftIndices: schedule.assignedShiftIndices,
  };
}
