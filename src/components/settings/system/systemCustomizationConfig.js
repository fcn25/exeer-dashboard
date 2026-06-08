import {
  Banknote,
  Briefcase,
  ClipboardCheck,
  Fingerprint,
} from "lucide-react";

export const SYSTEM_CUSTOMIZATION_TABS = [
  { id: "hr", icon: Briefcase },
  { id: "payroll", icon: Banknote },
  { id: "attendance", icon: Fingerprint },
  { id: "performance", icon: ClipboardCheck },
];

export const SYSTEM_CUSTOMIZATION_TAB_KEYS = {
  hr: [
    "annual_leave_days",
    "sick_leave_days",
    "work_week_days",
    "work_day_hours",
    "week_start_day",
    "calendar_type",
  ],
  payroll: [
    "salary_pay_day",
    "gosi_employer_rate",
    "loans_enabled",
    "loan_max_percentage",
    "transport_allowance_enabled",
    "housing_allowance_enabled",
    "wps_net_gross_warning_ratio",
  ],
  attendance: [
    "attendance_mode",
    "work_periods",
    "work_start_time",
    "work_end_time",
    "late_tolerance_minutes",
    "overtime_rate",
  ],
  performance: ["performance_review_enabled", "performance_review_cycle"],
};
