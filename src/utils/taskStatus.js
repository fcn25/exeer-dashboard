/** Shared task status normalization (used by Tasks page and employee portal). */

export const TASK_COLUMN_STATUSES = [
  "قيد الانتظار",
  "قيد التنفيذ",
  "للمراجعة",
  "مكتملة",
];

const STATUS_ALIASES = {
  "to do": "قيد الانتظار",
  todo: "قيد الانتظار",
  pending: "قيد الانتظار",
  "in progress": "قيد التنفيذ",
  in_progress: "قيد التنفيذ",
  progress: "قيد التنفيذ",
  review: "للمراجعة",
  done: "مكتملة",
  completed: "مكتملة",
  complete: "مكتملة",
};

export function normalizeTaskStatus(status) {
  const raw = String(status ?? "").trim();
  const defaultStatus = TASK_COLUMN_STATUSES[0];
  if (!raw) return defaultStatus;
  if (TASK_COLUMN_STATUSES.includes(raw)) return raw;

  const key = raw.toLowerCase().replace(/\s+/g, " ");
  if (STATUS_ALIASES[key]) return STATUS_ALIASES[key];
  const underscored = key.replace(/ /g, "_");
  if (STATUS_ALIASES[underscored]) return STATUS_ALIASES[underscored];

  return defaultStatus;
}
