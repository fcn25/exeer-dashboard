/** Strict action types per product requirements */
export const ADMINISTRATIVE_ACTION_TYPES = [
  "Alert",
  "First Warning",
  "Second Warning",
  "Third Warning",
  "salary deduction",
  "suspension",
];

export const ADMINISTRATIVE_ACTION_TYPE_LABELS = {
  Alert: "تنبيه",
  "First Warning": "إنذار أول",
  "Second Warning": "إنذار ثاني",
  "Third Warning": "إنذار ثالث",
  "salary deduction": "خصم من الراتب",
  suspension: "إيقاف",
};

export const SALARY_DEDUCTION_ACTION_TYPE = "salary deduction";

/** Rolling window for active warning count */
export const ADMINISTRATIVE_ACTION_WINDOW_DAYS = 180;

export const ADMINISTRATIVE_MASTER_LOG_ROLES = new Set([
  "owner",
  "Executive",
  "HR_Manager",
  "HR_Assistant",
]);
