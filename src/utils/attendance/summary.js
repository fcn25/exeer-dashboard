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
  { field: "check_in_1", type: "check_in", typeLabel: "تسجيل حضور" },
  { field: "check_out_1", type: "check_out", typeLabel: "تسجيل انصراف" },
  { field: "check_in_2", type: "check_in", typeLabel: "تسجيل حضور" },
  { field: "check_out_2", type: "check_out", typeLabel: "تسجيل انصراف" },
];

const PUNCH_SEQUENCE = [
  {
    field: "check_in_1",
    punchType: "In",
    nextPunchType: "check_in",
    nextPunchLabel: "تسجيل حضور",
  },
  {
    field: "check_out_1",
    punchType: "Out",
    nextPunchType: "check_out",
    nextPunchLabel: "تسجيل انصراف",
  },
  {
    field: "check_in_2",
    punchType: "In",
    nextPunchType: "check_in",
    nextPunchLabel: "تسجيل حضور",
  },
  {
    field: "check_out_2",
    punchType: "Out",
    nextPunchType: "check_out",
    nextPunchLabel: "تسجيل انصراف",
  },
];

export function resolveNextPunch(record) {
  if (record?.status === "إجازة") {
    return {
      canPunch: false,
      punchType: null,
      punchField: null,
      nextPunchType: "leave",
      nextPunchLabel: "إجازة",
    };
  }

  if (record?.status === "غياب") {
    return {
      canPunch: true,
      punchType: "In",
      punchField: "check_in_1",
      nextPunchType: "check_in",
      nextPunchLabel: "تسجيل حضور",
    };
  }

  for (const step of PUNCH_SEQUENCE) {
    if (!record?.[step.field]) {
      return {
        canPunch: true,
        punchType: step.punchType,
        punchField: step.field,
        nextPunchType: step.nextPunchType,
        nextPunchLabel: step.nextPunchLabel,
      };
    }
  }

  return {
    canPunch: false,
    punchType: null,
    punchField: null,
    nextPunchType: "complete",
    nextPunchLabel: "اكتمل التسجيل اليوم",
  };
}

export function buildTodayAttendanceSummary(record) {
  if (!record) {
    const nextPunch = resolveNextPunch(null);
    return {
      lastPunch: null,
      workingMinutes: 0,
      delayMinutes: 0,
      hasRecord: false,
      nextPunchType: nextPunch.nextPunchType,
      nextPunchLabel: nextPunch.nextPunchLabel,
      canPunch: nextPunch.canPunch,
    };
  }

  if (record.status === "إجازة") {
    const nextPunch = resolveNextPunch(record);
    return {
      lastPunch: { time: "—", type: "leave", typeLabel: "إجازة" },
      workingMinutes: 0,
      delayMinutes: Number(record.delay_minutes) || 0,
      hasRecord: true,
      nextPunchType: nextPunch.nextPunchType,
      nextPunchLabel: nextPunch.nextPunchLabel,
      canPunch: nextPunch.canPunch,
    };
  }

  if (record.status === "غياب") {
    const nextPunch = resolveNextPunch(record);
    return {
      lastPunch: { time: "—", type: "absent", typeLabel: "غياب" },
      workingMinutes: 0,
      delayMinutes: Number(record.delay_minutes) || 0,
      hasRecord: true,
      nextPunchType: nextPunch.nextPunchType,
      nextPunchLabel: nextPunch.nextPunchLabel,
      canPunch: nextPunch.canPunch,
    };
  }

  let lastPunch = null;
  for (const punch of PUNCH_FIELDS) {
    const value = record[punch.field];
    if (value) {
      lastPunch = {
        time: formatAttendanceClockTime(value),
        type: punch.type,
        typeLabel: punch.typeLabel,
      };
    }
  }

  const workingMinutes =
    diffMinutes(record.check_in_1, record.check_out_1) +
    diffMinutes(record.check_in_2, record.check_out_2);

  const nextPunch = resolveNextPunch(record);

  return {
    lastPunch,
    workingMinutes,
    delayMinutes: Number(record.delay_minutes) || 0,
    hasRecord: true,
    nextPunchType: nextPunch.nextPunchType,
    nextPunchLabel: nextPunch.nextPunchLabel,
    canPunch: nextPunch.canPunch,
  };
}
