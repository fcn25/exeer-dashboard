import { normalizeWorkTime, workTimeToMinutes } from "./workHours.js";

export const WORK_PERIOD_IDS = ["period_1", "period_2"];

const PERIOD_ID_BY_SHIFT = {
  0: "period_1",
  1: "period_2",
};

const SHIFT_BY_PERIOD_ID = {
  period_1: 0,
  period_2: 1,
};

export const DEFAULT_WORK_PERIODS_CONFIG = {
  dual_shift_enabled: false,
  periods: [
    {
      id: "period_1",
      name: "الدوام الرسمي",
      start: "08:00",
      end: "17:00",
    },
    {
      id: "period_2",
      name: "الفترة الثانية",
      start: "16:00",
      end: "22:00",
    },
  ],
};

function normalizePeriod(period, index) {
  const fallback = DEFAULT_WORK_PERIODS_CONFIG.periods[index] ?? DEFAULT_WORK_PERIODS_CONFIG.periods[0];
  const id = WORK_PERIOD_IDS.includes(period?.id) ? period.id : fallback.id;

  return {
    id,
    name: String(period?.name ?? fallback.name).trim() || fallback.name,
    start: normalizeWorkTime(period?.start, fallback.start),
    end: normalizeWorkTime(period?.end, fallback.end),
  };
}

export function buildWorkPeriodsFromLegacyTimes(workStartTime, workEndTime) {
  return {
    ...DEFAULT_WORK_PERIODS_CONFIG,
    periods: [
      {
        ...DEFAULT_WORK_PERIODS_CONFIG.periods[0],
        start: normalizeWorkTime(workStartTime, "08:00"),
        end: normalizeWorkTime(workEndTime, "17:00"),
      },
      { ...DEFAULT_WORK_PERIODS_CONFIG.periods[1] },
    ],
  };
}

export function normalizeWorkPeriodsConfig(raw, legacy = {}) {
  if (raw && typeof raw === "object" && Array.isArray(raw.periods)) {
    const periods = [
      normalizePeriod(raw.periods[0], 0),
      normalizePeriod(raw.periods[1], 1),
    ];

    return {
      dual_shift_enabled: Boolean(raw.dual_shift_enabled),
      periods,
    };
  }

  return buildWorkPeriodsFromLegacyTimes(
    legacy.work_start_time,
    legacy.work_end_time,
  );
}

export function parseWorkPeriodsSetting(getSetting) {
  const stored = getSetting?.("work_periods");
  return normalizeWorkPeriodsConfig(stored, {
    work_start_time: getSetting?.("work_start_time"),
    work_end_time: getSetting?.("work_end_time"),
  });
}

export function getActiveCompanyPeriods(config) {
  const normalized = normalizeWorkPeriodsConfig(config);
  if (!normalized.dual_shift_enabled) {
    return [normalized.periods[0]];
  }
  return normalized.periods;
}

export function normalizeEmployeeWorkPeriodIds(value, companyPeriods) {
  const allowed = new Set(companyPeriods.map((period) => period.id));
  const source = Array.isArray(value) ? value : DEFAULT_WORK_PERIODS_CONFIG.periods[0].id;

  const ids = (Array.isArray(source) ? source : [source])
    .map((id) => String(id).trim())
    .filter((id) => allowed.has(id));

  if (ids.length) return [...new Set(ids)];
  return [companyPeriods[0]?.id ?? "period_1"];
}

export function getEmployeeAssignedPeriods(config, employeePeriodIds) {
  const companyPeriods = getActiveCompanyPeriods(config);
  const ids = normalizeEmployeeWorkPeriodIds(employeePeriodIds, companyPeriods);
  return companyPeriods.filter((period) => ids.includes(period.id));
}

export function getAssignedShiftIndices(assignedPeriods) {
  return assignedPeriods
    .map((period) => SHIFT_BY_PERIOD_ID[period.id])
    .filter((index) => Number.isFinite(index))
    .sort((a, b) => a - b);
}

export function getPeriodForShiftIndex(shiftIndex, assignedPeriods) {
  const periodId = PERIOD_ID_BY_SHIFT[shiftIndex];
  return assignedPeriods.find((period) => period.id === periodId) ?? null;
}

export function getShiftIndexForPunchField(field) {
  if (field === "check_in_1" || field === "check_out_1") return 0;
  if (field === "check_in_2" || field === "check_out_2") return 1;
  return null;
}

export function buildPunchLabel(baseLabel, period) {
  const name = String(period?.name ?? "").trim();
  return name ? `${baseLabel} — ${name}` : baseLabel;
}

export function canPunchOutForPeriod(period, nowMinutes = null) {
  if (!period) return true;
  const current =
    nowMinutes == null
      ? new Date().getHours() * 60 + new Date().getMinutes()
      : nowMinutes;
  return current >= workTimeToMinutes(period.end);
}

export function serializeWorkPeriodsForSave(config) {
  const normalized = normalizeWorkPeriodsConfig(config);
  const primary = normalized.periods[0];
  return {
    work_periods: normalized,
    work_start_time: primary.start,
    work_end_time: primary.end,
  };
}
