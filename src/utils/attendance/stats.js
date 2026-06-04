const EMPTY_LABEL = "لا توجد بيانات";

export function safeAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function computeAttendanceSummary(rows) {
  const list = Array.isArray(rows) ? rows : [];

  const recordCount = list.length;
  const totalDelay =
    list.reduce((sum, row) => sum + safeAmount(row?.delayMinutes), 0) || 0;
  const absenceCount = list.filter((row) => row?.status === "غياب").length;

  return {
    recordCount: safeAmount(recordCount),
    totalDelay: safeAmount(totalDelay),
    absenceCount: safeAmount(absenceCount),
    isEmpty: recordCount === 0,
  };
}

export function formatSummaryStat(value, { isLoading, isEmpty }) {
  if (isLoading) return "—";
  if (isEmpty) return EMPTY_LABEL;
  const num = safeAmount(value);
  return Number.isFinite(num) ? String(num) : EMPTY_LABEL;
}

export function formatGridCell(value, fallback = "—") {
  if (value == null) return fallback;
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : fallback;
  }
  const text = String(value).trim();
  return text || fallback;
}
