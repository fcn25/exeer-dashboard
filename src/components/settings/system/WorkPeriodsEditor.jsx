import { useTranslation } from "react-i18next";
import {
  DEFAULT_WORK_PERIODS_CONFIG,
  normalizeWorkPeriodsConfig,
} from "../../../utils/attendance/workSchedules.js";
import {
  SettingField,
  SettingTimeInput,
  SettingToggle,
} from "./SettingControls.jsx";

function PeriodCard({ period, index, disabled, onChange, fullWidth, t }) {
  return (
    <div className="space-y-3 rounded-md border border-exeer-border bg-md-surface-dim p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="text-sm font-semibold text-exeer-primary">
        {t("systemCustomization.workPeriods.periodLabel", { index: index + 1 })}
      </p>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-exeer-muted">
          {t("systemCustomization.workPeriods.name")}
        </span>
        <input
          type="text"
          value={period.name}
          disabled={disabled}
          onChange={(event) => onChange({ name: event.target.value })}
          className={`md-input disabled:opacity-60 ${fullWidth ? "w-full" : "w-full max-w-md"}`}
          placeholder={t("systemCustomization.workPeriods.namePlaceholder")}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-exeer-muted">
            {t("systemCustomization.fields.workStartTime")}
          </span>
          <SettingTimeInput
            fullWidth
            value={period.start}
            disabled={disabled}
            onChange={(value) => onChange({ start: value })}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-exeer-muted">
            {t("systemCustomization.fields.workEndTime")}
          </span>
          <SettingTimeInput
            fullWidth
            value={period.end}
            disabled={disabled}
            onChange={(value) => onChange({ end: value })}
          />
        </label>
      </div>
    </div>
  );
}

export default function WorkPeriodsEditor({
  value,
  onChange,
  fullWidth = false,
}) {
  const { t } = useTranslation();
  const config = normalizeWorkPeriodsConfig(value);

  const updateConfig = (patch) => {
    onChange(normalizeWorkPeriodsConfig({ ...config, ...patch }));
  };

  const updatePeriod = (index, patch) => {
    const periods = config.periods.map((period, idx) =>
      idx === index ? { ...period, ...patch } : period,
    );
    updateConfig({ periods });
  };

  return (
    <div className="space-y-4">
      <SettingField
        label={t("systemCustomization.workPeriods.dualShift")}
        hint={t("systemCustomization.workPeriods.dualShiftHint")}
      >
        <SettingToggle
          checked={config.dual_shift_enabled}
          onChange={(enabled) =>
            updateConfig({
              dual_shift_enabled: enabled,
              periods: enabled
                ? config.periods
                : [config.periods[0] ?? DEFAULT_WORK_PERIODS_CONFIG.periods[0]],
            })
          }
          labelOn={t("common.enabled")}
          labelOff={t("common.disabled")}
        />
      </SettingField>

      <PeriodCard
        period={config.periods[0]}
        index={0}
        fullWidth={fullWidth}
        onChange={(patch) => updatePeriod(0, patch)}
        t={t}
      />

      {config.dual_shift_enabled ? (
        <PeriodCard
          period={config.periods[1]}
          index={1}
          fullWidth={fullWidth}
          onChange={(patch) => updatePeriod(1, patch)}
          t={t}
        />
      ) : null}
    </div>
  );
}
