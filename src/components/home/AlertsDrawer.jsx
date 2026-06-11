import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useAppLocale } from "../../i18n/useAppLocale.js";
import { formatLocaleNumber } from "../../i18n/formatLocale.js";
import { HOME_BTN } from "./homeStyles.js";

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
    <li className="rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2.5 dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-start">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13px] font-medium text-[#0F172A] dark:text-[var(--text-primary)]">
              {item.fullName}
            </p>
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
          <p className="mt-0.5 truncate text-[12px] text-[#64748B] dark:text-[var(--text-secondary)]">
            {item.jobTitle}
          </p>
          {item.message ? (
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#475569] dark:text-[var(--text-secondary)]">
              {item.message}
            </p>
          ) : null}
        </div>
        <DaysBadge
          daysLeft={item.daysLeft}
          severity={item.severity}
          todayLabel={todayLabel}
          isEn={isEn}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onViewEmployee?.(item.employeeId)}
          className={`${HOME_BTN} flex-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[12px] font-medium text-[#0F172A] hover:bg-white dark:border-[var(--border-color)] dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]`}
        >
          {t("pages.home.viewEmployee")}
        </button>
        {item.type === "probation" ? (
          <button
            type="button"
            onClick={() => onProbationDecision?.(item)}
            className={`${HOME_BTN} flex-1 rounded-full border border-[#E2E8F0] bg-[#EEF2FF] px-3 py-1.5 text-[12px] font-medium text-[#4F46E5] hover:bg-white dark:border-[var(--border-color)]`}
          >
            {t("pages.home.probationDecision")}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function AlertSection({ title, emoji, items, todayLabel, isEn, t, onViewEmployee, onProbationDecision }) {
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-[14px] font-semibold text-[#0F172A] dark:text-[var(--text-primary)]">
        {emoji} {title}
      </h3>
      <ul className="space-y-2">
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

export default function AlertsDrawer({
  isOpen,
  onClose,
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
    totalCount = 0,
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

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      setIsVisible(false);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isEmpty = criticalItems.length === 0 && warningItems.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("common.close")}
        onClick={onClose}
      />

      <aside
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alerts-drawer-title"
        className={`fixed left-0 top-0 flex h-full w-full max-w-md flex-col border-e border-[#E2E8F0] bg-[var(--bg-main)] shadow-xl transition-transform duration-300 ease-out dark:border-[var(--border-color)] ${
          isVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#F1F5F9] px-5 py-4 dark:border-[var(--border-color)]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2
              id="alerts-drawer-title"
              className="text-[18px] font-medium text-[#0F172A] dark:text-[var(--text-primary)]"
            >
              {t("pages.home.alertsDrawerTitle")}
            </h2>
            {totalCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[12px] font-semibold text-[#B91C1C]">
                {formatLocaleNumber(totalCount)}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#E2E8F0] text-[#64748B] transition-colors hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:text-[var(--text-secondary)]"
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Check className="h-10 w-10 text-[#10B981]" aria-hidden />
              <p className="text-[14px] text-[#64748B] dark:text-[var(--text-secondary)]">
                {t("pages.home.alertsDrawerEmpty")}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
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
          )}
        </div>
      </aside>
    </div>
  );
}
