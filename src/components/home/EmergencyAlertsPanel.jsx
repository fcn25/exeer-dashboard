import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  FileWarning,
  ShieldAlert,
} from "lucide-react";
import { HOME_BTN, HOME_CARD, HOME_LIST_DIVIDE, HOME_SHELL, TYPE_ITEM, TYPE_META, TYPE_SECTION } from "./homeStyles.js";
import { useAppLocale } from "../../i18n/useAppLocale.js";
import { formatLocaleDate, formatLocaleNumber } from "../../i18n/formatLocale.js";
import ImportantAlertsList from "./ImportantAlertsList.jsx";

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

function AlertList({ items, emptyLabel, onItemAction, actionLabel }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Check className="h-8 w-8 text-[#10B981]" aria-hidden />
        <p className={`${TYPE_META} py-6 text-center`}>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className={`${HOME_LIST_DIVIDE} max-h-[280px] overflow-y-auto`}>
      {items.map((item) => (
        <li key={item.id} className="py-3.5 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-start">
              <p className={`${TYPE_ITEM} truncate`}>{item.fullName}</p>
              <p className={`${TYPE_META} truncate`}>{item.jobTitle}</p>
              {item.message ? (
                <p className={`${TYPE_META} mt-1.5 leading-relaxed`}>{item.message}</p>
              ) : null}
              <p className={`${TYPE_META} mt-1 opacity-80`}>
                {formatLocaleDate(item.endDate, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <DaysBadge
              daysLeft={item.daysLeft}
              severity={item.severity}
              todayLabel={item.todayLabel}
              isEn={item.isEn}
            />
          </div>
          {onItemAction ? (
            <button
              type="button"
              onClick={() => onItemAction(item)}
              className={`${HOME_BTN} mt-3 w-full rounded-full border border-[#F0F0F0] bg-white px-3 py-2 text-[13px] font-medium text-[#111111] hover:bg-[#FAFAFA] dark:border-[var(--border-color)] dark:bg-[var(--bg-main)] dark:text-[var(--text-primary)]`}
            >
              {actionLabel}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AlertColumn({ title, description, icon: Icon, iconTone, count, children }) {
  return (
    <article className={`${HOME_CARD} flex flex-col`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: iconTone.bg, color: iconTone.color }}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 text-start">
            <h3 className={TYPE_SECTION}>{title}</h3>
            {description ? (
              <p className={`${TYPE_META} mt-1 leading-relaxed`}>{description}</p>
            ) : null}
          </div>
        </div>
        {count > 0 ? (
          <span
            className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
            style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
          >
            {formatLocaleNumber(count)}
          </span>
        ) : null}
      </div>
      {children}
    </article>
  );
}

function EmergencyAlertsGrid({
  contracts,
  iqamas,
  workPermits,
  probations,
  mapItems,
  t,
  onViewEmployee,
  onProbationDecision,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <AlertColumn
        title={t("pages.home.contractExpiry")}
        description={t("pages.home.contractExpiryHint")}
        icon={FileWarning}
        iconTone={{ bg: "#FEE2E2", color: "#DC2626" }}
        count={contracts.length}
      >
        <AlertList
          items={mapItems(contracts)}
          emptyLabel={t("pages.home.contractEmpty")}
          onItemAction={(item) => onViewEmployee?.(item.employeeId)}
          actionLabel={t("pages.home.viewEmployee")}
        />
      </AlertColumn>

      <AlertColumn
        title={t("pages.home.iqamaExpiry")}
        description={t("pages.home.iqamaExpiryHint")}
        icon={AlertTriangle}
        iconTone={{ bg: "#F1F5F9", color: "#64748B" }}
        count={iqamas.length}
      >
        <AlertList
          items={mapItems(iqamas)}
          emptyLabel={t("pages.home.iqamaEmpty")}
          onItemAction={(item) => onViewEmployee?.(item.employeeId)}
          actionLabel={t("pages.home.viewEmployee")}
        />
      </AlertColumn>

      <AlertColumn
        title={t("pages.home.workPermitExpiry")}
        icon={AlertTriangle}
        iconTone={{ bg: "#F1F5F9", color: "#64748B" }}
        count={workPermits.length}
      >
        <AlertList
          items={mapItems(workPermits)}
          emptyLabel={t("pages.home.workPermitEmpty")}
          onItemAction={(item) => onViewEmployee?.(item.employeeId)}
          actionLabel={t("pages.home.viewEmployee")}
        />
      </AlertColumn>

      <AlertColumn
        title={t("pages.home.probationEnding")}
        description={t("pages.home.probationEndingHint")}
        icon={CalendarClock}
        iconTone={{ bg: "#EEF2FF", color: "#4F46E5" }}
        count={probations.length}
      >
        <AlertList
          items={mapItems(probations)}
          emptyLabel={t("pages.home.probationEmpty")}
          onItemAction={(item) => onProbationDecision?.(item)}
          actionLabel={t("pages.home.probationDecision")}
        />
      </AlertColumn>
    </div>
  );
}

export default function EmergencyAlertsPanel({
  alerts,
  isLoading = false,
  onProbationDecision,
  onViewEmployee,
  showImportantTab = false,
}) {
  const { t, isEn } = useAppLocale();
  const [activeTab, setActiveTab] = useState("emergency");
  const {
    contracts = [],
    iqamas = [],
    probations = [],
    workPermits = [],
    totalCount = 0,
  } = alerts ?? {};
  const todayLabel = t("common.today");
  const mapItems = (items) =>
    items.map((item) => ({ ...item, todayLabel, isEn }));

  return (
    <section
      className={`${HOME_SHELL} space-y-6 overflow-hidden`}
      aria-labelledby="emergency-alerts-heading"
    >
      <div className="px-1 pt-1 sm:px-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] dark:bg-[var(--bg-surface-hover)]">
              <ShieldAlert className="h-5 w-5" aria-hidden />
            </span>
            <div className="text-start">
              <h2 id="emergency-alerts-heading" className={`${TYPE_SECTION} text-[1.125rem] font-semibold`}>
                {t("pages.home.emergencyTitle")}
              </h2>
              <p className={`${TYPE_META} mt-0.5`}>{t("pages.home.emergencySubtitle")}</p>
            </div>
          </div>
          {!isLoading && totalCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEE2E2] px-3 py-1.5 text-[13px] font-medium text-[#B91C1C]">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {t("pages.home.emergencyCount", { count: formatLocaleNumber(totalCount) })}
            </span>
          ) : null}
        </div>

        {showImportantTab ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("emergency")}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                activeTab === "emergency"
                  ? "bg-[#0F172A] text-white dark:bg-[var(--accent-on-dark-bg)]"
                  : "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
              }`}
            >
              {t("pages.home.emergencyTab")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("important")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                activeTab === "important"
                  ? "bg-[#0F172A] text-white dark:bg-[var(--accent-on-dark-bg)]"
                  : "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] dark:border-[var(--border-color)] dark:bg-[var(--bg-surface)]"
              }`}
            >
              {t("pages.home.importantAlertsTab")}
              {totalCount > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                    activeTab === "important"
                      ? "bg-white/20 text-white"
                      : "bg-[#FEE2E2] text-[#B91C1C]"
                  }`}
                >
                  {formatLocaleNumber(totalCount)}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}
      </div>

      <div>
        {isLoading ? (
          <p className={`${TYPE_META} py-10 text-center opacity-80`}>
            {t("pages.home.checkingAlerts")}
          </p>
        ) : (
          <>
            {showImportantTab ? (
              <p className={`${TYPE_META} mb-5 leading-relaxed`}>
                {activeTab === "important"
                  ? t("pages.home.importantAlertsTabDescription")
                  : t("pages.home.emergencyTabDescription")}
              </p>
            ) : null}

            {showImportantTab && activeTab === "important" ? (
          <ImportantAlertsList
            alerts={alerts}
            onViewEmployee={onViewEmployee}
            onProbationDecision={onProbationDecision}
          />
            ) : (
          <EmergencyAlertsGrid
            contracts={contracts}
            iqamas={iqamas}
            workPermits={workPermits}
            probations={probations}
            mapItems={mapItems}
            t={t}
            onViewEmployee={onViewEmployee}
            onProbationDecision={onProbationDecision}
          />
            )}
          </>
        )}
      </div>
    </section>
  );
}
