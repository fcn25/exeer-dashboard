/** Default company_settings rows seeded on first load */
export const DEFAULT_COMPANY_SETTINGS = [
  { key: "annual_leave_days", value: 21 },
  { key: "sick_leave_days", value: 30 },
  { key: "work_week_days", value: 5 },
  { key: "work_day_hours", value: 8 },
  { key: "week_start_day", value: "sunday" },
  { key: "salary_pay_day", value: 27 },
  { key: "gosi_employer_rate", value: 9 },
  { key: "overtime_rate", value: 1.5 },
  { key: "late_tolerance_minutes", value: 15 },
  { key: "loans_enabled", value: true },
  { key: "loan_max_percentage", value: 50 },
  { key: "transport_allowance_enabled", value: false },
  { key: "housing_allowance_enabled", value: true },
  { key: "performance_review_enabled", value: true },
  { key: "performance_review_cycle", value: "quarterly" },
  { key: "attendance_mode", value: "gps" },
  { key: "calendar_type", value: "hijri" },
];

export const COMPANY_SETTING_KEYS = DEFAULT_COMPANY_SETTINGS.map((row) => row.key);
