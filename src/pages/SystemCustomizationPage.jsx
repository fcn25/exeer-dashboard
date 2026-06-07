import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  Briefcase,
  ClipboardCheck,
  Fingerprint,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import SuccessToast from "../components/ui/SuccessToast.jsx";
import ErrorToast from "../components/ui/ErrorToast.jsx";
import {
  SettingField,
  SettingNumberInput,
  SettingSelect,
  SettingToggle,
  TabSaveButton,
} from "../components/settings/system/SettingControls.jsx";
import { DEFAULT_COMPANY_SETTINGS } from "../constants/companySettingsDefaults.js";
import { useCompanySettings } from "../context/CompanySettingsContext.jsx";

const TAB_DEFS = [
  { id: "hr", icon: Briefcase },
  { id: "payroll", icon: Banknote },
  { id: "attendance", icon: Fingerprint },
  { id: "performance", icon: ClipboardCheck },
];

const TAB_KEYS = {
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
  ],
  attendance: ["attendance_mode", "late_tolerance_minutes", "overtime_rate"],
  performance: ["performance_review_enabled", "performance_review_cycle"],
};

function buildDraftFromSettings(getSetting) {
  const draft = {};
  for (const row of DEFAULT_COMPANY_SETTINGS) {
    draft[row.key] = getSetting(row.key, row.value);
  }
  return draft;
}

function pickChanges(draft, baseline, keys) {
  const changes = {};
  for (const key of keys) {
    if (draft[key] !== baseline[key]) {
      changes[key] = draft[key];
    }
  }
  return changes;
}

export default function SystemCustomizationPage() {
  const { t } = useTranslation();
  const { getSetting, saveSettings, isLoading } = useCompanySettings();

  const [activeTab, setActiveTab] = useState("hr");
  const [baseline, setBaseline] = useState(() => buildDraftFromSettings(() => null));
  const [draft, setDraft] = useState(() => buildDraftFromSettings(() => null));
  const [savingTab, setSavingTab] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  const syncFromContext = useCallback(() => {
    const next = buildDraftFromSettings(getSetting);
    setBaseline(next);
    setDraft(next);
  }, [getSetting]);

  useEffect(() => {
    if (!isLoading) syncFromContext();
  }, [isLoading, syncFromContext]);

  const updateDraft = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const tabDirty = useMemo(() => {
    const keys = TAB_KEYS[activeTab] ?? [];
    return keys.some((key) => draft[key] !== baseline[key]);
  }, [activeTab, draft, baseline]);

  const handleSaveTab = async () => {
    const keys = TAB_KEYS[activeTab] ?? [];
    const changes = pickChanges(draft, baseline, keys);
    if (!Object.keys(changes).length) return;

    setSavingTab(activeTab);
    setErrorToast("");

    try {
      await saveSettings(changes);
      setBaseline((prev) => ({ ...prev, ...changes }));
      setSuccessToast(t("systemCustomization.saveSuccess"));
    } catch (err) {
      setErrorToast(err.message || t("systemCustomization.saveError"));
    } finally {
      setSavingTab("");
    }
  };

  if (isLoading && !tabDirty) {
    return (
      <div className="md-page">
        <p className="text-sm text-exeer-muted">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="md-page">
      <header className="space-y-3">
        <Link
          to="/dashboard/settings"
          className="inline-flex items-center gap-1 text-sm text-[#b89a5e] hover:underline"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
          {t("systemCustomization.backToSettings")}
        </Link>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#0D1B2A] text-[#b89a5e]">
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#0D1B2A]">
              {t("systemCustomization.title")}
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              {t("systemCustomization.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-8 flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
        <nav
          className="flex shrink-0 flex-row gap-1 overflow-x-auto rounded-md border border-[#e8e2d6] bg-[#faf8f4] p-2 lg:w-56 lg:flex-col lg:overflow-visible"
          aria-label={t("systemCustomization.title")}
        >
          {TAB_DEFS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[#0D1B2A] text-[#b89a5e]"
                    : "text-[#475569] hover:bg-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {t(`systemCustomization.tabs.${tab.id}`)}
              </button>
            );
          })}
        </nav>

        <section className="min-w-0 flex-1 rounded-md border border-[#e8e2d6] bg-white p-6 shadow-sm md:p-8">
          {activeTab === "hr" ? (
            <div className="space-y-5">
              <header className="mb-6 space-y-1">
                <h2 className="text-lg font-bold text-[#0D1B2A]">
                  {t("systemCustomization.tabs.hr")}
                </h2>
              </header>

              <SettingField label={t("systemCustomization.fields.annualLeave")}>
                <SettingNumberInput
                  value={draft.annual_leave_days}
                  min={15}
                  max={30}
                  onChange={(v) => updateDraft("annual_leave_days", v)}
                />
              </SettingField>

              <SettingField label={t("systemCustomization.fields.sickLeave")}>
                <SettingNumberInput
                  value={draft.sick_leave_days}
                  min={14}
                  max={30}
                  onChange={(v) => updateDraft("sick_leave_days", v)}
                />
              </SettingField>

              <SettingField label={t("systemCustomization.fields.workWeekDays")}>
                <SettingSelect
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
                  value={draft.work_day_hours}
                  min={6}
                  max={10}
                  onChange={(v) => updateDraft("work_day_hours", v)}
                />
              </SettingField>

              <SettingField label={t("systemCustomization.fields.weekStart")}>
                <SettingSelect
                  value={draft.week_start_day}
                  onChange={(v) => updateDraft("week_start_day", v)}
                  options={[
                    { value: "sunday", label: t("systemCustomization.options.sunday") },
                    { value: "monday", label: t("systemCustomization.options.monday") },
                  ]}
                />
              </SettingField>

              <SettingField label={t("systemCustomization.fields.calendarType")}>
                <SettingToggle
                  checked={draft.calendar_type === "hijri"}
                  onChange={(hijri) =>
                    updateDraft("calendar_type", hijri ? "hijri" : "gregorian")
                  }
                  labelOn={t("systemCustomization.options.hijri")}
                  labelOff={t("systemCustomization.options.gregorian")}
                />
              </SettingField>
            </div>
          ) : null}

          {activeTab === "payroll" ? (
            <div className="space-y-5">
              <header className="mb-6 space-y-1">
                <h2 className="text-lg font-bold text-[#0D1B2A]">
                  {t("systemCustomization.tabs.payroll")}
                </h2>
              </header>

              <SettingField
                label={t("systemCustomization.fields.salaryPayDay")}
                hint={t("systemCustomization.hints.salaryPayDay")}
              >
                <SettingNumberInput
                  value={draft.salary_pay_day}
                  min={1}
                  max={30}
                  onChange={(v) => updateDraft("salary_pay_day", v)}
                />
              </SettingField>

              <SettingField label={t("systemCustomization.fields.gosiRate")}>
                <SettingSelect
                  value={draft.gosi_employer_rate}
                  onChange={(v) => updateDraft("gosi_employer_rate", v)}
                  options={[
                    { value: 9, label: "9%" },
                    { value: 11.75, label: "11.75%" },
                  ]}
                />
              </SettingField>

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
                    value={draft.loan_max_percentage}
                    min={10}
                    max={100}
                    onChange={(v) => updateDraft("loan_max_percentage", v)}
                  />
                </SettingField>
              ) : null}

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
          ) : null}

          {activeTab === "attendance" ? (
            <div className="space-y-5">
              <header className="mb-6 space-y-1">
                <h2 className="text-lg font-bold text-[#0D1B2A]">
                  {t("systemCustomization.tabs.attendance")}
                </h2>
              </header>

              <SettingField label={t("systemCustomization.fields.attendanceMode")}>
                <SettingSelect
                  value={draft.attendance_mode}
                  onChange={(v) => updateDraft("attendance_mode", v)}
                  options={[
                    { value: "gps", label: t("systemCustomization.options.gps") },
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

              <SettingField label={t("systemCustomization.fields.lateTolerance")}>
                <SettingNumberInput
                  value={draft.late_tolerance_minutes}
                  min={0}
                  max={30}
                  onChange={(v) => updateDraft("late_tolerance_minutes", v)}
                />
              </SettingField>

              <SettingField label={t("systemCustomization.fields.overtimeRate")}>
                <SettingSelect
                  value={draft.overtime_rate}
                  onChange={(v) => updateDraft("overtime_rate", v)}
                  options={[
                    { value: 1.5, label: "1.5x" },
                    { value: 2, label: "2x" },
                  ]}
                />
              </SettingField>
            </div>
          ) : null}

          {activeTab === "performance" ? (
            <div className="space-y-5">
              <header className="mb-6 space-y-1">
                <h2 className="text-lg font-bold text-[#0D1B2A]">
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
          ) : null}

          <div className="mt-8 flex justify-end border-t border-[#e8e2d6] pt-6">
            <TabSaveButton
              onClick={handleSaveTab}
              isSaving={savingTab === activeTab}
              disabled={!tabDirty}
            />
          </div>
        </section>
      </div>

      <SuccessToast
        message={successToast}
        onDismiss={() => setSuccessToast("")}
      />
      <ErrorToast message={errorToast} onDismiss={() => setErrorToast("")} />
    </div>
  );
}
