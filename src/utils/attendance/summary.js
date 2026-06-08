import {
  buildPunchLabel,
  getPeriodForShiftIndex,
  getShiftIndexForPunchField,
} from "./workSchedules.js";

export function formatWorkingDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0د";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}د`;
  if (minutes === 0) return `${hours}س`;
  return `${hours}س ${minutes}د`;
}

function parseTimeToMinutes(timeValue) {
  if (!timeValue) return null;
  const parts = String(timeValue).split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function formatAttendanceClockTime(timeValue) {
  const minutes = parseTimeToMinutes(timeValue);
  if (minutes == null) return null;

  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? "م" : "ص";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${String(mins).padStart(2, "0")} ${period}`;
}

function diffMinutes(start, end) {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes == null || endMinutes == null || endMinutes < startMinutes) {
    return 0;
  }
  return endMinutes - startMinutes;
}

const PUNCH_FIELDS = [
  { field: "check_in_1", type: "check_in", typeLabel: "تسجيل حضور", shiftIndex: 0 },
  { field: "check_out_1", type: "check_out", typeLabel: "تسجيل انصراف", shiftIndex: 0 },
  { field: "check_in_2", type: "check_in", typeLabel: "تسجيل حضور", shiftIndex: 1 },
  { field: "check_out_2", type: "check_out", typeLabel: "تسجيل انصراف", shiftIndex: 1 },
];

const PUNCH_SEQUENCE = [
  {
    field: "check_in_1",
    punchType: "In",
    nextPunchType: "check_in",
    nextPunchLabel: "تسجيل حضور",
    shiftIndex: 0,
  },
  {
    field: "check_out_1",
    punchType: "Out",
    nextPunchType: "check_out",
    nextPunchLabel: "تسجيل انصراف",
    shiftIndex: 0,
  },
  {
    field: "check_in_2",
    punchType: "In",
    nextPunchType: "check_in",
    nextPunchLabel: "تسجيل حضور",
    shiftIndex: 1,
  },
  {
    field: "check_out_2",
    punchType: "Out",
    nextPunchType: "check_out",
    nextPunchLabel: "تسجيل انصراف",
    shiftIndex: 1,
  },
];

function isShiftAllowed(shiftIndex, schedule = {}) {
  const assignedShiftIndices = schedule.assignedShiftIndices;
  if (!Array.isArray(assignedShiftIndices) || !assignedShiftIndices.length) {
    return true;
  }
  return assignedShiftIndices.includes(shiftIndex);
}

function labelForStep(step, schedule = {}) {
  const period = getPeriodForShiftIndex(step.shiftIndex, schedule.assignedPeriods ?? []);
  return buildPunchLabel(step.nextPunchLabel, period);
}

export function resolveNextPunch(record, schedule = {}) {
  if (record?.status === "إجازة") {
    return {
      canPunch: false,
      punchType: null,
      punchField: null,
      nextPunchType: "leave",
      nextPunchLabel: "إجازة",
      shiftIndex: null,
      activePeriod: null,
    };
  }

  if (record?.status === "غياب") {
    const firstStep =
      PUNCH_SEQUENCE.find((step) => isShiftAllowed(step.shiftIndex, schedule)) ??
      PUNCH_SEQUENCE[0];

    return {
      canPunch: true,
      punchType: "In",
      punchField: firstStep.field,
      nextPunchType: firstStep.nextPunchType,
      nextPunchLabel: labelForStep(firstStep, schedule),
      shiftIndex: firstStep.shiftIndex,
      activePeriod: getPeriodForShiftIndex(
        firstStep.shiftIndex,
        schedule.assignedPeriods ?? [],
      ),
    };
  }

  for (const step of PUNCH_SEQUENCE) {
    if (!isShiftAllowed(step.shiftIndex, schedule)) continue;
    if (!record?.[step.field]) {
      return {
        canPunch: true,
        punchType: step.punchType,
        punchField: step.field,
        nextPunchType: step.nextPunchType,
        nextPunchLabel: labelForStep(step, schedule),
        shiftIndex: step.shiftIndex,
        activePeriod: getPeriodForShiftIndex(
          step.shiftIndex,
          schedule.assignedPeriods ?? [],
        ),
      };
    }
  }

  return {
    canPunch: false,
    punchType: null,
    punchField: null,
    nextPunchType: "complete",
    nextPunchLabel: "اكتمل التسجيل اليوم",
    shiftIndex: null,
    activePeriod: null,
  };
}

export function buildTodayAttendanceSummary(record, schedule = {}) {
  if (!record) {
    const nextPunch = resolveNextPunch(null, schedule);
    return {
      lastPunch: null,
      workingMinutes: 0,
      delayMinutes: 0,
      hasRecord: false,
      nextPunchType: nextPunch.nextPunchType,
      nextPunchLabel: nextPunch.nextPunchLabel,
      canPunch: nextPunch.canPunch,
      activePeriod: nextPunch.activePeriod,
      assignedPeriods: schedule.assignedPeriods ?? [],
    };
  }

  if (record.status === "إجازة") {
    const nextPunch = resolveNextPunch(record, schedule);
    return {
      lastPunch: { time: "—", type: "leave", typeLabel: "إجازة" },
      workingMinutes: 0,
      delayMinutes: Number(record.delay_minutes) || 0,
      hasRecord: true,
      nextPunchType: nextPunch.nextPunchType,
      nextPunchLabel: nextPunch.nextPunchLabel,
      canPunch: nextPunch.canPunch,
      activePeriod: nextPunch.activePeriod,
      assignedPeriods: schedule.assignedPeriods ?? [],
    };
  }

  if (record.status === "غياب") {
    const nextPunch = resolveNextPunch(record, schedule);
    return {
      lastPunch: { time: "—", type: "absent", typeLabel: "غياب" },
      workingMinutes: 0,
      delayMinutes: Number(record.delay_minutes) || 0,
      hasRecord: true,
      nextPunchType: nextPunch.nextPunchType,
      nextPunchLabel: nextPunch.nextPunchLabel,
      canPunch: nextPunch.canPunch,
      activePeriod: nextPunch.activePeriod,
      assignedPeriods: schedule.assignedPeriods ?? [],
    };
  }

  let lastPunch = null;
  for (const punch of PUNCH_FIELDS) {
    if (!isShiftAllowed(punch.shiftIndex, schedule)) continue;
    const value = record[punch.field];
    if (value) {
      const period = getPeriodForShiftIndex(
        punch.shiftIndex,
        schedule.assignedPeriods ?? [],
      );
      lastPunch = {
        time: formatAttendanceClockTime(value),
        type: punch.type,
        typeLabel: buildPunchLabel(punch.typeLabel, period),
      };
    }
  }

  const workingMinutes =
    (isShiftAllowed(0, schedule)
      ? diffMinutes(record.check_in_1, record.check_out_1)
      : 0) +
    (isShiftAllowed(1, schedule)
      ? diffMinutes(record.check_in_2, record.check_out_2)
      : 0);

  const nextPunch = resolveNextPunch(record, schedule);

  return {
    lastPunch,
    workingMinutes,
    delayMinutes: Number(record.delay_minutes) || 0,
    hasRecord: true,
    nextPunchType: nextPunch.nextPunchType,
    nextPunchLabel: nextPunch.nextPunchLabel,
    canPunch: nextPunch.canPunch,
    activePeriod: nextPunch.activePeriod,
    assignedPeriods: schedule.assignedPeriods ?? [],
    nextPunchField: nextPunch.punchField,
    nextShiftIndex: nextPunch.shiftIndex,
  };
}

export { getShiftIndexForPunchField };
