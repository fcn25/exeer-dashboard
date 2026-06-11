import { useMemo } from "react";
import { Check } from "lucide-react";
import { useAppLocale } from "../../i18n/useAppLocale.js";
import { formatLocaleNumber } from "../../i18n/formatLocale.js";
import { HOME_BTN, TYPE_ITEM, TYPE_META, TYPE_SECTION } from "./homeStyles.js";

function DaysBadge({ daysLeft, severity, todayLabel, isEn }) {
  const isCritical = severity === "critical";
  const dayLabel =
    daysLeft === 0
      ? todayLabel
      : isEn
        ? `${formatLocaleNumber(daysLeft)}d`
        : `${formatLocaleNumber(daysLeft)} يوم`;

  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
      style={{
        backgroundColor: isCritical ? "#FEE2E2" : "#F1F5F9",
        color: isCritical ? "#B91C1C" : "#475569",
      }}
    >
      {dayLabel}
    </span>
  );
}

function getAlertTypeLabel(type, t) {
  switch (type) {
    case "iqama":
      return t("pages.home.alertTypeIqama");
    case "workPermit":
      return t("pages.home.alertTypeWorkPermit");
    case "contract":
      return t("pages.home.alertTypeContract");
    case "probation":
      return t("pages.home.alertTypeProbation");
    default:
      return type;
  }
}

function AlertItemCard({
  item,
  todayLabel,
  isEn,
  t,
  onViewEmployee,
  onProbationDecision,
}) {
  const isCritical = item.severity === "critical";

  return (
    <li className="home-card-interactive rounded-[10px] border border-[#F0F0F0] bg-white px-4 py-3.5 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-start">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`${TYPE_ITEM} truncate`}>{item.fullName}</p>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: isCritical ? "#FEE2E2" : "#F1F5F9",
                color: isCritical ? "#B91C1C" : "#475569",
              }}
            >
              {getAlertTypeLabel(item.type, t)}
            </span>
          </div>
          <p className={`${TYPE_META} mt-0.5 truncate`}>{item.jobTitle}</p>
          {item.message ? (
            <p className={`${TYPE_META} mt-1.5 leading-relaxed`}>{item.message}</p>
          ) : null}
        </div>
        <DaysBadge
          daysLeft={item.daysLeft}
          severity={item.severity}
          todayLabel={todayLabel}
          isEn={isEn}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onViewEmployee?.(item.employeeId)}
          className={`${HOME_BTN} flex-1 rounded-full border border-[#F0F0F0] bg-white px-3 py-2 text-[13px] font-medium text-[#111111] hover:bg-[#FAFAFA] dark:border-[var(--border-color)] dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]`}
        >
          {t("pages.home.viewEmployee")}
        </button>
        {item.type === "probation" ? (
          <button
            type="button"
            onClick={() => onProbationDecision?.(item)}
            className={`${HOME_BTN} flex-1 rounded-full border border-[#F0F0F0] bg-[#EEF2FF] px-3 py-2 text-[13px] font-medium text-[#4F46E5] hover:bg-white dark:border-[var(--border-color)]`}
          >
            {t("pages.home.probationDecision")}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function AlertSection({
  title,
  emoji,
  items,
  todayLabel,
  isEn,
  t,
  onViewEmployee,
  onProbationDecision,
}) {
  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <h3 className={TYPE_SECTION}>
        {emoji} {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <AlertItemCard
            key={item.id}
            item={item}
            todayLabel={todayLabel}
            isEn={isEn}
            t={t}
            onViewEmployee={onViewEmployee}
            onProbationDecision={onProbationDecision}
          />
        ))}
      </ul>
    </section>
  );
}

export default function ImportantAlertsList({
  alerts,
  onViewEmployee,
  onProbationDecision,
}) {
  const { t, isEn } = useAppLocale();
  const todayLabel = t("common.today");

  const {
    contracts = [],
    iqamas = [],
    probations = [],
    workPermits = [],
  } = alerts ?? {};

  const { criticalItems, warningItems } = useMemo(() => {
    const allItems = [...contracts, ...iqamas, ...workPermits, ...probations];
    const critical = allItems
      .filter((item) => item.severity === "critical")
      .sort((a, b) => a.daysLeft - b.daysLeft);
    const warning = allItems
      .filter((item) => item.severity !== "critical")
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return { criticalItems: critical, warningItems: warning };
  }, [contracts, iqamas, probations, workPermits]);

  const isEmpty = criticalItems.length === 0 && warningItems.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Check className="h-10 w-10 text-[#10B981]" aria-hidden />
        <p className={TYPE_META}>{t("pages.home.alertsDrawerEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="max-h-[min(70vh,640px)] space-y-6 overflow-y-auto pe-1">
      <AlertSection
        title={t("pages.home.alertsDrawerCritical")}
        emoji="🔴"
        items={criticalItems}
        todayLabel={todayLabel}
        isEn={isEn}
        t={t}
        onViewEmployee={onViewEmployee}
        onProbationDecision={onProbationDecision}
      />
      <AlertSection
        title={t("pages.home.alertsDrawerWarning")}
        emoji="🟠"
        items={warningItems}
        todayLabel={todayLabel}
        isEn={isEn}
        t={t}
        onViewEmployee={onViewEmployee}
        onProbationDecision={onProbationDecision}
      />
    </div>
  );
}
