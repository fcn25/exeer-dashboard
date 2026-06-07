const PROBATION_PERIOD_DAYS = 80;

const SAUDI_NATIONALITIES = new Set([
  "سعودي",
  "سعودية",
  "saudi",
  "sa",
  "ksa",
]);

export function toIsoDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseIsoDateOnly(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function addCalendarDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getMonthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, lastDay };
}

/** Calendar grid starting Saturday (Saudi week). */
export function buildMonthGrid(year, month) {
  const { lastDay } = getMonthRange(year, month);
  const first = new Date(year, month - 1, 1);
  const startPad = (first.getDay() - 6 + 7) % 7;
  const cells = [];

  for (let i = 0; i < startPad; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(toIsoDateOnly(new Date(year, month - 1, day)));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function isDateInRange(isoDate, start, end) {
  if (!isoDate) return false;
  return isoDate >= start && isoDate <= end;
}

export function isSaudiNationality(nationality) {
  const normalized = String(nationality ?? "")
    .trim()
    .toLowerCase();
  return SAUDI_NATIONALITIES.has(normalized);
}

export function getContractAnniversaryInMonth(hireDate, year, month) {
  const hire = parseIsoDateOnly(hireDate);
  if (!hire) return null;
  const { start, end, lastDay } = getMonthRange(year, month);
  const day = Math.min(hire.getDate(), lastDay);
  const anniversary = toIsoDateOnly(new Date(year, month - 1, day));
  return isDateInRange(anniversary, start, end) ? anniversary : null;
}

export function getProbationEndDate(hireDate) {
  const hire = parseIsoDateOnly(hireDate);
  if (!hire) return null;
  return toIsoDateOnly(addCalendarDays(hire, PROBATION_PERIOD_DAYS));
}

export function eventDateFromTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toIsoDateOnly(parsed);
}

export function todayIsoDate() {
  return toIsoDateOnly(new Date());
}
