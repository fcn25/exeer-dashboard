import { useTranslation } from "react-i18next";
import {
  SettingField,
  SettingNumberInput,
  SettingSelect,
  SettingTimeInput,
  SettingToggle,
} from "./SettingControls.jsx";

export default function SystemCustomizationPanels({
  activeTab,
  draft,
  updateDraft,
  fullWidth = false,
}) {
  const { t } = useTranslation();

  if (activeTab === "hr") {
    return (
      <div className="space-y-5">
        <header className="mb-6 space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">
            {t("systemCustomization.tabs.hr")}
          </h2>
        </header>

        <SettingField label={t("systemCustomization.fields.annualLeave")}>
          <SettingNumberInput
            fullWidth={fullWidth}
            value={draft.annual_leave_days}
            min={15}
            max={30}
            onChange={(v) => updateDraft("annual_leave_days", v)}
          />
        </SettingField>

        <SettingField
          label={t("systemCustomization.fields.sickLeave")}
          hint={t("systemCustomization.hints.sickLeave")}
        >
          <SettingNumberInput
            fullWidth={fullWidth}
            value={draft.sick_leave_days}
            min={30}
            max={120}
            onChange={(v) => updateDraft("sick_leave_days", v)}
          />
        </SettingField>

        <SettingField label={t("systemCustomization.fields.workWeekDays")}>
          <SettingSelect
            fullWidth={fullWidth}
            value={draft.work_week_days}
            onChange={(v) => updateDraft("work_week_days", v)}
            options={[
              { value: 5, label: "5" },
              { value: 5.5, label: "5.5" },
              { value: 6, label: "6" },
            ]}
          />
        </SettingField>

        <SettingField label={t("systemCustomization.fields.workDayHours")}>
          <SettingNumberInput
            fullWidth={fullWidth}
            value={draft.work_day_hours}
            min={6}
            max={10}
            onChange={(v) => updateDraft("work_day_hours", v)}
          />
        </SettingField>

        <SettingField label={t("systemCustomization.fields.weekStart")}>
          <SettingSelect
            fullWidth={fullWidth}
            value={
              ["saturday", "sunday"].includes(draft.week_start_day)
                ? draft.week_start_day
                : "sunday"
            }
            onChange={(v) => updateDraft("week_start_day", v)}
            options={[
              { value: "saturday", label: t("systemCustomization.options.saturday") },
              { value: "sunday", label: t("systemCustomization.options.sunday") },
            ]}
          />
        </SettingField>

        <SettingField label={t("systemCustomization.fields.calendarType")}>
          <SettingSelect
            fullWidth={fullWidth}
            value={draft.calendar_type}
            onChange={(v) => updateDraft("calendar_type", v)}
            options={[
              { value: "hijri", label: t("systemCustomization.options.hijri") },
              {
                value: "gregorian",
                label: t("systemCustomization.options.gregorian"),
              },
            ]}
          />
        </SettingField>
      </div>
    );
  }

  if (activeTab === "payroll") {
    return (
      <div className="space-y-5">
        <header className="mb-6 space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">
            {t("systemCustomization.tabs.payroll")}
          </h2>
          <p className="text-sm text-exeer-muted">
            {t("systemCustomization.sections.payrollHint")}
          </p>
        </header>

        <SettingField
          label={t("systemCustomization.fields.salaryPayDay")}
          hint={t("systemCustomization.hints.salaryPayDay")}
        >
          <SettingNumberInput
            fullWidth={fullWidth}
            value={draft.salary_pay_day}
            min={1}
            max={30}
            onChange={(v) => updateDraft("salary_pay_day", v)}
          />
        </SettingField>

        <SettingField label={t("systemCustomization.fields.gosiRate")}>
          <SettingSelect
            fullWidth={fullWidth}
            value={draft.gosi_employer_rate}
            onChange={(v) => updateDraft("gosi_employer_rate", v)}
            options={[
              { value: 9, label: "9%" },
              { value: 11.75, label: "11.75%" },
            ]}
          />
        </SettingField>

        <div className="md-surface-muted space-y-5 rounded-md p-4">
          <p className="text-sm font-bold text-exeer-primary">
            {t("systemCustomization.sections.loansTitle")}
          </p>

          <SettingField label={t("systemCustomization.fields.loansEnabled")}>
            <SettingToggle
              checked={Boolean(draft.loans_enabled)}
              onChange={(v) => updateDraft("loans_enabled", v)}
              labelOn={t("common.enabled")}
              labelOff={t("common.disabled")}
            />
          </SettingField>

          {draft.loans_enabled ? (
            <SettingField label={t("systemCustomization.fields.loanMaxPercent")}>
              <SettingNumberInput
                fullWidth={fullWidth}
                value={draft.loan_max_percentage}
                min={10}
                max={100}
                onChange={(v) => updateDraft("loan_max_percentage", v)}
              />
            </SettingField>
          ) : null}
        </div>

        <SettingField label={t("systemCustomization.fields.transportAllowance")}>
          <SettingToggle
            checked={Boolean(draft.transport_allowance_enabled)}
            onChange={(v) => updateDraft("transport_allowance_enabled", v)}
            labelOn={t("common.enabled")}
            labelOff={t("common.disabled")}
          />
        </SettingField>

        <SettingField label={t("systemCustomization.fields.housingAllowance")}>
          <SettingToggle
            checked={Boolean(draft.housing_allowance_enabled)}
            onChange={(v) => updateDraft("housing_allowance_enabled", v)}
            labelOn={t("common.enabled")}
            labelOff={t("common.disabled")}
          />
        </SettingField>
      </div>
    );
  }

  if (activeTab === "attendance") {
    return (
      <div className="space-y-5">
        <header className="mb-6 space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">
            {t("systemCustomization.tabs.attendance")}
          </h2>
        </header>

        <SettingField label={t("systemCustomization.fields.attendanceMode")}>
          <SettingSelect
            fullWidth={fullWidth}
            value={draft.attendance_mode}
            onChange={(v) => updateDraft("attendance_mode", v)}
            options={[
              { value: "gps", label: t("systemCustomization.options.gps") },
              {
                value: "face_selfie",
                label: t("systemCustomization.options.faceSelfie"),
              },
              {
                value: "biometric",
                label: t("systemCustomization.options.biometric"),
              },
              {
                value: "manual",
                label: t("systemCustomization.options.manual"),
              },
            ]}
          />
        </SettingField>

        <SettingField label={t("systemCustomization.fields.workStartTime")}>
          <SettingTimeInput
            fullWidth={fullWidth}
            value={draft.work_start_time}
            onChange={(v) => updateDraft("work_start_time", v)}
          />
        </SettingField>

        <SettingField label={t("systemCustomization.fields.workEndTime")}>
          <SettingTimeInput
            fullWidth={fullWidth}
            value={draft.work_end_time}
            onChange={(v) => updateDraft("work_end_time", v)}
          />
        </SettingField>

        <SettingField label={t("systemCustomization.fields.lateTolerance")}>
          <SettingNumberInput
            fullWidth={fullWidth}
            value={draft.late_tolerance_minutes}
            min={0}
            max={30}
            onChange={(v) => updateDraft("late_tolerance_minutes", v)}
          />
        </SettingField>

        <SettingField label={t("systemCustomization.fields.overtimeRate")}>
          <SettingSelect
            fullWidth={fullWidth}
            value={draft.overtime_rate}
            onChange={(v) => updateDraft("overtime_rate", v)}
            options={[
              { value: 1.5, label: "1.5x" },
              { value: 2, label: "2x" },
            ]}
          />
        </SettingField>
      </div>
    );
  }

  if (activeTab === "performance") {
    return (
      <div className="space-y-5">
        <header className="mb-6 space-y-1">
          <h2 className="text-lg font-bold text-exeer-primary">
            {t("systemCustomization.tabs.performance")}
          </h2>
        </header>

        <SettingField label={t("systemCustomization.fields.performanceEnabled")}>
          <SettingToggle
            checked={Boolean(draft.performance_review_enabled)}
            onChange={(v) => updateDraft("performance_review_enabled", v)}
            labelOn={t("common.enabled")}
            labelOff={t("common.disabled")}
          />
        </SettingField>

        {draft.performance_review_enabled ? (
          <SettingField label={t("systemCustomization.fields.reviewCycle")}>
            <SettingSelect
              fullWidth={fullWidth}
              value={draft.performance_review_cycle}
              onChange={(v) => updateDraft("performance_review_cycle", v)}
              options={[
                {
                  value: "monthly",
                  label: t("systemCustomization.options.monthly"),
                },
                {
                  value: "quarterly",
                  label: t("systemCustomization.options.quarterly"),
                },
                {
                  value: "yearly",
                  label: t("systemCustomization.options.yearly"),
                },
              ]}
            />
          </SettingField>
        ) : null}
      </div>
    );
  }

  return null;
}
